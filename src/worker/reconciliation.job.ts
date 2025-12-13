import cron from 'node-cron';
import { prisma } from '../database';
import { TransactionStatus } from '../database/generated/prisma';
import logger from '../lib/utils/logger';

/**
 * Reconciliation Job
 * Runs every 5 minutes to check for stuck PENDING transactions.
 */
export const startReconciliationJob = () => {
    cron.schedule('*/5 * * * *', async () => {
        logger.info('Running Reconciliation Job...');

        try {
            // 1. Find stuck pending transactions (older than 10 minutes)
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            const pendingTransactions = await prisma.transaction.findMany({
                where: {
                    status: TransactionStatus.PENDING,
                    createdAt: { lt: tenMinutesAgo },
                },
                include: { wallet: true },
            });

            if (pendingTransactions.length === 0) {
                logger.info('No stuck transactions found.');
                return;
            }

            logger.info(`Found ${pendingTransactions.length} stuck transactions. Processing...`);

            for (const tx of pendingTransactions) {
                try {
                    // 2. Check Status with External Provider (Mocked)
                    // In real life, we'd call the bank's "Requery" API using tx.reference
                    const isSuccess = Math.random() > 0.5; // 50/50 chance for stuck txs

                    if (isSuccess) {
                        // Mark as Success
                        await prisma.transaction.update({
                            where: { id: tx.id },
                            data: {
                                status: TransactionStatus.COMPLETED,
                                sessionId: `RECON-${Date.now()}`,
                            },
                        });
                        logger.info(`Transaction ${tx.id} reconciled: COMPLETED`);
                    } else {
                        // Mark as Failed and Refund
                        await prisma.$transaction(async prismaTx => {
                            await prismaTx.transaction.update({
                                where: { id: tx.id },
                                data: {
                                    status: TransactionStatus.FAILED,
                                    metadata: {
                                        ...(tx.metadata as object),
                                        failureReason: 'Reconciliation failed',
                                    },
                                },
                            });

                            await prismaTx.wallet.update({
                                where: { id: tx.walletId },
                                data: { balance: { increment: Math.abs(tx.amount) } },
                            });
                        });
                        logger.info(`Transaction ${tx.id} reconciled: FAILED (Refunded)`);
                    }
                } catch (error) {
                    logger.error(`Failed to reconcile transaction ${tx.id}`, error);
                }
            }
        } catch (error) {
            logger.error('Error in Reconciliation Job', error);
        }
    });
};
