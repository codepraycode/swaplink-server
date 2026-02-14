import { Worker, Job } from 'bullmq';
import { redisConnection } from '../shared/config/redis.config';
import { prisma, OrderStatus, AdType, TransactionType, NotificationType } from '../shared/database';
import logger from '../shared/lib/utils/logger';
import { serviceRevenueService } from '../api/modules/revenue/service-revenue.service';
import { NotificationService } from '../api/modules/notification/notification.service';

interface OrderJobData {
    orderId: string;
}

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

            // Ensure we are not processing a completed or disputed order
            if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DISPUTE) {
                throw new Error(`Cannot release funds for order in ${order.status} status`);
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

            // Import helper functions
            const { getUserPartyDetails } = await import('../shared/lib/utils/transaction-helpers');

            // Get party details
            const payerDetails = await getUserPartyDetails(payerId);
            const receiverDetails = await getUserPartyDetails(receiverId);
            const revenueDetails = await getUserPartyDetails(revenueWallet.userId);

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

                    // Sender (Payer)
                    senderName: payerDetails.name,
                    senderAccount: payerDetails.account,
                    senderBankName: payerDetails.bankName,
                    senderAvatarUrl: payerDetails.avatarUrl,

                    // Receiver
                    receiverName: receiverDetails.name,
                    receiverAccount: receiverDetails.account,
                    receiverBankName: receiverDetails.bankName,
                    receiverAvatarUrl: receiverDetails.avatarUrl,
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

                    // Sender (Payer)
                    senderName: payerDetails.name,
                    senderAccount: payerDetails.account,
                    senderBankName: payerDetails.bankName,
                    senderAvatarUrl: payerDetails.avatarUrl,

                    // Receiver
                    receiverName: receiverDetails.name,
                    receiverAccount: receiverDetails.account,
                    receiverBankName: receiverDetails.bankName,
                    receiverAvatarUrl: receiverDetails.avatarUrl,
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

                    // Sender (Payer paying fee)
                    senderName: payerDetails.name,
                    senderAccount: payerDetails.account,
                    senderBankName: payerDetails.bankName,
                    senderAvatarUrl: payerDetails.avatarUrl,

                    // Receiver (Revenue)
                    receiverName: revenueDetails.name,
                    receiverAccount: revenueDetails.account,
                    receiverBankName: revenueDetails.bankName,
                    receiverAvatarUrl: revenueDetails.avatarUrl,
                },
            });

            // 7. Update Order Status to COMPLETED
            await tx.p2POrder.update({
                where: { id: orderId },
                data: {
                    status: OrderStatus.COMPLETED,
                    completedAt: new Date(),
                },
            });
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
        if (job.name === 'release-funds') {
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
