import { Worker, Job } from 'bullmq';
import { redisConnection } from '../shared/config/redis.config';
import { prisma } from '../shared/database';
import { OrderStatus, AdType } from '../shared/database/generated/prisma';
import logger from '../shared/lib/utils/logger';

interface CheckOrderExpirationData {
    orderId: string;
}

const processOrderExpiration = async (job: Job<CheckOrderExpirationData>) => {
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

export const p2pOrderWorker = new Worker('p2p-order-queue', processOrderExpiration, {
    connection: redisConnection,
    concurrency: 5,
});

p2pOrderWorker.on('completed', job => {
    logger.info(`P2P Order Job ${job.id} completed`);
});

p2pOrderWorker.on('failed', (job, err) => {
    logger.error(`P2P Order Job ${job?.id} failed`, err);
});
