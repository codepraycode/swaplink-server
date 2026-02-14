import { prisma, AdType, AdStatus, P2PAd, OrderStatus } from '../../../../shared/database';
import { walletService } from '../../../../shared/lib/services/wallet.service';
import { BadRequestError, NotFoundError } from '../../../../shared/lib/utils/api-error';
import logger from '../../../../shared/lib/utils/logger';

export class P2PAdService {
    static async createAd(userId: string, data: any): Promise<P2PAd> {
        const { type: givenType, currency, paymentMethodId, terms, autoReply } = data;

        const totalAmount = Number(data.totalAmount);
        const price = Number(data.price);
        const minLimit = Number(data.minLimit);
        const maxLimit = data.maxLimit ? Number(data.maxLimit) : totalAmount;

        if (isNaN(totalAmount) || totalAmount <= 0)
            throw new BadRequestError('Invalid total amount provided');
        if (isNaN(price) || price <= 0) throw new BadRequestError('Invalid price provided');
        if (isNaN(minLimit) || minLimit <= 0)
            throw new BadRequestError('Invalid minimum limit provided');
        if (isNaN(maxLimit) || maxLimit <= 0)
            throw new BadRequestError('Invalid maximum limit provided');

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
                engagedAmount: 0,
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
                    },
                },
                paymentMethod: true,
            },
        });

        // Filter out ads where available amount is less than the minimum limit (Dust)
        const validAds = ads.filter(ad => {
            const availableAmount = ad.remainingAmount - ad.engagedAmount;
            return availableAmount >= ad.minLimit;
        });

        // Enrich ads with availableAmount
        const enrichedAds = validAds.map(ad => ({
            ...ad,
            availableAmount: ad.remainingAmount - ad.engagedAmount,
        }));

        // Enrichment: If requesterId is provided, attach active orders to their ads
        if (requesterId) {
            const myAds = enrichedAds.filter(ad => ad.userId === requesterId);
            const myAdIds = myAds.map(ad => ad.id);

            if (myAdIds.length > 0) {
                const orders = await prisma.p2POrder.findMany({
                    where: {
                        adId: { in: myAdIds },
                        status: {
                            in: [
                                OrderStatus.IN_PROGRESS,
                                OrderStatus.PROCESSING,
                                OrderStatus.COMPLETED,
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
                return enrichedAds.map(ad => {
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

        return enrichedAds;
    }

    /**
     * Engage an Ad — reserve an amount while user sets up their order.
     * This prevents other users from seeing/claiming the same amount.
     */
    static async engageAd(userId: string, adId: string, amount: number): Promise<any> {
        const ad = await prisma.p2PAd.findFirst({
            where: { id: adId },
        });

        if (!ad) throw new NotFoundError('Ad not found');
        if (ad.userId === userId) throw new BadRequestError('Cannot engage your own ad');
        if (ad.status !== AdStatus.ACTIVE) throw new BadRequestError('Ad is not active');
        if (amount < ad.minLimit || amount > ad.maxLimit)
            throw new BadRequestError(`Amount must be between ${ad.minLimit} and ${ad.maxLimit}`);

        const availableAmount = ad.remainingAmount - ad.engagedAmount;
        if (availableAmount < amount) {
            throw new BadRequestError(
                `Only ${availableAmount} ${ad.currency} available. Cannot engage ${amount}.`
            );
        }

        // Check if remaining after engagement would leave dust
        const newAvailable = availableAmount - amount;
        if (newAvailable > 0 && newAvailable < ad.minLimit) {
            throw new BadRequestError(
                `Engaging ${amount} would leave ${newAvailable} ${ad.currency} available, which is below the minimum order of ${ad.minLimit}. ` +
                    `Please engage at least ${
                        availableAmount - ad.minLimit + 1
                    } or the full available amount of ${availableAmount}.`
            );
        }

        // Atomically increment engagedAmount
        const updatedAd = await prisma.p2PAd.updateMany({
            where: {
                id: adId,
                status: AdStatus.ACTIVE,
            },
            data: {
                engagedAmount: { increment: amount },
            },
        });

        if (updatedAd.count === 0) {
            throw new BadRequestError('Could not engage ad. It may no longer be available.');
        }

        // Fetch updated ad
        const refreshedAd = await prisma.p2PAd.findUnique({ where: { id: adId } });
        return {
            ...refreshedAd,
            availableAmount: refreshedAd!.remainingAmount - refreshedAd!.engagedAmount,
        };
    }

    /**
     * Disengage from an Ad — release previously reserved amount.
     * Called when user backs out without creating an order.
     */
    static async disengageAd(userId: string, adId: string, amount: number): Promise<any> {
        const ad = await prisma.p2PAd.findFirst({
            where: { id: adId },
        });

        if (!ad) throw new NotFoundError('Ad not found');
        if (ad.userId === userId) throw new BadRequestError('Cannot disengage your own ad');

        if (Number(amount) > Number(ad.engagedAmount)) {
            throw new BadRequestError(
                `Cannot disengage ${amount}. Only ${ad.engagedAmount} is currently engaged.`
            );
        }

        // Atomically decrement engagedAmount
        await prisma.p2PAd.update({
            where: { id: adId },
            data: {
                engagedAmount: { decrement: Number(amount) },
            },
        });

        // Fetch updated ad
        const refreshedAd = await prisma.p2PAd.findUnique({ where: { id: adId } });
        return {
            ...refreshedAd,
            availableAmount:
                Number(refreshedAd!.remainingAmount) - Number(refreshedAd!.engagedAmount),
        };
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
                    in: [OrderStatus.IN_PROGRESS, OrderStatus.PROCESSING],
                },
            },
        });

        if (activeOrders > 0) {
            throw new BadRequestError(
                'Cannot close ad with active orders. Please complete them first.'
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
                remainingAmount: 0,
                engagedAmount: 0,
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
                engagedAmount: 0, // Reset engagement on reactivation
                updatedAt: new Date(),
            },
        });
    }

    static async getUserAds(userId: string): Promise<any[]> {
        const ads = await prisma.p2PAd.findMany({
            where: { userId },
            include: {
                paymentMethod: true,
                orders: {
                    include: {
                        taker: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                avatarUrl: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return ads.map(ad => ({
            ...ad,
            availableAmount: ad.remainingAmount - ad.engagedAmount,
        }));
    }
}
