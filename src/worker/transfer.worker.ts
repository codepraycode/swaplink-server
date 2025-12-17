import { Worker, Job } from 'bullmq';
import { redisConnection } from '../shared/config/redis.config';
import { prisma, TransactionStatus, TransactionType } from '../shared/database';
import logger from '../shared/lib/utils/logger';
import { socketService } from '../shared/lib/services/socket.service';

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
                    sessionId: `SESSION-${Date.now()}-${Math.random().toString(36).substring(7)}`, // Mock Session ID
                },
            });
            logger.info(`Transfer ${transactionId} completed successfully`);

            // Emit Socket Event
            socketService.emitToUser(transaction.userId, 'transaction_update', {
                transactionId: transaction.id,
                status: TransactionStatus.COMPLETED,
                type: TransactionType.TRANSFER,
                amount: transaction.amount, // Already negative
                balance: transaction.balanceAfter, // Balance didn't change on completion (already debited)
                timestamp: new Date().toISOString(),
            });
        } else {
            // 3b. Handle Failure (Auto-Reversal)
            await prisma
                .$transaction(async tx => {
                    // A. Mark Original as Failed
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

                    // B. Create Reversal Transaction
                    const reversalTx = await tx.transaction.create({
                        data: {
                            userId: transaction.userId,
                            walletId: transaction.walletId,
                            type: TransactionType.REVERSAL,
                            amount: Math.abs(transaction.amount), // Credit back
                            balanceBefore: transaction.balanceAfter, // It was debited, so current balance is balanceAfter
                            balanceAfter: transaction.balanceAfter + Math.abs(transaction.amount),
                            status: TransactionStatus.COMPLETED,
                            reference: `REV-${transactionId}`,
                            description: `Reversal for ${transaction.reference}`,
                            metadata: { originalTransactionId: transactionId },
                        },
                    });

                    // C. Refund Wallet
                    await tx.wallet.update({
                        where: { id: transaction.walletId },
                        data: { balance: { increment: Math.abs(transaction.amount) } },
                    });

                    // Emit Socket Event (inside transaction to ensure consistency? No, emit after)
                    // But we need the data.
                    return reversalTx;
                })
                .then(reversalTx => {
                    socketService.emitToUser(transaction.userId, 'transaction_update', {
                        transactionId: transactionId,
                        status: TransactionStatus.FAILED,
                        type: TransactionType.TRANSFER,
                        amount: transaction.amount,
                        balance: reversalTx.balanceAfter, // Updated balance
                        timestamp: new Date().toISOString(),
                    });

                    // Also emit the reversal transaction?
                    socketService.emitToUser(transaction.userId, 'transaction_update', {
                        transactionId: reversalTx.id,
                        status: TransactionStatus.COMPLETED,
                        type: TransactionType.REVERSAL,
                        amount: reversalTx.amount,
                        balance: reversalTx.balanceAfter,
                        timestamp: new Date().toISOString(),
                    });
                });

            logger.info(`Transfer ${transactionId} failed. Auto-Reversal executed.`);
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
