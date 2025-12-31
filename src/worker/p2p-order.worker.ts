import { Worker, Job } from 'bullmq';
import { redisConnection } from '../shared/config/redis.config';
import { prisma, OrderStatus, AdType, TransactionType, NotificationType } from '../shared/database';
import logger from '../shared/lib/utils/logger';
import { serviceRevenueService } from '../api/modules/revenue/service-revenue.service';
import { NotificationService } from '../api/modules/notification/notification.service';

interface OrderJobData {
    orderId: string;
}

const processOrderExpiration = async (job: Job<OrderJobData>) => {
    const { orderId } = job.data;
    logger.info(`Checking expiration for order ${orderId}`);

    try {
        const order = await prisma.p2POrder.findUnique({
            where: { id: orderId },
            include: { ad: true },
        });

        if (!order) {
            logger.warn(`Order ${orderId} not found during expiration check`);
            return;
        }

        if (order.status !== OrderStatus.PENDING) {
            logger.info(`Order ${orderId} is ${order.status}. No expiration needed.`);
            return;
        }

        // Order is PENDING and timed out. Cancel it.
        logger.info(`Order ${orderId} expired. Cancelling...`);

        await prisma.$transaction(async tx => {
            // 1. Refund Logic (Replicated from P2POrderService.cancelOrder)
            if (order.ad.type === AdType.SELL_FX) {
                // Taker locked funds. Refund Taker.
                await tx.wallet.update({
                    where: { userId: order.takerId },
                    data: { lockedBalance: { decrement: order.totalNgn } },
                });
            } else {
                // Maker locked funds (in Ad). Return to Ad.
                await tx.p2PAd.update({
                    where: { id: order.adId },
                    data: { remainingAmount: { increment: order.amount } },
                });
            }

            // 2. Update Order Status
            await tx.p2POrder.update({
                where: { id: orderId },
                data: { status: OrderStatus.CANCELLED },
            });
        });

        logger.info(`Order ${orderId} cancelled successfully.`);

        // TODO: Emit socket event to notify users?
    } catch (error) {
        logger.error(`Error processing expiration for order ${orderId}`, error);
        throw error;
    }
};

const processFundRelease = async (job: Job<OrderJobData>) => {
    const { orderId } = job.data;
    logger.info(`Processing fund release for order ${orderId}`);

    try {
        // Idempotency Check
        const existingTx = await prisma.transaction.findFirst({
            where: { reference: `P2P-DEBIT-${orderId}` },
        });
        if (existingTx) {
            logger.info(`Funds already released for order ${orderId}. Skipping.`);
            return;
        }

        await prisma.$transaction(async tx => {
            const order = await tx.p2POrder.findUnique({
                where: { id: orderId },
                include: { ad: true },
            });
            if (!order) throw new Error('Order not found');

            // Note: Order status might already be COMPLETED by the API, so we don't check for PAID here strictly.
            // But we should ensure we are not processing a CANCELLED order.
            if (order.status === OrderStatus.CANCELLED) {
                throw new Error('Cannot release funds for cancelled order');
            }

            // 1. Identify NGN Payer and Receiver
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

            // 6. Create Transaction Records with Proper Balance Tracking

            // Fetch wallets with current balances
            const payerWallet = await tx.wallet.findUniqueOrThrow({
                where: { userId: payerId },
            });
            const receiverWallet = await tx.wallet.findUniqueOrThrow({
                where: { userId: receiverId },
            });

            // Calculate balances (after the updates above)
            const payerBalanceBefore =
                Number(payerWallet.balance) + Number(payerWallet.lockedBalance);
            const payerBalanceAfter = Number(payerWallet.balance);
            const receiverBalanceBefore =
                Number(receiverWallet.balance) - Number(order.receiveAmount);
            const receiverBalanceAfter = Number(receiverWallet.balance);

            // Payer Debit Transaction
            await tx.transaction.create({
                data: {
                    userId: payerId,
                    walletId: payerWallet.id,
                    type: TransactionType.TRANSFER,
                    amount: -order.totalNgn,
                    balanceBefore: payerBalanceBefore,
                    balanceAfter: payerBalanceAfter,
                    status: 'COMPLETED',
                    reference: `P2P-DEBIT-${order.id}`,
                    description: `P2P ${isBuyFx ? 'Purchase' : 'Sale'}: ${order.amount} ${
                        order.ad.currency
                    } @ ₦${order.price}/${order.ad.currency}`,
                    metadata: {
                        orderId: order.id,
                        type: isBuyFx ? 'BUY_FX' : 'SELL_FX',
                        currency: order.ad.currency,
                        fxAmount: order.amount,
                        rate: order.price,
                        fee: order.fee,
                        counterpartyId: receiverId,
                    },
                },
            });

            // Receiver Credit Transaction
            await tx.transaction.create({
                data: {
                    userId: receiverId,
                    walletId: receiverWallet.id,
                    type: TransactionType.DEPOSIT,
                    amount: Number(order.receiveAmount),
                    balanceBefore: receiverBalanceBefore,
                    balanceAfter: receiverBalanceAfter,
                    status: 'COMPLETED',
                    reference: `P2P-CREDIT-${order.id}`,
                    description: `P2P ${isBuyFx ? 'Sale' : 'Purchase'}: ${order.amount} ${
                        order.ad.currency
                    } @ ₦${order.price}/${order.ad.currency} (Fee: ₦${order.fee})`,
                    metadata: {
                        orderId: order.id,
                        type: isBuyFx ? 'SELL_FX' : 'BUY_FX',
                        currency: order.ad.currency,
                        fxAmount: order.amount,
                        rate: order.price,
                        grossAmount: order.totalNgn,
                        fee: order.fee,
                        netAmount: Number(order.receiveAmount),
                        counterpartyId: payerId,
                    },
                },
            });

            // Fee Credit (Revenue)
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
                    description: `P2P Transaction Fee: Order #${order.id.slice(0, 8)}`,
                    metadata: {
                        orderId: order.id,
                        currency: order.ad.currency,
                        fxAmount: order.amount,
                    },
                },
            });

            // Note: Order Status is updated by API to COMPLETED.
            // If it wasn't, we would do it here.
            // To be safe, we can ensure it is COMPLETED here too or just leave it.
            // The API sets it to COMPLETED.
        });

        logger.info(`Funds released successfully for order ${orderId}`);

        // Notify Users
        const order = await prisma.p2POrder.findUnique({
            where: { id: orderId },
            include: { ad: true },
        });
        if (order) {
            const isBuyFx = order.ad.type === AdType.BUY_FX;
            const receiverId = isBuyFx ? order.takerId : order.makerId;

            await NotificationService.sendToUser(
                receiverId,
                'Funds Released',
                `You have received NGN ${order.receiveAmount} for Order #${order.id.slice(0, 8)}.`,
                { orderId: order.id },
                NotificationType.TRANSACTION
            );
        }
    } catch (error) {
        logger.error(`Error processing fund release for order ${orderId}`, error);
        throw error;
    }
};

export const p2pOrderWorker = new Worker(
    'p2p-order-queue',
    async job => {
        if (job.name === 'order-timeout') {
            return await processOrderExpiration(job);
        } else if (job.name === 'release-funds') {
            return await processFundRelease(job);
        }
    },
    {
        connection: redisConnection,
        concurrency: 5,
    }
);

p2pOrderWorker.on('completed', job => {
    logger.info(`P2P Order Job ${job.id} (${job.name}) completed`);
});

p2pOrderWorker.on('failed', (job, err) => {
    logger.error(`P2P Order Job ${job?.id} (${job?.name}) failed`, err);
});
