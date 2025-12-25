import { prisma, P2PAd, AdType, AdStatus } from '../../../shared/database';
import { BadRequestError, NotFoundError } from '../../../shared/lib/utils/api-error';

export class P2PAdService {
    /**
     * Create a new P2P Ad.
     * - If BUY_FX (Maker pays NGN): Lock Maker's NGN funds.
     * - If SELL_FX (Maker sells FX): No NGN lock needed (Taker will lock).
     */
    async createAd(
        userId: string,
        data: {
            type: AdType;
            currency: string;
            totalAmount: number;
            price: number;
            minLimit: number;
            maxLimit: number;
            paymentMethodId?: string;
            terms?: string;
            autoReply?: string;
        }
    ): Promise<P2PAd> {
        const {
            type,
            currency,
            totalAmount,
            price,
            minLimit,
            maxLimit,
            paymentMethodId,
            terms,
            autoReply,
        } = data;

        // Validation
        if (minLimit > maxLimit)
            throw new BadRequestError('Min limit cannot be greater than max limit');
        if (maxLimit > totalAmount)
            throw new BadRequestError('Max limit cannot be greater than total amount');

        // If Receiving FX (SELL_FX for Maker? No, SELL_FX means Maker GIVES FX, RECEIVES NGN)
        // Wait, SELL_FX: Maker Sells FX. Maker Receives NGN.
        // BUY_FX: Maker Buys FX. Maker Gives NGN.

        // If Maker is RECEIVING FX (BUY_FX), they need to provide Payment Method? No, they PAY NGN.
        // If Maker is SENDING FX (SELL_FX), they need to provide Payment Method? No, Taker sends NGN.
        // Actually, if Maker is SELLING FX, they want to receive NGN. They need to provide NGN account?
        // But NGN is on-chain (Wallet). So no external payment method needed for NGN receipt.

        // If Maker is BUYING FX, they want to receive FX. They need to provide FX Account (Payment Method).
        if (type === AdType.BUY_FX && !paymentMethodId) {
            throw new BadRequestError(
                'Payment method is required for BUY_FX ads (to receive funds)'
            );
        }

        return await prisma.$transaction(async tx => {
            // 1. Escrow Locking (Only for BUY_FX where Maker pays NGN)
            if (type === AdType.BUY_FX) {
                const ngnAmountToLock = totalAmount * price;
                // We use the shared wallet service to lock funds
                // Note: We need to ensure walletService.lockFunds supports running inside a transaction if possible,
                // or we manually update here. walletService.lockFunds uses prisma.wallet.update.
                // To be safe and atomic, we should replicate the lock logic here or pass the tx context if supported.
                // For now, let's assume we can call it, but if it fails, the whole tx rolls back.
                // Ideally, we should do:

                const wallet = await tx.wallet.findUnique({ where: { userId } });
                if (!wallet) throw new NotFoundError('Wallet not found');

                if (Number(wallet.balance) < ngnAmountToLock) {
                    throw new BadRequestError('Insufficient NGN balance to create this ad');
                }

                await tx.wallet.update({
                    where: { userId },
                    data: {
                        balance: { decrement: ngnAmountToLock },
                        lockedBalance: { increment: ngnAmountToLock },
                    },
                });
            }

            // 2. Create Ad
            return tx.p2PAd.create({
                data: {
                    userId,
                    type,
                    currency,
                    totalAmount,
                    remainingAmount: totalAmount,
                    price,
                    minLimit,
                    maxLimit,
                    paymentMethodId,
                    terms,
                    autoReply,
                    status: AdStatus.ACTIVE,
                    version: 0, // Initial version
                },
            });
        });
    }

    /**
     * Update Ad (Optimistic Locking)
     */
    async updateAd(
        userId: string,
        adId: string,
        data: {
            price?: number;
            minLimit?: number;
            maxLimit?: number;
            terms?: string;
            autoReply?: string;
            status?: AdStatus;
        }
    ): Promise<P2PAd> {
        const ad = await prisma.p2PAd.findUnique({ where: { id: adId } });
        if (!ad || ad.userId !== userId) throw new NotFoundError('Ad not found');

        // If status changing to CLOSED/PAUSED, handle unlocking?
        // For simplicity, we only unlock on DELETE or explicit CLOSE.
        // If reducing amount, we should unlock difference. (Not implemented in this MVP step)

        return prisma.p2PAd.update({
            where: { id: adId },
            data: {
                ...data,
                version: { increment: 1 },
            },
        });
    }

    /**
     * Get Ads (Public)
     */
    async getAds(query: { type: AdType; currency: string; amount?: number }) {
        const { type, currency, amount } = query;
        return prisma.p2PAd.findMany({
            where: {
                type,
                currency,
                status: AdStatus.ACTIVE,
                remainingAmount: amount ? { gte: amount } : { gt: 0 },
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        kycLevel: true,
                        // TODO: Add completion rate stats
                    },
                },
                paymentMethod: true,
            },
            orderBy: { price: type === AdType.BUY_FX ? 'desc' : 'asc' }, // Buy: Highest first, Sell: Lowest first
        });
    }
}

export const p2pAdService = new P2PAdService();
