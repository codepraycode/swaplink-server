import { Worker } from 'bullmq';
import { redisConnection } from '../shared/config/redis.config';
import { globusService } from '../shared/lib/services/banking/globus.service';
import { prisma } from '../shared/database';
import logger from '../shared/lib/utils/logger';
import { socketService } from '../shared/lib/services/socket.service';
import { BANKING_QUEUE_NAME } from '../shared/lib/queues/banking.queue';

interface CreateAccountJob {
    userId: string;
    walletId: string;
}

export const bankingWorker = new Worker<CreateAccountJob>(
    BANKING_QUEUE_NAME,
    async job => {
        const { userId, walletId } = job.data;
        logger.info(`🏦 [BankingWorker] Processing account creation for User: ${userId}`);

        try {
            // 1. Fetch User
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                logger.error(`❌ User ${userId} not found`);
                return;
            }

            // 2. Call Bank API (Globus)
            if (!user.email || !user.phone) {
                logger.error(`❌ User ${userId} missing email or phone`);
                return;
            }
            const bankDetails = await globusService.generateNuban({
                ...user,
                email: user.email,
                phone: user.phone,
            });

            // 3. Update Database (Create VirtualAccount)
            await prisma.virtualAccount.create({
                data: {
                    walletId: walletId,
                    accountNumber: bankDetails.accountNumber,
                    accountName: bankDetails.accountName,
                    bankName: bankDetails.bankName,
                    provider: bankDetails.provider,
                },
            });

            logger.info(`✅ [BankingWorker] Virtual Account Created: ${bankDetails.accountNumber}`);

            // Emit Socket Event
            socketService.emitToUser(userId, 'WALLET_UPDATED', {
                virtualAccount: {
                    accountNumber: bankDetails.accountNumber,
                    bankName: bankDetails.bankName,
                    accountName: bankDetails.accountName,
                },
            });
        } catch (error) {
            logger.error(`❌ [BankingWorker] Failed for User ${userId}`, error);
            throw error; // Triggers retry
        }
    },
    {
        connection: redisConnection,
        concurrency: 5, // Process 5 jobs at a time (Rate Limiting)
        limiter: {
            max: 10,
            duration: 1000, // Max 10 jobs per second (Globus API limit)
        },
    }
);

// Handle Worker Errors
bankingWorker.on('failed', (job, err) => {
    logger.error(
        `🔥 [BankingWorker] Job ${job?.id} failed attempt ${job?.attemptsMade}: ${err.message}`
    );

    // Check if this was the last attempt (Dead Letter Logic)
    if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
        logger.error(
            `💀 [DEAD LETTER] Job ${job.id} permanently failed. Manual intervention required.`
        );
        logger.error(`💀 Payload: ${JSON.stringify(job.data)}`);
    }
});
