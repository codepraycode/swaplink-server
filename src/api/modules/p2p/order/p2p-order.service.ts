import {
    prisma,
    OrderStatus,
    AdType,
    AdStatus,
    P2POrder,
    NotificationType,
} from '../../../../shared/database';
import {
    BadRequestError,
    NotFoundError,
    ConflictError,
    ForbiddenError,
    InternalError,
} from '../../../../shared/lib/utils/api-error';

import { getQueue as getP2POrderQueue } from '../../../../shared/lib/queues/p2p-order.queue';
import { Decimal } from '@prisma/client/runtime/library';
import { NotificationService } from '../../notification/notification.service';

export class P2POrderService {
    /**
     * Create Order with Proof of Payment
     * - Order is created directly in IN_PROGRESS status (proof already submitted)
     * - No timer/expiration logic — FX has already been sent
     * - Deducts engagedAmount from the ad (engagement is fulfilled)
     */
    static async createOrder(userId: string, data: any): Promise<P2POrder> {
        const { adId, amount, paymentMethodId, currency, paymentProofUrl } = data;

        // Proof is required upfront
        if (!paymentProofUrl) throw new BadRequestError('Payment proof is required');

        // 1. Fetch Ad
        const ad = await prisma.p2PAd.findUnique({
            where: { id: adId },
            include: { paymentMethod: true },
        });

        if (!ad) throw new NotFoundError('Ad not found');
        if (ad.userId === userId) throw new BadRequestError('Cannot trade with your own ad');
        if (ad.status !== AdStatus.ACTIVE) throw new BadRequestError('Ad is not active');
        if (amount < ad.minLimit || amount > ad.maxLimit)
            throw new BadRequestError(`Amount must be between ${ad.minLimit} and ${ad.maxLimit}`);

        // Check if remaining amount after this order would be less than minLimit
        const newRemainingAmount = ad.remainingAmount - amount;
        if (newRemainingAmount > 0 && newRemainingAmount < ad.minLimit) {
            throw new BadRequestError(
                `Order would leave ${newRemainingAmount} ${ad.currency} remaining, which is below the minimum order of ${ad.minLimit}. ` +
                    `Please order at least ${
                        ad.remainingAmount - ad.minLimit + 1
                    } or the full remaining amount of ${ad.remainingAmount}.`
            );
        }

        const totalNgn = amount * ad.price;
        const makerId = ad.userId;
        const takerId = userId;

        // Snapshot Bank Details
        let bankSnapshot: any = {};

        if (ad.type === AdType.BUY_FX) {
            // Maker WANTS FX (Gives NGN). Maker funds already locked in Ad.
            // Taker GIVES FX. Taker needs Maker's Bank Details to send FX.
            if (!ad.paymentMethod)
                throw new InternalError('Maker payment method missing for Buy FX ad');

            bankSnapshot = {
                bankName: ad.paymentMethod.bankName,
                accountNumber: ad.paymentMethod.accountNumber,
                accountName: ad.paymentMethod.accountName,
                bankDetails: ad.paymentMethod.details,
            };
        } else {
            // SELL_FX: Maker GIVES FX (Wants NGN).
            // Taker GIVES NGN. Taker WANTS FX.
            // Taker needs to lock NGN funds.
            // Taker needs to provide Payment Method (to receive FX).
            if (!paymentMethodId)
                throw new BadRequestError(
                    `Payment method required to receive ${currency || 'Unknown'}`
                );

            const takerMethod = await prisma.p2PPaymentMethod.findUnique({
                where: { id: paymentMethodId, currency },
            });
            if (!takerMethod || takerMethod.userId !== takerId)
                throw new BadRequestError(
                    `Invalid payment method for ${
                        currency || 'Unknown'
                    }. Please provide a valid payment method.`
                );

            bankSnapshot = {
                bankName: takerMethod.bankName,
                accountNumber: takerMethod.accountNumber,
                accountName: takerMethod.accountName,
                bankDetails: takerMethod.details,
            };
        }

        // 2. Transaction: Reserve Ad Amount + Lock Funds + Create Order
        const order = await prisma.$transaction(async tx => {
            // A. Atomic Ad Update (decrement remainingAmount and engagedAmount)
            const updatedAd = await tx.p2PAd.updateMany({
                where: {
                    id: adId,
                    remainingAmount: { gte: Number(amount) },
                },
                data: {
                    remainingAmount: { decrement: Number(amount) },
                    engagedAmount: {
                        decrement: Math.min(Number(amount), Number(ad.engagedAmount)),
                    },
                    version: { increment: 1 },
                },
            });

            if (updatedAd.count === 0) {
                throw new ConflictError(
                    'Ad balance insufficient or updated by another user. Please retry.'
                );
            }

            // B. Funds Locking Logic (If SELL_FX)
            if (ad.type === AdType.SELL_FX) {
                // Taker needs to lock NGN funds.
                const wallet = await tx.wallet.findUnique({ where: { userId: takerId } });
                if (!wallet) throw new NotFoundError('Wallet not found');

                const balance = new Decimal(wallet.balance);
                const locked = new Decimal(wallet.lockedBalance);
                const available = balance.minus(locked);
                const decimalAmount = new Decimal(totalNgn);

                if (available.lessThan(decimalAmount)) {
                    throw new BadRequestError('Insufficient funds to lock');
                }

                await tx.wallet.update({
                    where: { id: wallet.id },
                    data: { lockedBalance: { increment: decimalAmount } },
                });
            }

            // C. Create Order (directly as IN_PROGRESS with proof)
            return await tx.p2POrder.create({
                data: {
                    adId,
                    makerId,
                    takerId,
                    amount,
                    price: Number(ad.price),
                    totalNgn,
                    status: OrderStatus.IN_PROGRESS,
                    paymentProofUrl,
                    ...bankSnapshot,
                },
            });
        });

        // 3. Notification to Ad Owner (Maker)
        await NotificationService.sendToUser(
            makerId,
            'New Order Received',
            `You have a new order for ${amount} ${ad.currency}. Proof of payment has been submitted.`,
            { orderId: order.id, type: 'order' },
            NotificationType.TRANSACTION
        );

        // 4. Refetch with relations for response
        const fullOrder = await prisma.p2POrder.findUnique({
            where: { id: order.id },
            include: { ad: true, maker: true, taker: true },
        });

        return fullOrder!;
    }

