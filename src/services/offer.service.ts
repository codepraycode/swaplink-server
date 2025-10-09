import { Currency, Offer } from '@prisma/client';
import { FetchQueryParam, QueryNumber, Type, UserId } from '../types/query.types';
import prisma from '../utils/database';
import { ApiError } from '../utils/error';
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

        const offers = await prisma.offer.findMany({
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
        });

        const total = await prisma.offer.count({ where });

        return {
            offers,
            total,
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

        // Parse fields
        const amount = parseFloat(rawAmount as string);
        const rate = parseFloat(rawRate as string);
        const minAmount = parseFloat(rawMinAmount as string);
        const maxAmount = parseFloat(rawMaxAmount as string);
        const paymentWindow = parseInt(rawPaymentWindow as string);

        // Validate user has sufficient balance for sell offers
        if (type === 'SELL') {
            const wallet = await prisma.wallet.findFirst({
                where: {
                    userId,
                    currency: 'USD',
                },
            });

            if (!wallet || wallet.availableBalance < amount) {
                throw new ApiError('Insufficient USD balance for sell offer', 400, this.context);
            }
        }

        const offer = await prisma.offer.create({
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
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
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
        });

        return {
            offer,
        };
    }
}

export const offerService = new OfferService('OfferService');
