import { prisma, Prisma } from '../../database';
import { NotFoundError, BadRequestError, InternalError, ConflictError } from '../utils/api-error';
import { TransactionType } from '../../database/generated/prisma';
import { UserId } from '../../types/query.types';
import { redisConnection } from '../../config/redis.config';
import { socketService } from './socket.service';

// --- Interfaces ---

interface FetchTransactionOptions {
    userId: UserId;
    page?: number;
    limit?: number;
    type?: TransactionType;
}

/**
 * Standard options for moving money.
 * Allows passing external references (from Banks) or custom descriptions.
 */
interface TransactionOptions {
    reference?: string; // Optional: Provide bank ref. If null, we generate one.
    description?: string; // e.g. "Transfer from John"
    type?: TransactionType; // DEPOSIT, WITHDRAWAL, TRANSFER, etc.
    metadata?: any; // Store webhook payload or external details
}

export class WalletService {
    // --- Helpers ---

    private calculateAvailableBalance(balance: number, lockedBalance: number): number {
        return Number(balance) - Number(lockedBalance);
    }

    private getCacheKey(userId: string) {
        return `wallet:${userId}`;
    }

    private async invalidateCache(userId: string) {
        await redisConnection.del(this.getCacheKey(userId));
    }

    // --- Main Methods ---

    async setUpWallet(userId: string, tx: Prisma.TransactionClient) {
        try {
            return await tx.wallet.create({
                data: {
                    userId,
                    balance: 0.0,
                    lockedBalance: 0.0,
                    // currency: 'NGN' // Ensure schema has this if you added it
                },
            });
        } catch (error) {
            console.error(`Error creating wallet for user ${userId}:`, error);
            throw new InternalError('Failed to initialize user wallet system');
        }
    }

    async getWalletBalance(userId: UserId) {
        const cacheKey = this.getCacheKey(userId);

        const cached = await redisConnection.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const wallet = await prisma.wallet.findUnique({
            where: { userId },
            include: { virtualAccount: true },
        });

        if (!wallet) throw new NotFoundError('Wallet not found');

        const result = {
            id: wallet.id,
            balance: Number(wallet.balance),
            lockedBalance: Number(wallet.lockedBalance),
            availableBalance: this.calculateAvailableBalance(
                Number(wallet.balance),
                Number(wallet.lockedBalance)
            ),
            currency: 'NGN', // Hardcoded for now, or fetch from DB
            virtualAccount: wallet.virtualAccount
                ? {
                      accountNumber: wallet.virtualAccount.accountNumber,
                      bankName: wallet.virtualAccount.bankName,
                      accountName: wallet.virtualAccount.accountName,
                  }
                : null,
        };

        await redisConnection.set(cacheKey, JSON.stringify(result), 'EX', 30);
        return result;
    }

    async getWallet(userId: string) {
        const wallet = await prisma.wallet.findUnique({
            where: { userId },
            include: { virtualAccount: true },
        });

        if (!wallet) throw new NotFoundError('Wallet not found');

        return {
            ...wallet,
            balance: Number(wallet.balance),
            lockedBalance: Number(wallet.lockedBalance),
            availableBalance: this.calculateAvailableBalance(
                Number(wallet.balance),
                Number(wallet.lockedBalance)
            ),
        };
    }

    async getTransactions(params: FetchTransactionOptions) {
        const { userId, page = 1, limit = 20, type } = params;
        const skip = (page - 1) * limit;

        const where: Prisma.TransactionWhereInput = { userId };
        if (type) where.type = type;

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    type: true,
                    amount: true,
                    status: true,
                    reference: true,
                    balanceBefore: true,
                    balanceAfter: true,
                    createdAt: true,
                    metadata: true,
                    description: true,
                },
            }),
            prisma.transaction.count({ where }),
        ]);

        return {
            transactions,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async hasSufficientBalance(userId: UserId, amount: number): Promise<boolean> {
        try {
            const wallet = await this.getWalletBalance(userId);
            return wallet.availableBalance >= amount;
        } catch (error) {
            if (error instanceof NotFoundError) return false;
            throw error;
        }
    }

    // ==========================================
    // CRITICAL: Money Movement Methods
    // ==========================================

    /**
     * Credit a wallet (Deposit)
     * Handles Webhooks (External Ref) and Internal Credits.
     */
    async creditWallet(userId: string, amount: number, options: TransactionOptions = {}) {
        const {
            reference, // <--- The most important fix
            description = 'Credit',
            type = 'DEPOSIT',
            metadata = {},
        } = options;

        // 1. Determine Reference (Use External if provided, else generate Internal)
        const txReference =
            reference ||
            `TX-CR-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

        const result = await prisma.$transaction(async tx => {
            // 2. Idempotency Check (DB Level Safety)
            // If an external reference is passed, ensure it doesn't exist.
            if (reference) {
                const existing = await tx.transaction.findUnique({ where: { reference } });
                if (existing)
                    throw new ConflictError('Transaction with this reference already exists');
            }

            // 3. Get Wallet
            const wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) throw new NotFoundError('Wallet not found');

            const balanceBefore = Number(wallet.balance);
            const balanceAfter = balanceBefore + amount;

            // 4. Update Balance (Atomic Increment)
            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: amount } },
            });

            // 5. Create Transaction Record
            return await tx.transaction.create({
                data: {
                    userId,
                    walletId: wallet.id,
                    type, // Dynamic Type
                    amount,
                    balanceBefore,
                    balanceAfter,
                    status: 'COMPLETED',
                    reference: txReference, // <--- Saves the Bank's Reference!
                    description,
                    metadata,
                },
            });
        });

        // 6. Post-Transaction
        await this.invalidateCache(userId);

        // Notify Frontend (Send new balance)
        const newBalance = await this.getWalletBalance(userId);
        socketService.emitToUser(userId, 'WALLET_UPDATED', {
            ...newBalance,
            message: `Credit Alert: +₦${amount.toLocaleString()}`,
        });

        return result;
    }

    /**
     * Debit a wallet (Withdrawal/Transfer)
     */
    async debitWallet(userId: string, amount: number, options: TransactionOptions = {}) {
        const { reference, description = 'Debit', type = 'WITHDRAWAL', metadata = {} } = options;

        const txReference =
            reference ||
            `TX-DR-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

        const result = await prisma.$transaction(async tx => {
            const wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) throw new NotFoundError('Wallet not found');

            const balanceBefore = Number(wallet.balance);
            const locked = Number(wallet.lockedBalance);
            const available = balanceBefore - locked;

            // 1. Strict Balance Check
            if (available < amount) {
                throw new BadRequestError('Insufficient funds');
            }

            const balanceAfter = balanceBefore - amount;

            // 2. Deduct Balance (Atomic Decrement)
            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { decrement: amount } },
            });

            // 3. Create Transaction Record
            return await tx.transaction.create({
                data: {
                    userId,
                    walletId: wallet.id,
                    type,
                    amount,
                    balanceBefore,
                    balanceAfter,
                    status: 'COMPLETED',
                    reference: txReference,
                    description,
                    metadata,
                },
            });
        });

        // 4. Post-Transaction
        await this.invalidateCache(userId);

        const newBalance = await this.getWalletBalance(userId);
        socketService.emitToUser(userId, 'WALLET_UPDATED', {
            ...newBalance,
            message: `Debit Alert: -₦${amount.toLocaleString()}`,
        });

        return result;
    }
}

export const walletService = new WalletService();
export default walletService;
