import { Worker, Job } from 'bullmq';
import { redisConnection } from '../shared/config/redis.config';
import { globusService } from '../shared/lib/services/banking/globus.service';
import { prisma, TransactionStatus, TransactionType } from '../shared/database';
import logger from '../shared/lib/utils/logger';
import { socketService } from '../shared/lib/services/socket.service';
import { walletService } from '../shared/lib/services/wallet.service';
import { eventBus, EventType } from '../shared/lib/events/event-bus';

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
                destinationAccount: transaction.receiverAccount,
                destinationBankCode: transaction.receiverBankCode || '',
                destinationName: transaction.receiverName,
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

        // Ensure userId is not null
        if (!transaction.userId) {
            logger.error(`Transaction ${transactionId} has no userId`);
            return;
        }

        // Emit Socket Event
        const newBalance = await walletService.getWalletBalance(transaction.userId);
        socketService.emitToUser(transaction.userId, 'WALLET_UPDATED', {
            ...newBalance,
            message: `Transfer Completed`,
            sender: { name: 'System', id: 'SYSTEM' },
        });

        // Emit Event for Success
        eventBus.publish(EventType.TRANSACTION_COMPLETED, {
            userId: transaction.userId,
            amount: Math.abs(Number(transaction.amount)),
            type: 'TRANSFER', // External transfer is a debit
            counterpartyName: transaction.receiverName || 'External Account',
            reference: transaction.reference,
            description: transaction.description || 'Transfer Successful',
            status: 'SUCCESS',
            date: new Date(),
        });
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

            // Ensure userId and walletId are not null
            if (!transaction.userId || !transaction.walletId) {
                logger.error(`Transaction ${transactionId} has no userId or walletId`);
                return;
            }

            // Import helper functions
            const { getUserPartyDetails, buildSystemPartyDetails } =
                await import('../shared/lib/utils/transaction-helpers');

            // Get party details for reversals
            const userDetails = await getUserPartyDetails(transaction.userId);
            const systemDetails = buildSystemPartyDetails();

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

                        // Sender (System reversing)
                        senderName: systemDetails.name,
                        senderAccount: systemDetails.account,
                        senderBankName: systemDetails.bankName,

                        // Receiver (User getting refund)
                        receiverName: userDetails.name,
                        receiverAccount: userDetails.account,
                        receiverBankName: userDetails.bankName,
                        receiverAvatarUrl: userDetails.avatarUrl,
                    },
                });

                await tx.wallet.update({
                    where: { id: transaction.walletId! },
                    data: { balance: { increment: Math.abs(Number(transaction.amount)) } },
                });

                // 3. Reverse Fee (if linked)
                const metadata = transaction.metadata as any;
                if (metadata?.feeTransactionId) {
                    const feeTx = await tx.transaction.findUnique({
                        where: { id: metadata.feeTransactionId },
                    });
                    if (feeTx && feeTx.walletId) {
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

                                // Sender (System reversing)
                                senderName: systemDetails.name,
                                senderAccount: systemDetails.account,
                                senderBankName: systemDetails.bankName,

                                // Receiver (User getting fee refund)
                                receiverName: userDetails.name,
                                receiverAccount: userDetails.account,
                                receiverBankName: userDetails.bankName,
                                receiverAvatarUrl: userDetails.avatarUrl,
                            },
                        });

                        await tx.wallet.update({
                            where: { id: feeTx.walletId },
                            data: { balance: { increment: Math.abs(Number(feeTx.amount)) } },
                        });
                    }
                }

                // 4. Reverse Revenue (Debit Revenue Wallet)
                if (metadata?.revenueTransactionId) {
                    const revenueTx = await tx.transaction.findUnique({
                        where: { id: metadata.revenueTransactionId },
                    });
                    if (revenueTx && revenueTx.userId && revenueTx.walletId) {
                        const revenueUserDetails = await getUserPartyDetails(revenueTx.userId);

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

                                // Sender (Revenue account being debited)
                                senderName: revenueUserDetails.name,
                                senderAccount: revenueUserDetails.account,
                                senderBankName: revenueUserDetails.bankName,
                                senderAvatarUrl: revenueUserDetails.avatarUrl,

                                // Receiver (System)
                                receiverName: systemDetails.name,
                                receiverAccount: systemDetails.account,
                                receiverBankName: systemDetails.bankName,
                            },
                        });

                        await tx.wallet.update({
                            where: { id: revenueTx.walletId },
                            data: { balance: { decrement: Math.abs(Number(revenueTx.amount)) } },
                        });
                    }
                }
            });

            // Emit Event for Failure
            eventBus.publish(EventType.TRANSACTION_FAILED, {
                userId: transaction.userId,
                amount: Math.abs(Number(transaction.amount)),
                reason: err.message || 'Transfer failed',
                reference: transaction.reference,
                description: `Transfer Failed: ${err.message}`,
                date: new Date(),
            });

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
