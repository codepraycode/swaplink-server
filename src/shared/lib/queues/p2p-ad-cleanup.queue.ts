import { getP2PAdCleanupQueue } from '../init/service-initializer';

export const P2P_AD_CLEANUP_QUEUE_NAME = 'p2p-ad-cleanup-queue';

/**
 * Get the P2P Ad Cleanup Queue instance
 * @throws Error if queue is not initialized
 */
export const getQueue = getP2PAdCleanupQueue;
