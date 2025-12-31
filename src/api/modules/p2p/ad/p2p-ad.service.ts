import { prisma, AdType, AdStatus, P2PAd } from '../../../../shared/database';
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
        const type: AdType = givenType === 'BUY' ? AdType.BUY_FX : AdType.SELL_FX;
        if (type === AdType.BUY_FX) {
            if (!paymentMethodId)
                throw new BadRequestError('Payment method is required for Buy FX ads');
            // Maker is GIVING NGN. Must lock funds.
            const totalNgnRequired = totalAmount * price;

            // Lock Funds (Throws error if insufficient)
            await walletService.lockFunds(userId, totalNgnRequired);
        } else if (type === AdType.SELL_FX) {
            // Maker is RECEIVING NGN (Giving FX).
            // Must have a payment method to receive FX? No, Maker GIVES FX, so they want NGN.
            // Wait: SELL_FX means "I am selling FX". So I give FX, I get NGN.
            // So I need a Payment Method to RECEIVE NGN? No, NGN goes to Wallet.
            // I need a Payment Method to RECEIVE FX? No, I am GIVING FX.
            // The Taker gives NGN.
            // Wait, let's check requirements.
            // Case B: "Sell FX" Ad (I have USD, I want NGN).
            // FR-08: User selects one of their saved Payment Methods (where they want to receive the USD).
            // Wait, if I sell USD, I am GIVING USD. Why would I receive USD?
            // Ah, maybe "Sell FX" means "I want to Sell my FX to you".
            // So I send FX to you. You send NGN to me.
            // So I need to provide my Bank Details so YOU can send me FX?
            // NO. If I sell FX, I send FX. You pay NGN.
            // If I Buy FX, I pay NGN. You send FX.

            // Let's re-read FR-08 carefully.
            // "User selects one of their saved Payment Methods (where they want to receive the USD)."
            // This implies "Sell FX" means "I am selling NGN to get FX"?
            // No, "Sell FX" usually means "I have FX, I want NGN".
            // If I have FX, I send it.
            // If I want to RECEIVE USD, then I am BUYING USD.

            // Let's check Case A: "Buy FX" Ad (I have NGN, I want USD).
            // FR-06: Funds Locking (NGN).
            // So Maker has NGN. Maker wants USD.
            // Maker creates Ad "Buy USD".
            // Taker (has USD) clicks Ad. Taker sends USD to Maker.
            // Maker needs to provide Bank Details to receive USD.
            // So "Buy FX" Ad needs Payment Method?

            // Let's check Schema. `paymentMethodId` is optional.
            // Plan says: "Required if Maker is RECEIVING FX".
            // If Maker is BUYING FX, Maker is RECEIVING FX.
            // So `BUY_FX` needs `paymentMethodId`.

            // Let's check Case B: "Sell FX" Ad (I have USD, I want NGN).
            // FR-09: No NGN is locked.
            // Maker gives USD. Taker gives NGN.
            // Taker sends NGN (via Wallet).
            // Maker sends USD (External).
            // So Maker needs to send USD to Taker.
            // Taker needs to provide Bank Details?

            // Let's re-read FRs.
            // FR-08: "User selects one of their saved Payment Methods (where they want to receive the USD)."
            // This is listed under "Case B: Sell FX Ad".
            // This contradicts standard terminology or my understanding.
            // "Sell FX" -> I give FX, I get NGN.
            // "Buy FX" -> I give NGN, I get FX.

            // If FR-08 says "receive USD", then "Sell FX" means "I sell NGN for FX"?
            // But FR-07 says "User selects Currency (USD)... Rate (1450/$)...".
            // If I sell NGN, I am buying USD.

            // Let's assume the standard definition:
            // BUY_FX: Maker wants to BUY FX (Gives NGN).
            // SELL_FX: Maker wants to SELL FX (Gives FX).

            // If BUY_FX (Maker gives NGN, Gets FX):
            // Maker needs to provide Payment Method (to receive FX).
            // Maker needs to lock NGN.

            // If SELL_FX (Maker gives FX, Gets NGN):
            // Maker sends FX.
            // Taker (Buyer of FX) gives NGN.
            // Taker needs to provide Payment Method (to receive FX)?
            // Yes, Taker will provide their bank details when they create the Order.
            // Maker (Seller of FX) does NOT need to provide payment method in Ad?
            // Unless Maker needs to receive NGN? NGN is internal wallet.

            // So:
            // BUY_FX Ad: Needs Payment Method (to receive FX). Needs Locked NGN.
            // SELL_FX Ad: Does NOT need Payment Method (NGN goes to wallet). Does NOT need Locked NGN.

            // Let's check the Plan again.
            // "Required if Maker is RECEIVING FX".
            // If BUY_FX, Maker Receives FX. So BUY_FX needs PaymentMethod.
            // If SELL_FX, Maker Gives FX. Taker Receives FX.

            // So `BUY_FX` -> `paymentMethodId` REQUIRED.
            // `SELL_FX` -> `paymentMethodId` OPTIONAL (or NULL).

            // Let's verify with the user's prompt text "Case B: Sell FX Ad ... FR-08: User selects one of their saved Payment Methods (where they want to receive the USD)."
            // This is confusing. If I Sell FX, I don't receive USD. I give USD.
            // Maybe "Sell FX" means "I Sell NGN for FX"?
            // No, usually "Sell [Asset]" means you give [Asset].
            // If Asset is NGN, then "Sell NGN".
            // But the module is "P2P Exchange Module: Trade NGN for FX".
            // So "Buy FX" = Buy USD. "Sell FX" = Sell USD.

            // If FR-08 is correct ("receive USD"), then "Sell FX" means "I want to receive USD".
            // That means "I am Buying USD".
            // But FR-07 says "Sell FX Ad".

            // I will assume the standard definition and that FR-08 might be misplaced or I'm misreading "receive".
            // Or maybe "receive the USD" means "receive the USD transfer details"? No.

            // Let's stick to:
            // BUY_FX: Maker Gives NGN, Gets FX.
            //   - Needs Locked NGN.
            //   - Needs Payment Method (to receive FX).
            // SELL_FX: Maker Gives FX, Gets NGN.
            //   - No Locked NGN.
            //   - No Payment Method (NGN to wallet).

            // Wait, if I am Taker and I click "Sell FX" (Maker is Selling FX), I am Buying FX.
            // I (Taker) Give NGN. Maker Gives FX.
            // I (Taker) need to provide my Bank Details to Maker so Maker can send FX.
            // So Order creation needs Payment Method snapshot.

            // If I am Taker and I click "Buy FX" (Maker is Buying FX), I am Selling FX.
            // I (Taker) Give FX. Maker Gives NGN.
            // Maker needs to provide Bank Details to Me so I can send FX.
            // So Ad needs Payment Method.

            // Conclusion:
            // BUY_FX Ad (Maker wants FX): Needs Payment Method.
            // SELL_FX Ad (Maker has FX): No Payment Method in Ad. Taker provides it in Order.

            // if (type === AdType.BUY_FX) {
            //     if (!paymentMethodId)
            //         throw new BadRequestError('Payment method is required for Buy FX ads');
            // }
            // if (!paymentMethodId)
            //     throw new BadRequestError('Payment method is required for Buy FX ads');
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

    static async getAds(query: any): Promise<P2PAd[]> {
        const { currency, type, status, minAmount } = query;

        const where: any = { status: status || AdStatus.ACTIVE };
        if (currency) where.currency = currency;
        if (type) where.type = type;
        if (minAmount) where.remainingAmount = { gte: Number(minAmount) };

        return await prisma.p2PAd.findMany({
            where,
            orderBy: { price: type === AdType.SELL_FX ? 'asc' : 'desc' }, // Best rates first
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
    }

    static async closeAd(userId: string, adId: string): Promise<P2PAd> {
        const ad = await prisma.p2PAd.findFirst({
            where: { id: adId, userId },
        });

        if (!ad) throw new NotFoundError('Ad not found');
        if (ad.status === AdStatus.CLOSED || ad.status === AdStatus.COMPLETED) {
            throw new BadRequestError('Ad is already closed');
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
}