    /**
     * Confirm Order (Release Funds)
     * - The NGN Payer (FX Buyer) confirms they received FX
     * - Triggers async fund release via worker
     */
    static async confirmOrder(userId: string, orderId: string): Promise<{ message: string }> {
        const order = await prisma.p2POrder.findUnique({
            where: { id: orderId },
            include: { ad: true },
        });
        if (!order) throw new NotFoundError('Order not found');

        // Check if user is part of the order
        if (userId !== order.makerId && userId !== order.takerId) {
            throw new ForbiddenError('Access denied');
        }

        // Who confirms the order?
        // The person who LOCKED the NGN (The NGN Payer / FX Buyer).
        // They confirm that they received the FX in their external bank account.
        // Once confirmed, the locked NGN is released to the FX Seller.

        const isNgnPayer =
            (order.ad.type === AdType.BUY_FX && userId === order.makerId) ||
            (order.ad.type === AdType.SELL_FX && userId === order.takerId);

        if (!isNgnPayer)
            throw new ForbiddenError(
                'Only the buyer of FX (NGN payer) can confirm receipt and release funds. You are the seller.'
            );
        if (order.status !== OrderStatus.IN_PROGRESS)
            throw new BadRequestError('Order must be in progress to confirm');

        // Calculate fee and receive amount
        const feePercent = 0.01; // 1% fee
        const fee = order.totalNgn * feePercent;
        const receiveAmount = order.totalNgn - fee;

        // 1. Update Order Status to PROCESSING and store fee/receiveAmount
        await prisma.p2POrder.update({
            where: { id: orderId },
            data: {
                status: OrderStatus.PROCESSING, // Worker will mark as COMPLETED
                completedAt: null, // Will be set by worker
                fee,
                receiveAmount,
            },
        });

        // 2. Trigger Async Fund Release via Worker
        await getP2POrderQueue().add('release-funds', { orderId });

        // 3. Notify both parties
        const payerId = order.ad.type === AdType.BUY_FX ? order.makerId : order.takerId;
        const receiverId = order.ad.type === AdType.BUY_FX ? order.takerId : order.makerId;

        await NotificationService.sendToUser(
            payerId,
            'Order Completed',
            `Order #${orderId.slice(0, 8)} has been completed. Funds are being processed.`,
            { orderId, type: 'order' },
            NotificationType.TRANSACTION
        );

        await NotificationService.sendToUser(
            receiverId,
            'Order Completed',
            `Order #${orderId.slice(
                0,
                8
            )} has been completed. You will receive your funds shortly.`,
            { orderId, type: 'order' },
            NotificationType.TRANSACTION
        );

        return { message: 'Order completed. Funds will be released soon.' };
    }

    static async getOrder(userId: string, orderId: string): Promise<P2POrder> {
        const order = await prisma.p2POrder.findUnique({
            where: { id: orderId },
            include: { ad: true, maker: true, taker: true },
        });

        if (!order) throw new NotFoundError('Order not found');
        if (order.makerId !== userId && order.takerId !== userId)
            throw new ForbiddenError('Access denied');

        return order;
    }

    static async getUserOrders(userId: string): Promise<P2POrder[]> {
        const orders = await prisma.p2POrder.findMany({
            where: {
                OR: [{ makerId: userId }, { takerId: userId }],
            },
            include: {
                ad: true,
                maker: true,
                taker: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return orders;
    }
}
