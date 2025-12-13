import { Worker, Job } from 'bullmq';
import { redisConnection } from '../shared/config/redis.config';
import { prisma } from '../shared/database';
import { TransactionStatus } from '../shared/database/generated/prisma';
import logger from '../shared/lib/utils/logger';

interface TransferJobData {
    transactionId: string;
    destination: {
        accountName: string;
        bankName: string;
    };
    amount: number;
    narration?: string;
}

const processTransfer = async (job: Job<TransferJobData>) => {
    const { transactionId, destination, amount } = job.data;
    logger.info(`Processing external transfer for transaction ${transactionId}`);

    try {
        // 1. Fetch Transaction
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { wallet: true },
        });

        if (!transaction) {
            throw new Error(`Transaction ${transactionId} not found`);
        }

        if (transaction.status !== TransactionStatus.PENDING) {
            logger.warn(`Transaction ${transactionId} is not PENDING. Skipping.`);
            return;
        }

        // 2. Call External API (Mocked)
        // In a real scenario, we would call the bank provider's API here.
        // For now, we simulate success/failure.
        const isSuccess = Math.random() > 0.1; // 90% success rate

        if (isSuccess) {
            // 3a. Handle Success
            await prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    status: TransactionStatus.COMPLETED,
                    sessionId: `SESSION-${Date.now()}`, // Mock Session ID
                },
            });
            logger.info(`Transfer ${transactionId} completed successfully`);
        } else {
            // 3b. Handle Failure (Refund)
            await prisma.$transaction(async tx => {
                // Update Transaction Status
                await tx.transaction.update({
                    where: { id: transactionId },
                    data: {
                        status: TransactionStatus.FAILED,
                        metadata: {
                            ...(transaction.metadata as object),
                            failureReason: 'External provider error',
                        },
                    },
                });

                // Refund Wallet
                await tx.wallet.update({
                    where: { id: transaction.walletId },
                    data: { balance: { increment: Math.abs(transaction.amount) } },
                });
            });
            logger.info(`Transfer ${transactionId} failed. Wallet refunded.`);
        }
    } catch (error) {
        logger.error(`Error processing transfer ${transactionId}`, error);
        // BullMQ will retry based on configuration
        throw error;
    }
};

export const transferWorker = new Worker('transfer-queue', processTransfer, {
    connection: redisConnection,
    concurrency: 5, // Process 5 jobs concurrently
    limiter: {
        max: 10, // Max 10 jobs
        duration: 1000, // per 1 second
    },
});

transferWorker.on('completed', job => {
    logger.info(`Job ${job.id} completed`);
});

transferWorker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed`, err);
});
