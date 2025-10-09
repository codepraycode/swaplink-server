import { Currency, FetchQueryParam, UserId } from '../types/query.types';
import prisma from '../utils/database';
import { ApiError } from '../utils/error';
import { BaseService } from './abstract';

type FetchTransactionParam = FetchQueryParam<{
    currency: string;
    type: string;
}>;

export class WalletService extends BaseService {
    private calculateAvailableBalance(balance: number, lockedBalance: number): number {
        return balance - lockedBalance;
    }

    async getWalletBalance(userId: UserId, currency: Currency) {
        const wallet = await prisma.wallet.findFirst({
            where: {
                userId,
                currency: currency as any,
            },
        });

        if (!wallet) {
            throw new ApiError('Wallet not found', 404, this.context);
        }

        return {
            currency: wallet.currency,
            balance: wallet.balance,
            lockedBalance: wallet.lockedBalance,
            availableBalance: wallet.balance - wallet.lockedBalance,
        };
    }

    async getWallets(userId: string) {
        const wallets = await prisma.wallet.findMany({
            where: { userId: userId },
        });

        const walletsWithAvailableBalance = wallets.map(wallet => ({
            id: wallet.id,
            currency: wallet.currency,
            balance: wallet.balance,
            lockedBalance: wallet.lockedBalance,
            availableBalance: this.calculateAvailableBalance(wallet.balance, wallet.lockedBalance),
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt,
        }));

        return walletsWithAvailableBalance;
    }

    async getTransactions(params: FetchTransactionParam) {
        const { query, userId } = params;
        const { page = 1, limit = 20, currency, type } = query;
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const where: any = { userId };
        if (currency) where.currency = currency;
        if (type) where.type = type;

        const transactions = await prisma.transaction.findMany({
            where,
            skip,
            take: parseInt(limit as string),
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                type: true,
                currency: true,
                amount: true,
                status: true,
                reference: true,
                createdAt: true,
            },
        });

        const total = await prisma.transaction.count({ where });

        return {
            transactions,
            total,
            page,
            limit,
        };
    }

    async hasSufficientBalance(
        userId: UserId,
        currency: Currency,
        amount: number
    ): Promise<boolean> {
        const wallet = await prisma.wallet.findFirst({
            where: {
                userId,
                currency: currency as any,
            },
        });

        if (!wallet) return false;

        const availableBalance = wallet.balance - wallet.lockedBalance;
        return availableBalance >= amount;
    }

    async createTransaction(
        userId: UserId,
        walletId: string,
        type: string,
        currency: Currency,
        amount: number,
        status: string = 'pending',
        metadata: any = {}
    ) {
        const reference = `TX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        return await prisma.transaction.create({
            data: {
                userId,
                walletId,
                type: type as any,
                currency: currency as any,
                amount,
                balanceBefore: 0, // This would be calculated based on current balance
                balanceAfter: 0, // This would be calculated based on current balance
                status: status as any,
                reference,
                metadata,
            },
        });
    }
}

export const walletService = new WalletService('WalletService');
