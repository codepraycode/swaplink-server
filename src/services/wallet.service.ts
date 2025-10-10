import { Currency, FetchQueryParam, UserId } from '../types/query.types';
import prisma from '../utils/database';
import { ApiError, PrismaErrorHandler } from '../utils/error';
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
        const res = await PrismaErrorHandler.wrap(
            () =>
                prisma.wallet.findFirst({
                    where: {
                        userId,
                        currency: currency as any,
                    },
                }),
            {
                operationName: this.context,
                customErrorMessage: 'Wallet not found',
            }
        );

        if (!res.success) {
            const { error } = res;
            throw new ApiError(error, 404, this.context);
        }

        const wallet = res.data!;

        return {
            currency: wallet.currency,
            balance: wallet.balance,
            lockedBalance: wallet.lockedBalance,
            availableBalance: wallet.balance - wallet.lockedBalance,
        };
    }

    async getWallets(userId: string) {
        const res = await PrismaErrorHandler.wrap(
            () =>
                prisma.wallet.findMany({
                    where: { userId: userId },
                }),
            {
                operationName: this.context,
                customErrorMessage: 'Could not get wallets',
            }
        );

        if (!res.success) {
            throw new ApiError(res.error, 400, this.context);
        }

        const wallets = res.data!;

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

        const res = await PrismaErrorHandler.wrap(
            async () => {
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
                return { transactions, total, page, limit };
            },
            {
                operationName: this.context,
                customErrorMessage: 'Could not fetch transactions',
            }
        );

        if (!res.success) {
            throw new ApiError(res.error, 400, this.context);
        }

        return res.data!;
    }

    async hasSufficientBalance(
        userId: UserId,
        currency: Currency,
        amount: number
    ): Promise<boolean> {
        const res = await PrismaErrorHandler.wrap(
            () =>
                prisma.wallet.findFirst({
                    where: { userId, currency: currency as any },
                }),
            {
                operationName: this.context,
                customErrorMessage: 'Failed to verify wallet balance',
            }
        );

        if (!res.success) {
            throw new ApiError(res.error, 400, this.context);
        }

        const wallet = res.data;
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
        const reference = `TX-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        const res = await PrismaErrorHandler.wrap(
            () =>
                prisma.transaction.create({
                    data: {
                        userId,
                        walletId,
                        type: type as any,
                        currency: currency as any,
                        amount,
                        balanceBefore: 0, // TODO: compute actual balance before
                        balanceAfter: 0, // TODO: compute actual balance after
                        status: status as any,
                        reference,
                        metadata,
                    },
                }),
            {
                operationName: this.context,
                customErrorMessage: 'Could not create transaction',
            }
        );

        if (!res.success) {
            throw new ApiError(res.error, 400, this.context);
        }

        return res.data!;
    }

    async setUpWallet(userId: UserId) {
        const walletRes = await PrismaErrorHandler.wrap(
            () =>
                prisma.wallet.createMany({
                    data: [
                        { userId: userId, currency: 'USD' },
                        { userId: userId, currency: 'NGN' },
                    ],
                }),
            {
                operationName: this.context,
                customErrorMessage: 'Failed to create user wallets',
            }
        );

        if (!walletRes.success) {
            throw new ApiError(walletRes.error, 500, this.context);
        }
    }
}

export const walletService = new WalletService('WalletService');
