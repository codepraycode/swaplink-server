import { prisma, OrderStatus, AdType, TransactionType } from '../../../shared/database';
import { BadRequestError, NotFoundError, InternalError } from '../../../shared/lib/utils/api-error';
import { p2pFeeService } from './p2p-fee.service';
import { serviceRevenueService } from '../revenue/service-revenue.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../../shared/database';

export class P2POrderService {
    /**
     * Create a P2P Order.
     * - Locks Ad Inventory (Optimistic).
     * - Locks Taker's NGN if they are the NGN Payer (SELL_FX Ad).
     * - Snapshots Payment Details.
     */
    async createOrder(
        userId: string,
        data: {
            adId: string;
            amount: number; // FX Amount
        }
    ) {
        const { adId, amount } = data;

        return await prisma.$transaction(async tx => {
            // 1. Fetch Ad
            const ad = await tx.p2PAd.findUnique({
                where: { id: adId },
                include: { paymentMethod: true, user: true },
            });

            if (!ad) throw new NotFoundError('Ad not found');
            if (ad.userId === userId) throw new BadRequestError('Cannot trade on your own ad');
            if (ad.remainingAmount < amount) throw new BadRequestError('Insufficient ad balance');
            if (amount < ad.minLimit || amount > ad.maxLimit) {
                throw new BadRequestError(
                    `Amount must be between ${ad.minLimit} and ${ad.maxLimit}`
                );
            }

            // 2. Optimistic Lock & Inventory Update
            await tx.p2PAd.update({
                where: { id: adId, version: ad.version },
                data: {
                    remainingAmount: { decrement: amount },
                    version: { increment: 1 },
                },
            });

            // 3. Calculate Values
            const totalNgn = amount * ad.price;
            const { totalFee } = p2pFeeService.calculateOrderFee(totalNgn);
            const receiveAmount = totalNgn - totalFee;

            // 4. Lock Taker's NGN (If Taker is Paying NGN)
            // AdType.SELL_FX means Maker GIVES FX, RECEIVES NGN.
            // So Taker GIVES NGN, RECEIVES FX.
            // Taker is the NGN Payer.
            if (ad.type === AdType.SELL_FX) {
                const takerWallet = await tx.wallet.findUnique({ where: { userId } });
                if (!takerWallet) throw new NotFoundError('Taker wallet not found');

                if (Number(takerWallet.balance) < totalNgn) {
                    throw new BadRequestError('Insufficient NGN balance');
                }

                await tx.wallet.update({
                    where: { userId },
                    data: {
                        balance: { decrement: totalNgn },
                        lockedBalance: { increment: totalNgn },
                    },
                });
            }

            // 5. Snapshot Bank Details
            // If Maker is receiving NGN (SELL_FX), we don't need bank details (internal).
            // If Maker is paying NGN (BUY_FX), Taker receives NGN (internal).
            // Wait, FX is External.
            // If Maker is BUYING FX (Pays NGN), Taker Sends FX. Taker needs Maker's FX Details? No, Maker needs Taker's FX Details to send money?
            // BUY_FX: Maker (NGN) -> Taker (FX).
            // Maker Pays NGN (Internal). Taker Pays FX (External).
            // So Taker needs Maker's FX Account Details? No, Maker is BUYING FX. Maker wants to RECEIVE FX.
            // So Maker provides FX Account Details? Yes.
            // So `ad.paymentMethod` should be present if `ad.type === BUY_FX`.

            // If SELL_FX: Maker (FX) -> Taker (NGN).
            // Maker Pays FX (External). Taker Pays NGN (Internal).
            // Taker needs Maker's FX Account Details? No, Maker sends FX to Taker.
            // So Taker provides FX Account Details? Yes.

            // Logic Check:
            // BUY_FX: Maker wants FX. Maker provides Payment Method (FX Account). Taker sees it and sends FX.
            // SELL_FX: Maker has FX. Maker wants NGN. Taker wants FX. Taker provides Payment Method (FX Account). Maker sees it and sends FX.

            let bankDetailsSnapshot = null;
            let bankName = null;
            let accountNumber = null;
            let accountName = null;

            if (ad.type === AdType.BUY_FX) {
                // Maker provided details in Ad
                if (!ad.paymentMethod) throw new InternalError('Ad missing payment method');
                bankDetailsSnapshot = ad.paymentMethod.details;
                bankName = ad.paymentMethod.bankName;
                accountNumber = ad.paymentMethod.accountNumber;
                accountName = ad.paymentMethod.accountName;
            } else {
                // SELL_FX: Taker must provide details?
                // For MVP, let's assume Taker has a Primary Payment Method we use?
                // Or we require Taker to select one in the request.
                // For now, let's skip Taker's details snapshot if not provided in request (TODO: Add to request DTO).
                // Assuming Taker sends FX details in chat or we add `paymentMethodId` to createOrder DTO.
            }

            // 6. Create Order
            const order = await tx.p2POrder.create({
                data: {
                    adId,
                    makerId: ad.userId,
                    takerId: userId,
                    amount,
                    price: ad.price,
                    totalNgn,
                    fee: totalFee,
                    receiveAmount,
                    bankDetails: bankDetailsSnapshot || {}, // TODO: Handle Taker's details
                    bankName,
                    accountNumber,
                    accountName,
                    status: OrderStatus.PENDING,
                    expiresAt: new Date(Date.now() + 20 * 60 * 1000), // 20 mins
                },
            });

            // 7. Schedule Timeout Job
            // await p2pQueue.add('order-timeout', { orderId: order.id }, { delay: 20 * 60 * 1000 });

            return order;
        });
    }

