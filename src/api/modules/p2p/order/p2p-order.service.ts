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
import { P2PChatService } from '../chat/p2p-chat.service';
import { Decimal } from '@prisma/client/runtime/library';
import { NotificationService } from '../../notification/notification.service';

export class P2POrderService {
    static async createOrder(userId: string, data: any): Promise<P2POrder> {
        const { adId, amount, paymentMethodId, currency } = data;

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
            // A. Atomic Ad Update
            const updatedAd = await tx.p2PAd.updateMany({
                where: {
                    id: adId,
                    remainingAmount: { gte: amount },
                },
                data: {
                    remainingAmount: { decrement: amount },
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

            // C. Create Order
            return await tx.p2POrder.create({
                data: {
                    adId,
                    makerId,
                    takerId,
                    amount,
                    price: ad.price,
                    totalNgn,
                    status: OrderStatus.PENDING,
                    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
                    ...bankSnapshot,
                },
            });
        });

        // 3. Schedule Expiration Job
        await getP2POrderQueue().add(
            'order-timeout',
            { orderId: order.id },
            { delay: 15 * 60 * 1000 }
        );

        // 4. System Message
        await P2PChatService.createSystemMessage(
            order.id,
            `Order created. Please pay ${order.totalNgn} NGN.`
        );

        // 5. Notification to Ad Owner (Maker)
        await NotificationService.sendToUser(
            makerId,
            'New Order Received',
            `You have a new order for ${amount} ${ad.currency} from a buyer.`,
            { orderId: order.id, type: 'order' },
            NotificationType.TRANSACTION
        );

        // 6. Refetch with relations for response
        const fullOrder = await prisma.p2POrder.findUnique({
            where: { id: order.id },
            include: { ad: true, maker: true, taker: true },
        });

        return fullOrder!;
    }
    /**
     * Mark Order as Paid
     * - Only the NGN Payer can mark as paid
     * - Requires proof of payment
     */
    static async markAsPaid(userId: string, orderId: string, proofUrl: string): Promise<P2POrder> {
        if (!proofUrl) throw new BadRequestError('Payment proof is required');

        const order = await prisma.p2POrder.findUnique({
            where: { id: orderId },
            include: { ad: true },
        });

        if (!order) throw new NotFoundError('Order not found');
        if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED)
            throw new BadRequestError('Order is completed');

        // Who pays NGN?
        // If BUY_FX: Maker buys FX with NGN → Maker pays NGN
        // If SELL_FX: Taker buys FX with NGN → Taker pays NGN
        const isNgnPayer =
            (order.ad.type === AdType.BUY_FX && userId === order.makerId) ||
            (order.ad.type === AdType.SELL_FX && userId === order.takerId);

        if (isNgnPayer) throw new ForbiddenError('Only the non NGN payer can mark order as paid');

        const updatedOrder = await prisma.p2POrder.update({
            where: { id: orderId },
            data: {
                status: OrderStatus.PAID,
                paymentProofUrl: proofUrl,
            },
        });

        // Notify the NGN Payer (The other party)
        const otherPartyId = userId === order.makerId ? order.takerId : order.makerId;

        await NotificationService.sendToUser(
            otherPartyId,
            'Order Paid',
            `Order #${order.id.slice(0, 8)} marked as paid. Please verify and release funds.`,
            { orderId: order.id },
            NotificationType.TRANSACTION
        );

        return updatedOrder;
    }

    static async confirmOrder(userId: string, orderId: string): Promise<{ message: string }> {
        const order = await prisma.p2POrder.findUnique({
            where: { id: orderId },
            include: { ad: true },
        });
        if (!order) throw new NotFoundError('Order not found');

        // Who receives NGN payment?
        // If SELL_FX: Maker sells FX and receives NGN → Maker confirms
        // If BUY_FX: Taker sells FX and receives NGN → Taker confirms
        // Only the NGN receiver can confirm they received the payment.

        const isNgnReceiver =
            (order.ad.type === AdType.SELL_FX && userId === order.makerId) ||
            (order.ad.type === AdType.BUY_FX && userId === order.takerId);

        if (!isNgnReceiver)
            throw new ForbiddenError('Only the payment receiver can confirm the order');
        if (order.status !== OrderStatus.PAID)
            throw new BadRequestError('Order must be marked as paid first');

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

        // 3. System Message
        await P2PChatService.createSystemMessage(
            orderId,
            'Order confirmed. Funds will be released shortly.'
        );

        // 4. Notify both parties
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

    static async cancelOrder(userId: string, orderId: string): Promise<{ message: string }> {
        const order = await prisma.p2POrder.findUnique({
            where: { id: orderId },
            include: { ad: true },
        });
        if (!order) throw new NotFoundError('Order not found');

        if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
            throw new BadRequestError('Order already finalized');
        }

        if (order.status === OrderStatus.PAID) {
            // Only Admin or Dispute resolution can cancel PAID orders
            throw new ForbiddenError('Cannot cancel a paid order. Please raise a dispute.');
        }

        // Only Payer or Receiver (or Admin) can cancel?
        // Usually Payer can cancel anytime before PAID.
        // Receiver can cancel? Maybe if they suspect fraud.
        // Let's allow both for now if PENDING.

        if (userId !== order.makerId && userId !== order.takerId)
            throw new ForbiddenError('Not authorized');

        await prisma.$transaction(async tx => {
            // 1. Refund NGN Payer (Unlock funds)
            // If Taker was Payer (SELL_FX), unlock Taker.
            // If Maker was Payer (BUY_FX), funds return to Ad (increment remainingAmount).

            if (order.ad.type === AdType.SELL_FX) {
                // Taker locked funds. Refund Taker.
                await tx.wallet.update({
                    where: { userId: order.takerId },
                    data: { lockedBalance: { decrement: order.totalNgn } },
                });
            } else {
                // Maker locked funds (in Ad).
                // Return funds to Ad (increment remainingAmount).
                // Note: Maker's wallet lockedBalance is NOT decremented because the funds stay in the Ad!
                // Wait, if Order is cancelled, the funds allocated to this order go back to the Ad's "Available" pool.
                // So we just increment `remainingAmount`.
                // We do NOT touch wallet `lockedBalance` because it covers the *entire* Ad amount.

                await tx.p2PAd.update({
                    where: { id: order.adId },
                    data: { remainingAmount: { increment: order.amount } },
                });
            }

            // 2. Update Order
            await tx.p2POrder.update({
                where: { id: orderId },
                data: { status: OrderStatus.CANCELLED },
            });
        });

        await P2PChatService.createSystemMessage(orderId, 'Order cancelled.');

        return { message: 'Order cancelled' };
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
