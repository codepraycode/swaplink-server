import { Queue } from 'bullmq';
console.log('🔄 [DEBUG] onboarding.queue.ts loading...');
import { envConfig } from '../../config/env.config';
import { redisConnection } from '../../config/redis.config';

export const ONBOARDING_QUEUE_NAME = 'onboarding-queue';

export const onboardingQueue = new Queue(ONBOARDING_QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: true,
    },
});

export interface SetupWalletJob {
    userId: string;
}
