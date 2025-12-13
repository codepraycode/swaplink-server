import { prisma, Prisma } from '../../database'; // Singleton
import { NotFoundError, BadRequestError, InternalError } from '../utils/api-error';
import { TransactionType } from '../../database/generated/prisma';
import { UserId } from '../../types/query.types';
import { redisConnection } from '../../config/redis.config';
import { socketService } from './socket.service';

// DTOs
interface FetchTransactionOptions {
    userId: UserId;
    page?: number;
    limit?: number;
    type?: TransactionType;
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

    /**
     * Create Wallet for a new user (Single NGN wallet)
     * Accepts an optional transaction client to run inside AuthService.register
     */
    async setUpWallet(userId: string, tx: Prisma.TransactionClient) {
        try {
            // 1. Create the Local Wallet
            const wallet = await tx.wallet.create({
                data: {
                    userId,
                    balance: 0.0, // Prisma Decimal
                    lockedBalance: 0.0, // Prisma Decimal
                    // Note: We do NOT create the Virtual Account Number here.
                    // That happens in the background to keep registration fast.
                },
            });

            return wallet;
        } catch (error) {
            // Log the specific error for debugging
            console.error(`Error creating wallet for user ${userId}:`, error);
            throw new InternalError('Failed to initialize user wallet system');
        }
    }

    async getWalletBalance(userId: UserId) {
        const cacheKey = this.getCacheKey(userId);

        // 1. Try Cache
        const cached = await redisConnection.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // 2. Fetch DB
        const wallet = await prisma.wallet.findUnique({
            where: { userId },
            include: { virtualAccount: true }, // Include Virtual Account
        });

        if (!wallet) {
            throw new NotFoundError('Wallet not found');
        }

        const result = {
            id: wallet.id,
            balance: Number(wallet.balance),
            lockedBalance: Number(wallet.lockedBalance),
            availableBalance: this.calculateAvailableBalance(wallet.balance, wallet.lockedBalance),
            virtualAccount: wallet.virtualAccount
                ? {
                      accountNumber: wallet.virtualAccount.accountNumber,
                      bankName: wallet.virtualAccount.bankName,
                      accountName: wallet.virtualAccount.accountName,
                  }
                : null,
        };

        // 3. Set Cache (TTL 30s)
        await redisConnection.set(cacheKey, JSON.stringify(result), 'EX', 30);

        return result;
    }

    async getWallet(userId: string) {
        return this.getWalletBalance(userId);
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
        const wallet = await this.getWalletBalance(userId);
        return wallet.availableBalance >= amount;
    }

    // ==========================================
    // CRITICAL: Money Movement Methods
    // ==========================================

    /**
     * Credit a wallet (Deposit)
     * Atomically updates balance and creates a transaction record
     */
    async creditWallet(userId: string, amount: number, metadata: any = {}) {
        const result = await prisma.$transaction(async tx => {
            // 1. Get Wallet (using unique constraint)
            const wallet = await tx.wallet.findUnique({
                where: { userId },
            });

            if (!wallet) throw new NotFoundError('Wallet not found');

            const balanceBefore = Number(wallet.balance);
            const balanceAfter = balanceBefore + amount;

            // 2. Update Balance
            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: amount } },
            });

            // 3. Create Transaction Record
            const reference = `TX-CR-${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 7)
                .toUpperCase()}`;

            const transaction = await tx.transaction.create({
                data: {
                    userId,
                    walletId: wallet.id,
                    type: 'DEPOSIT',
                    amount,
                    balanceBefore,
                    balanceAfter,
                    status: 'COMPLETED',
                    reference,
                    metadata,
                },
            });

            return transaction;
        });

        // 4. Post-Transaction: Invalidate Cache & Notify User
        await this.invalidateCache(userId);

        // Fetch fresh balance to send to user
        const newBalance = await this.getWalletBalance(userId);
        socketService.emitToUser(userId, 'WALLET_UPDATED', newBalance);

        return result;
    }

    /**
     * Debit a wallet (Withdrawal/Payment)
     * Atomically checks balance, deducts amount, and creates record
     */
    async debitWallet(userId: string, amount: number, metadata: any = {}) {
        const result = await prisma.$transaction(async tx => {
            // 1. Get Wallet
            const wallet = await tx.wallet.findUnique({
                where: { userId },
            });

            if (!wallet) throw new NotFoundError('Wallet not found');

            const balanceBefore = Number(wallet.balance);
            const locked = Number(wallet.lockedBalance);
            const available = balanceBefore - locked;

            // 2. Check Sufficient Funds
            if (available < amount) {
                throw new BadRequestError('Insufficient funds');
            }

            const balanceAfter = balanceBefore - amount;

            // 3. Deduct Balance
            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { decrement: amount } },
            });

            // 4. Create Transaction Record
            const reference = `TX-DR-${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 7)
                .toUpperCase()}`;

            const transaction = await tx.transaction.create({
                data: {
                    userId,
                    walletId: wallet.id,
                    type: 'WITHDRAWAL',
                    amount,
                    balanceBefore,
                    balanceAfter,
                    status: 'COMPLETED',
                    reference,
                    metadata,
                },
            });

            return transaction;
        });

        // 5. Post-Transaction: Invalidate Cache & Notify User
        await this.invalidateCache(userId);

        // Fetch fresh balance to send to user
        const newBalance = await this.getWalletBalance(userId);
        socketService.emitToUser(userId, 'WALLET_UPDATED', newBalance);

        return result;
    }
}

export const walletService = new WalletService(); // Export singleton
export default walletService;
