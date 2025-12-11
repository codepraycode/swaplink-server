import { prisma, Prisma } from '../../database'; // Singleton
import { NotFoundError, BadRequestError, InternalError } from '../utils/api-error';
import { Currency, TransactionType, TransactionStatus } from '../../database/generated/prisma'; // Adjust based on your schema
import { UserId } from '../../types/query.types';

// DTOs
interface FetchTransactionOptions {
    userId: UserId;
    page?: number;
    limit?: number;
    currency?: Currency;
    type?: TransactionType;
}

export class WalletService {
    // --- Helpers ---

    private calculateAvailableBalance(balance: number, lockedBalance: number): number {
        return Number(balance) - Number(lockedBalance);
    }

    // --- Main Methods ---

    /**
     * Create Wallets for a new user
     * Accepts an optional transaction client to run inside AuthService.register
     */
    async setUpWallet(userId: string, tx?: Prisma.TransactionClient) {
        const db = tx || prisma; // Use transaction if provided, else global instance

        try {
            await db.wallet.createMany({
                data: [
                    { userId, currency: 'USD', balance: 0, lockedBalance: 0 },
                    { userId, currency: 'NGN', balance: 0, lockedBalance: 0 },
                ],
            });
        } catch (error) {
            throw new InternalError('Failed to create user wallets', error as Error);
        }
    }

    async getWalletBalance(userId: UserId, currency: Currency) {
        const wallet = await prisma.wallet.findFirst({
            where: { userId, currency },
        });

        if (!wallet) {
            throw new NotFoundError(`${currency} Wallet not found`);
        }

        return {
            id: wallet.id,
            currency: wallet.currency,
            balance: Number(wallet.balance),
            lockedBalance: Number(wallet.lockedBalance),
            availableBalance: this.calculateAvailableBalance(wallet.balance, wallet.lockedBalance),
        };
    }

    async getWallets(userId: string) {
        const wallets = await prisma.wallet.findMany({
            where: { userId },
        });

        return wallets.map(wallet => ({
            id: wallet.id,
            currency: wallet.currency,
            balance: Number(wallet.balance),
            lockedBalance: Number(wallet.lockedBalance),
            availableBalance: this.calculateAvailableBalance(wallet.balance, wallet.lockedBalance),
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt,
        }));
    }

    async getTransactions(params: FetchTransactionOptions) {
        const { userId, page = 1, limit = 20, currency, type } = params;
        const skip = (page - 1) * limit;

        const where: Prisma.TransactionWhereInput = { userId };
        if (currency) where.currency = currency;
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
                    currency: true,
                    amount: true,
                    status: true,
                    reference: true,
                    balanceBefore: true,
                    balanceAfter: true,
                    createdAt: true,
                    metadata: true,
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

    async hasSufficientBalance(
        userId: UserId,
        currency: Currency,
        amount: number
    ): Promise<boolean> {
        const wallet = await prisma.wallet.findFirst({
            where: { userId, currency },
        });

        if (!wallet) return false;

        const availableBalance = Number(wallet.balance) - Number(wallet.lockedBalance);
        return availableBalance >= amount;
    }

    // ==========================================
    // CRITICAL: Money Movement Methods
    // ==========================================

    /**
     * Credit a wallet (Deposit)
     * Atomically updates balance and creates a transaction record
     */
    async creditWallet(userId: string, currency: Currency, amount: number, metadata: any = {}) {
        return prisma.$transaction(async tx => {
            // 1. Get Wallet (Locking it would be ideal in high concurrency, but findFirst is okay for MVP)
            const wallet = await tx.wallet.findFirst({
                where: { userId, currency },
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
                    type: 'DEPOSIT', // Ensure this matches your Enum
                    currency,
                    amount,
                    balanceBefore,
                    balanceAfter,
                    status: 'COMPLETED', // Ensure this matches your Enum
                    reference,
                    metadata,
                },
            });

            return transaction;
        });
    }

    /**
     * Debit a wallet (Withdrawal/Payment)
     * Atomically checks balance, deducts amount, and creates record
     */
    async debitWallet(userId: string, currency: Currency, amount: number, metadata: any = {}) {
        return prisma.$transaction(async tx => {
            // 1. Get Wallet
            const wallet = await tx.wallet.findFirst({
                where: { userId, currency },
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
                    type: 'WITHDRAWAL', // Ensure matches Enum
                    currency,
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
    }
}

export const walletService = new WalletService(); // Export singleton
export default walletService;
