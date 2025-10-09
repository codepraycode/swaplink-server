import { FetchQueryParam } from '../types/query.types';
import prisma from '../utils/database';
import { BaseService } from './abstract';

type FetchTransactionParam = FetchQueryParam<{
    currency: string;
    type: string;
}>;

class WalletService extends BaseService {
    private calculateAvailableBalance(balance: number, lockedBalance: number): number {
        return balance - lockedBalance;
    }

    // private async getUserWalletsWithAvailableBalance(userId: string) {
    //     const wallets = await prisma.wallet.findMany({
    //         where: { userId },
    //     });

    //     return wallets.map(wallet => ({
    //         ...wallet,
    //         availableBalance: this.calculateAvailableBalance(wallet.balance, wallet.lockedBalance),
    //     }));
    // }

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
}

export const walletService = new WalletService('WalletService');
