import { Worker, Job } from 'bullmq';
import { redisConnection } from '../shared/config/redis.config';
import { globusService } from '../shared/lib/services/banking/globus.service';
import { prisma, TransactionStatus, TransactionType, NotificationType } from '../shared/database';
import logger from '../shared/lib/utils/logger';
import { socketService } from '../shared/lib/services/socket.service';
import { walletService } from '../shared/lib/services/wallet.service';
import { NotificationService } from '../api/modules/notification/notification.service';

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
    const { transactionId } = job.data;
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

        // 2. Call External API (Globus)
        // We use the globusService to initiate the transfer
        // If it fails, it throws. We catch and decide whether to retry or reverse.

        let transferResponse;
        try {
            transferResponse = await globusService.transferFunds({
                amount: Math.abs(Number(transaction.amount)), // Ensure positive number
                destinationAccount: transaction.destinationAccount!,
                destinationBankCode: transaction.destinationBankCode!,
                destinationName: transaction.destinationName!,
                narration: transaction.description || 'Transfer',
                reference: transaction.reference,
            });
        } catch (error: any) {
            logger.error(`Globus Transfer Failed for ${transactionId}`, error);

            // Determine if we should reverse immediately (Non-Retryable)
            // For now, we'll let BullMQ retry a few times.
            // If we want to fail fast on specific errors (e.g. "Insufficient Funds"), we can check error message.
            // If (error.response?.data?.code === 'INSUFFICIENT_FUNDS') throw new UnrecoverableError(...)

            throw error; // Let BullMQ handle retries
        }

        // 3. Handle Success
        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: TransactionStatus.COMPLETED,
                sessionId: transferResponse.sessionId || `SESSION-${Date.now()}`,
            },
        });
        logger.info(`Transfer ${transactionId} completed successfully`);

        // Emit Socket Event
        const newBalance = await walletService.getWalletBalance(transaction.userId);
        socketService.emitToUser(transaction.userId, 'WALLET_UPDATED', {
            ...newBalance,
            message: `Transfer Completed`,
            sender: { name: 'System', id: 'SYSTEM' },
        });

        // Send Push Notification
        await NotificationService.sendToUser(
            transaction.userId,
            'Transfer Successful',
            `Your transfer of ₦${Math.abs(
                Number(transaction.amount)
            ).toLocaleString()} was successful.`,
            {
                transactionId: transaction.id,
                type: 'TRANSFER_SUCCESS',
                sender: { name: 'System', id: 'SYSTEM' },
            },
            NotificationType.TRANSACTION
        );
    } catch (error) {
        logger.error(`Error processing transfer ${transactionId}`, error);
        throw error;
    }
};

// Handle Failed Jobs (After Retries)
const handleFailedJob = async (job: Job<TransferJobData> | undefined, err: Error) => {
    if (!job) return;

    logger.error(`Job ${job.id} failed: ${err.message}`);

    // Check if this was the last attempt
    if (job.attemptsMade >= (job.opts.attempts || 5)) {
        logger.error(`💀 Job ${job.id} permanently failed. Executing Reversal.`);
        const { transactionId } = job.data;

        try {
            const transaction = await prisma.transaction.findUnique({
                where: { id: transactionId },
            });

            if (!transaction || transaction.status !== TransactionStatus.PENDING) {
                logger.warn(`Transaction ${transactionId} not eligible for reversal.`);
                return;
            }

            // Execute Reversal Logic
            await prisma.$transaction(async tx => {
                // 1. Mark Principal as FAILED
                await tx.transaction.update({
                    where: { id: transactionId },
                    data: {
                        status: TransactionStatus.FAILED,
                        metadata: {
                            ...(transaction.metadata as object),
                            failureReason: err.message,
                        },
                    },
                });

                // 2. Reverse Principal (Credit User)
                await tx.transaction.create({
                    data: {
                        userId: transaction.userId,
                        walletId: transaction.walletId,
                        type: TransactionType.REVERSAL,
                        amount: Math.abs(Number(transaction.amount)),
                        balanceBefore: 0, // Not accurate inside transaction, but acceptable for log
                        balanceAfter: 0,
                        status: TransactionStatus.COMPLETED,
                        reference: `REV-${transactionId}`,
                        description: `Reversal for ${transaction.reference}`,
                        metadata: { originalTransactionId: transactionId },
                    },
                });

                await tx.wallet.update({
                    where: { id: transaction.walletId },
                    data: { balance: { increment: Math.abs(Number(transaction.amount)) } },
                });

                // 3. Reverse Fee (if linked)
                const metadata = transaction.metadata as any;
                if (metadata?.feeTransactionId) {
                    const feeTx = await tx.transaction.findUnique({
                        where: { id: metadata.feeTransactionId },
                    });
                    if (feeTx) {
                        // Mark Fee as FAILED (or REVERSED?)
                        // Usually we create a REVERSAL for the fee too.
                        await tx.transaction.create({
                            data: {
                                userId: transaction.userId,
                                walletId: transaction.walletId,
                                type: TransactionType.REVERSAL, // Or FEE_REVERSAL
                                amount: Math.abs(Number(feeTx.amount)),
                                balanceBefore: 0,
                                balanceAfter: 0,
                                status: TransactionStatus.COMPLETED,
                                reference: `REV-${feeTx.reference}`,
                                description: `Fee Reversal for ${transaction.reference}`,
                                metadata: { originalTransactionId: feeTx.id },
                            },
                        });

                        await tx.wallet.update({
                            where: { id: transaction.walletId },
                            data: { balance: { increment: Math.abs(Number(feeTx.amount)) } },
                        });
                    }
                }

                // 4. Reverse Revenue (Debit Revenue Wallet)
                if (metadata?.revenueTransactionId) {
                    const revenueTx = await tx.transaction.findUnique({
                        where: { id: metadata.revenueTransactionId },
                    });
                    if (revenueTx) {
                        // Create Debit for Revenue
                        await tx.transaction.create({
                            data: {
                                userId: revenueTx.userId,
                                walletId: revenueTx.walletId,
                                type: TransactionType.REVERSAL,
                                amount: -Math.abs(Number(revenueTx.amount)), // Debit
                                balanceBefore: 0,
                                balanceAfter: 0,
                                status: TransactionStatus.COMPLETED,
                                reference: `REV-${revenueTx.reference}`,
                                description: `Revenue Reversal for ${transaction.reference}`,
                                metadata: { originalTransactionId: revenueTx.id },
                            },
                        });

                        await tx.wallet.update({
                            where: { id: revenueTx.walletId },
                            data: { balance: { decrement: Math.abs(Number(revenueTx.amount)) } },
                        });
                    }
                }
            });

            // Notify User
            await NotificationService.sendToUser(
                transaction.userId,
                'Transfer Failed',
                `Your transfer of ₦${Math.abs(
                    Number(transaction.amount)
                ).toLocaleString()} failed and has been reversed.`,
                {
                    transactionId: transaction.id,
                    type: 'TRANSFER_FAILED',
                },
                NotificationType.TRANSACTION
            );

            // Emit Socket Event
            const newBalance = await walletService.getWalletBalance(transaction.userId);
            socketService.emitToUser(transaction.userId, 'WALLET_UPDATED', {
                ...newBalance,
                message: `Transfer Failed: Reversal Processed`,
            });
        } catch (reversalError) {
            logger.error(`Failed to reverse transaction ${transactionId}`, reversalError);
        }
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

transferWorker.on('failed', handleFailedJob);
