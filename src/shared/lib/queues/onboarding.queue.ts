import { Queue } from 'bullmq';
console.log('🔄 [DEBUG] onboarding.queue.ts loading...');
import { envConfig } from '../../config/env.config';
import { redisConnection } from '../../config/redis.config';

export const ONBOARDING_QUEUE_NAME = 'onboarding-queue';

let onboardingQueueInstance: Queue;

try {
    console.log('🔄 [DEBUG] Initializing Onboarding Queue...');
    onboardingQueueInstance = new Queue(ONBOARDING_QUEUE_NAME, {
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
    console.log('✅ [DEBUG] Onboarding Queue initialized');
} catch (error) {
    console.error('❌ [DEBUG] Failed to initialize Onboarding Queue:', error);
    // Fallback or rethrow depending on severity. For now, let's rethrow to see the error.
    throw error;
}

export const onboardingQueue = onboardingQueueInstance;

export interface SetupWalletJob {
    userId: string;
}
