import cron from 'node-cron';
import { prisma, TransactionStatus } from '../shared/database';
import logger from '../shared/lib/utils/logger';
import { globusService } from '../shared/lib/services/banking/globus.service';

/**
 * 1. Stuck Transaction Requery (Every 5 minutes)
 * Checks for PENDING transactions older than 10 minutes.
 */
const startTransactionReconciliation = () => {
    cron.schedule('*/5 * * * *', async () => {
        logger.info('Running Stuck Transaction Reconciliation...');

        try {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            const pendingTransactions = await prisma.transaction.findMany({
                where: {
                    status: TransactionStatus.PENDING,
                    createdAt: { lt: tenMinutesAgo },
                },
                include: { wallet: true },
            });

            if (pendingTransactions.length === 0) return;

            logger.info(`Found ${pendingTransactions.length} stuck transactions.`);

            for (const tx of pendingTransactions) {
                try {
                    // Call Globus Requery
                    const statusResponse = await globusService.getTransactionStatus(tx.reference);

                    if (
                        statusResponse.status === 'COMPLETED' ||
                        statusResponse.status === 'SUCCESSFUL'
                    ) {
                        // Mark as Success
                        await prisma.transaction.update({
                            where: { id: tx.id },
                            data: {
                                status: TransactionStatus.COMPLETED,
                                sessionId: statusResponse.sessionId || `RECON-${Date.now()}`,
                            },
                        });
                        logger.info(`Transaction ${tx.id} reconciled: COMPLETED`);
                    } else if (statusResponse.status === 'FAILED') {
                        // Mark as Failed and Refund
                        await prisma.$transaction(async prismaTx => {
                            await prismaTx.transaction.update({
                                where: { id: tx.id },
                                data: {
                                    status: TransactionStatus.FAILED,
                                    metadata: {
                                        ...(tx.metadata as object),
                                        failureReason: 'Reconciliation: Provider Failed',
                                    },
                                },
                            });

                            await prismaTx.wallet.update({
                                where: { id: tx.walletId },
                                data: { balance: { increment: Math.abs(Number(tx.amount)) } },
                            });
                        });
                        logger.info(`Transaction ${tx.id} reconciled: FAILED (Refunded)`);
                    } else {
                        logger.info(`Transaction ${tx.id} still PENDING at provider.`);
                    }
                } catch (error) {
                    logger.error(`Failed to reconcile transaction ${tx.id}`, error);
                }
            }
        } catch (error) {
            logger.error('Error in Stuck Transaction Reconciliation', error);
        }
    });
};

/**
 * 2. Daily Reconciliation (Every day at 00:00)
 * Compares Globus Statement with Local Transactions.
 */
const startDailyReconciliation = () => {
    cron.schedule('0 0 * * *', async () => {
        logger.info('Running Daily Reconciliation...');

        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Fetch External Statement
            const statement = await globusService.getStatement(yesterday, today);

            // Fetch Local Transactions for the same period
            const localTransactions = await prisma.transaction.findMany({
                where: {
                    createdAt: { gte: yesterday, lt: today },
                    status: TransactionStatus.COMPLETED,
                },
            });

            // Compare
            // This is a simplified logic. In reality, we match by Reference or Session ID.
            const localTotal = localTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

            // Mock statement structure for now since getStatement returns any
            const externalTotal = statement.reduce(
                (sum: number, tx: any) => sum + Number(tx.amount),
                0
            );

            if (Math.abs(localTotal - externalTotal) > 1) {
                // Allow small float diff
                logger.error(
                    `🚨 DISCREPANCY DETECTED! Local: ${localTotal}, External: ${externalTotal}`
                );
                // TODO: Create AlertLog or Notify Admin
            } else {
                logger.info('Daily Reconciliation Successful: No discrepancies.');
            }
        } catch (error) {
            logger.error('Error in Daily Reconciliation', error);
        }
    });
};

export const startReconciliationJob = () => {
    startTransactionReconciliation();
    startDailyReconciliation();
};
