import { Currency, Offer } from '@prisma/client';
import { FetchQueryParam, QueryNumber, Type, UserId } from '../types/query.types';
import prisma from '../utils/database';
import { ApiError, PrismaErrorHandler } from '../utils/error';
import { BaseService } from './abstract';

type FetchOfferParam = FetchQueryParam<{
    currency: Currency;
    type: Type;

    minAmount: QueryNumber;
    maxAmount: QueryNumber;
}>;

type OfferDto = {
    type: Type;
    currency: Currency;
    amount: QueryNumber;
    rate: QueryNumber;
    minAmount?: QueryNumber;
    maxAmount?: QueryNumber;
    paymentWindow: QueryNumber;
    terms: string;
};

class OfferService extends BaseService {
    async getOffers(params: FetchOfferParam) {
        const { query } = params;
        const { type, currency, minAmount, maxAmount, page = 1, limit = 20 } = query;

        const where: any = { status: 'ACTIVE' };

        if (type) where.type = type;
        if (currency) where.currency = currency;
        if (minAmount) where.amount = { gte: parseFloat(minAmount as string) };
        if (maxAmount) where.amount = { ...where.amount, lte: parseFloat(maxAmount as string) };

        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const offersRes = await PrismaErrorHandler.wrap(
            () =>
                prisma.offer.findMany({
                    where,
                    skip,
                    take: parseInt(limit as string),
                    orderBy: { rate: type === 'BUY' ? 'desc' : 'asc' },
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                kycLevel: true,
                            },
                        },
                    },
                }),
            {
                operationName: this.context,
                customErrorMessage: 'Failed to fetch offers',
            }
        );

        if (!offersRes.success) {
            throw new ApiError(offersRes.error, 500, this.context);
        }

        const totalRes = await PrismaErrorHandler.wrap(() => prisma.offer.count({ where }), {
            operationName: this.context,
            customErrorMessage: 'Failed to count offers',
        });

        if (!totalRes.success) {
            throw new ApiError(totalRes.error, 500, this.context);
        }

        return {
            offers: offersRes.data!,
            total: totalRes.data!,
            page,
            limit,
        };
    }

    async createOffer(dto: OfferDto, userId: UserId) {
        const {
            type,
            currency,
            amount: rawAmount,
            rate: rawRate,
            minAmount: rawMinAmount,
            maxAmount: rawMaxAmount,
            paymentWindow: rawPaymentWindow = 30,
            terms,
        } = dto;

        const amount = parseFloat(rawAmount as string);
        const rate = parseFloat(rawRate as string);
        const minAmount = parseFloat(rawMinAmount as string);
        const maxAmount = parseFloat(rawMaxAmount as string);
        const paymentWindow = parseInt(rawPaymentWindow as string);

        // 🧮 Validate balance for SELL offers
        if (type === 'SELL') {
            const walletRes = await PrismaErrorHandler.wrap(
                () =>
                    prisma.wallet.findFirst({
                        where: {
                            userId,
                            currency: 'USD',
                        },
                    }),
                {
                    operationName: this.context,
                    customErrorMessage: 'Failed to fetch wallet balance',
                }
            );

            if (!walletRes.success) {
                throw new ApiError(walletRes.error, 500, this.context);
            }

            const wallet = walletRes.data;

            if (!wallet || wallet.balance - wallet.lockedBalance < amount) {
                throw new ApiError('Insufficient USD balance for sell offer', 400, this.context);
            }
        }

        // 🏗️ Create offer
        const offerRes = await PrismaErrorHandler.wrap(
            () =>
                prisma.offer.create({
                    data: {
                        userId,
                        type,
                        currency,
                        amount,
                        rate,
                        minAmount: minAmount ?? null,
                        maxAmount: maxAmount ?? null,
                        paymentWindow,
                        terms,
                        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                kycLevel: true,
                            },
                        },
                    },
                }),
            {
                operationName: this.context,
                customErrorMessage: 'Failed to create offer',
            }
        );

        if (!offerRes.success) {
            throw new ApiError(offerRes.error, 500, this.context);
        }

        return {
            offer: offerRes.data!,
        };
    }
}

export const offerService = new OfferService('OfferService');
