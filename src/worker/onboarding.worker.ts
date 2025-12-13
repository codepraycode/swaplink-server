import { Worker } from 'bullmq';
import { redisConnection } from '../shared/config/redis.config';
import { prisma } from '../shared/database';
import logger from '../shared/lib/utils/logger';
import walletService from '../shared/lib/services/wallet.service';
import { bankingQueue } from '../shared/lib/queues/banking.queue';
import { ONBOARDING_QUEUE_NAME, SetupWalletJob } from '../shared/lib/queues/onboarding.queue';

export const onboardingWorker = new Worker<SetupWalletJob>(
    ONBOARDING_QUEUE_NAME,
    async job => {
        const { userId } = job.data;
        logger.info(`🚀 [OnboardingWorker] Setting up wallet for User: ${userId}`);

        try {
            // 1. Create Wallet (Idempotent check inside service ideally, or here)
            // We use a transaction to ensure consistency if we were doing more,
            // but walletService.setUpWallet is self-contained.
            // However, we need the walletId to trigger the next step.

            // Check if wallet already exists to be safe (Idempotency)
            let wallet = await prisma.wallet.findUnique({ where: { userId } });

            if (!wallet) {
                // We need a transaction client for setUpWallet as per its signature,
                // but it might be better to allow it to run without one or pass prisma.
                // Let's check walletService signature. It expects a tx.
                // We'll wrap in a transaction.
                wallet = await prisma.$transaction(async tx => {
                    return await walletService.setUpWallet(userId, tx);
                });
                logger.info(`✅ [OnboardingWorker] Wallet created for User: ${userId}`);
            } else {
                logger.info(`ℹ️ [OnboardingWorker] Wallet already exists for User: ${userId}`);
            }

            // 2. Trigger Virtual Account Creation (Chain the job)
            await bankingQueue.add('create-virtual-account', {
                userId: userId,
                walletId: wallet.id,
            });

            logger.info(
                `➡️ [OnboardingWorker] Triggered Virtual Account creation for User: ${userId}`
            );
        } catch (error) {
            logger.error(`❌ [OnboardingWorker] Failed setup for User ${userId}`, error);
            throw error;
        }
    },
    {
        connection: redisConnection,
        concurrency: 10,
    }
);

onboardingWorker.on('failed', (job, err) => {
    logger.error(`🔥 [OnboardingWorker] Job ${job?.id} failed: ${err.message}`);
});
