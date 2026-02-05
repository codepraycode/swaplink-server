import { prisma, AdType, AdStatus, P2PAd, OrderStatus } from '../../../../shared/database';
import { walletService } from '../../../../shared/lib/services/wallet.service';
import { BadRequestError, NotFoundError } from '../../../../shared/lib/utils/api-error';
import logger from '../../../../shared/lib/utils/logger';

export class P2PAdService {
    static async createAd(userId: string, data: any): Promise<P2PAd> {
        const {
            type: givenType,
            currency,
            totalAmount,
            price,
            minLimit,
            maxLimit,
            paymentMethodId,
            terms,
            autoReply,
        } = data;

        // Basic Validation
        if (minLimit > maxLimit)
            throw new BadRequestError('Min limit cannot be greater than Max limit');
        if (maxLimit > totalAmount)
            throw new BadRequestError('Max limit cannot be greater than Total amount');

        // Logic based on Type
        // Handle both 'BUY'/'SELL' (legacy/frontend) and 'BUY_FX'/'SELL_FX' (enum)
        let type: AdType;
        if (givenType === 'BUY' || givenType === AdType.BUY_FX) {
            type = AdType.BUY_FX;
        } else if (givenType === 'SELL' || givenType === AdType.SELL_FX) {
            type = AdType.SELL_FX;
        } else {
            throw new BadRequestError('Invalid ad type');
        }
        if (type === AdType.BUY_FX) {
            if (!paymentMethodId)
                throw new BadRequestError('Payment method is required for Buy FX ads');
            // Maker is GIVING NGN. Must lock funds.
            const totalNgnRequired = totalAmount * price;

            // Lock Funds (Throws error if insufficient)
            await walletService.lockFunds(userId, totalNgnRequired);
        } else if (type === AdType.SELL_FX) {
            logger.debug('Nothing to do!');
        }

        return await prisma.p2PAd.create({
            data: {
                userId,
                type,
                currency,
                totalAmount,
                remainingAmount: totalAmount,
                price,
                minLimit,
                maxLimit: maxLimit || totalAmount,
                paymentMethodId,
                terms,
                autoReply,
                status: AdStatus.ACTIVE,
            },
        });
    }

    static async getAds(query: any, requesterId?: string): Promise<any[]> {
        const { currency, type, status, minAmount } = query;

        const where: any = { status: status || AdStatus.ACTIVE };
        if (currency) where.currency = currency;
        if (type) where.type = type;
        if (minAmount) where.remainingAmount = { gte: Number(minAmount) };

        const ads = await prisma.p2PAd.findMany({
            where,
            orderBy: { price: 'asc' }, // Lowest rate first (best for users)
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        kycLevel: true,
                        avatarUrl: true,
                        email: true,
                        // phoneNumber: true,
                    },
                },
                paymentMethod: true,
            },
        });

        // Filter out ads where remaining amount is less than the minimum limit (Dust)
        const validAds = ads.filter(ad => ad.remainingAmount >= ad.minLimit);

        // Enrichment: If requesterId is provided, attach active orders to their ads
        if (requesterId) {
            const myAds = validAds.filter(ad => ad.userId === requesterId);
            const myAdIds = myAds.map(ad => ad.id);

            if (myAdIds.length > 0) {
                const orders = await prisma.p2POrder.findMany({
                    where: {
                        adId: { in: myAdIds },
                        status: {
                            in: [
                                OrderStatus.PENDING,
                                OrderStatus.PAID,
                                OrderStatus.PROCESSING,
                                OrderStatus.COMPLETED,
                                OrderStatus.CANCELLED,
                            ],
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    include: {
                        taker: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                });

                // Map orders to ads
                return validAds.map(ad => {
                    if (ad.userId === requesterId) {
                        return {
                            ...ad,
                            orders: orders.filter(o => o.adId === ad.id),
                        };
                    }
                    return ad;
                });
            }
        }

        return validAds;
    }

    static async closeAd(userId: string, adId: string): Promise<P2PAd> {
        const ad = await prisma.p2PAd.findFirst({
            where: { id: adId, userId },
        });

        if (!ad) throw new NotFoundError('Ad not found');
        if (ad.status === AdStatus.CLOSED || ad.status === AdStatus.COMPLETED) {
            throw new BadRequestError('Ad is already closed');
        }

        // Check for active orders
        const activeOrders = await prisma.p2POrder.count({
            where: {
                adId,
                status: {
                    in: [OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.PROCESSING],
                },
            },
        });

        if (activeOrders > 0) {
            throw new BadRequestError(
                'Cannot close ad with active orders. Please complete or cancel them first.'
            );
        }

        // Refund Logic
        if (ad.type === AdType.BUY_FX && ad.remainingAmount > 0) {
            const refundAmount = ad.remainingAmount * ad.price;
            await walletService.unlockFunds(userId, refundAmount);
        }

        return await prisma.p2PAd.update({
            where: { id: adId },
            data: {
                status: AdStatus.CLOSED,
                remainingAmount: 0, // Clear it
            },
        });
    }

    static async reactivateAd(userId: string, adId: string): Promise<P2PAd> {
        const ad = await prisma.p2PAd.findFirst({
            where: { id: adId, userId },
        });

        if (!ad) throw new NotFoundError('Ad not found');

        // Only allow reactivation of paused ads
        if (ad.status !== AdStatus.PAUSED) {
            throw new BadRequestError('Only paused ads can be reactivated');
        }

        // Check if ad still has remaining amount
        if (ad.remainingAmount <= 0) {
            throw new BadRequestError('Cannot reactivate ad with no remaining amount');
        }

        // Check if remaining amount is below minimum limit
        if (ad.remainingAmount < ad.minLimit) {
            throw new BadRequestError(
                `Cannot reactivate ad. Remaining amount (${ad.remainingAmount}) is below minimum limit (${ad.minLimit})`
            );
        }

        // Reactivate the ad
        return await prisma.p2PAd.update({
            where: { id: adId },
            data: {
                status: AdStatus.ACTIVE,
                updatedAt: new Date(), // Update timestamp
            },
        });
    }
}
