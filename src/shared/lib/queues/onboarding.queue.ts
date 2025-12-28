import { getOnboardingQueue } from '../init/service-initializer';

export const ONBOARDING_QUEUE_NAME = 'onboarding-queue';

/**
 * Get the Onboarding Queue instance
 * @throws Error if queue is not initialized
 */
export const getQueue = getOnboardingQueue;

export interface SetupWalletJob {
    userId: string;
}
