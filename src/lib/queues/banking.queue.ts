import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../../config/redis.config';
import { globusService } from '../integrations/banking/globus.service';
import { prisma } from '../../database';
import logger from '../utils/logger';
import { socketService } from '../services/socket.service';

// 1. Define Queue Name
export const BANKING_QUEUE_NAME = 'banking-queue';

// 2. Create Producer (Queue)
export const bankingQueue = new Queue(BANKING_QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000, // 5s, 10s, 20s...
        },
        removeOnComplete: true,
    },
});

// 3. Define Job Data Interface
interface CreateAccountJob {
    userId: string;
    walletId: string;
}

// 4. Create Consumer (Worker)
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
            const bankDetails = await globusService.createAccount(user);

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
    logger.error(`🔥 [BankingWorker] Job ${job?.id} failed: ${err.message}`);
});
