import { getBankingQueue } from '../init/service-initializer';

export const BANKING_QUEUE_NAME = 'banking-queue';

/**
 * Get the Banking Queue instance
 * @throws Error if queue is not initialized
 */
export const getQueue = getBankingQueue;

export interface CreateAccountJob {
    userId: string;
    walletId: string;
}