    /**
     * Mark Order as Paid (Taker)
     */
    async markAsPaid(userId: string, orderId: string, proofUrl?: string) {
        const order = await prisma.p2POrder.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundError('Order not found');
        if (order.takerId !== userId) throw new BadRequestError('Not authorized');
        if (order.status !== OrderStatus.PENDING) throw new BadRequestError('Order not pending');

        const updatedOrder = await prisma.p2POrder.update({
            where: { id: orderId },
            data: {
                status: OrderStatus.PAID,
                paymentProofUrl: proofUrl,
            },
        });

        // Notify Maker
        await NotificationService.sendToUser(
            order.makerId,
            'Order Paid',
            `Order #${order.id.slice(
                0,
                8
            )} has been marked as paid by the buyer. Please verify and release funds.`,
            { orderId: order.id },
            NotificationType.TRANSACTION
        );

        return updatedOrder;
    }

    /**
     * Release Funds (Maker)
     * - Atomic Settlement.
     */
    async releaseFunds(userId: string, orderId: string) {
        return await prisma.$transaction(async tx => {
            const order = await tx.p2POrder.findUnique({
                where: { id: orderId },
                include: { ad: true },
            });
            if (!order) throw new NotFoundError('Order not found');
            if (order.makerId !== userId) throw new BadRequestError('Not authorized');
            if (order.status !== OrderStatus.PAID) throw new BadRequestError('Order not paid');

            // 1. Identify NGN Payer and Receiver
            // BUY_FX: Maker (NGN Payer) -> Taker (NGN Receiver)
            // SELL_FX: Taker (NGN Payer) -> Maker (NGN Receiver)

            const isBuyFx = order.ad.type === AdType.BUY_FX;
            const payerId = isBuyFx ? order.makerId : order.takerId;
            const receiverId = isBuyFx ? order.takerId : order.makerId;

            // 2. Get Revenue Wallet
            const revenueWallet = await serviceRevenueService.getRevenueWallet();

            // 3. Debit Payer (From Locked Balance)
            await tx.wallet.update({
                where: { userId: payerId },
                data: {
                    lockedBalance: { decrement: order.totalNgn },
                },
            });

            // 4. Credit Receiver (Total - Fee)
            // 4. Credit Receiver (Total - Fee)
            await tx.wallet.update({
                where: { userId: receiverId },
                data: {
                    balance: { increment: Number(order.receiveAmount) },
                },
            });

            // Update User Cumulative Inflow
            await tx.user.update({
                where: { id: receiverId },
                data: {
                    cumulativeInflow: { increment: Number(order.receiveAmount) },
                },
            });

            // 5. Credit Revenue (Fee)
            await tx.wallet.update({
                where: { id: revenueWallet.id },
                data: {
                    balance: { increment: order.fee },
                },
            });

            // 6. Create Transaction Records
            // Payer Debit
            await tx.transaction.create({
                data: {
                    userId: payerId,
                    walletId: (
                        await tx.wallet.findUniqueOrThrow({
                            where: { userId: payerId },
                        })
                    ).id,
                    type: TransactionType.TRANSFER,
                    amount: -order.totalNgn,
                    balanceBefore: 0, // TODO: Fetch actual balance if needed
                    balanceAfter: 0,
                    status: 'COMPLETED',
                    reference: `P2P-DEBIT-${order.id}`,
                    description: `P2P ${isBuyFx ? 'Buy' : 'Sell'} Order`,
                },
            });

            // Receiver Credit
            await tx.transaction.create({
                data: {
                    userId: receiverId,
                    walletId: (
                        await tx.wallet.findUniqueOrThrow({
                            where: { userId: receiverId },
                        })
                    ).id,
                    type: TransactionType.DEPOSIT,
                    amount: Number(order.receiveAmount),
                    balanceBefore: 0,
                    balanceAfter: 0,
                    status: 'COMPLETED',
                    reference: `P2P-CREDIT-${order.id}`,
                    description: `P2P ${isBuyFx ? 'Sell' : 'Buy'} Proceeds`,
                },
            });

            // Fee Credit
            await tx.transaction.create({
                data: {
                    userId: revenueWallet.userId,
                    walletId: revenueWallet.id,
                    type: TransactionType.FEE,
                    amount: order.fee,
                    balanceBefore: 0,
                    balanceAfter: 0,
                    status: 'COMPLETED',
                    reference: `P2P-FEE-${order.id}`,
                    description: `Fee for Order ${order.id}`,
                },
            });

            // 7. Update Order Status
            return tx.p2POrder.update({
                where: { id: orderId },
                data: {
                    status: OrderStatus.COMPLETED,
                    completedAt: new Date(),
                },
            });
        });
    }
}

export const p2pOrderService = new P2POrderService();
