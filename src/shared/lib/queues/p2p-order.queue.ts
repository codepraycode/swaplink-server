import { getP2POrderQueue } from '../init/service-initializer';

export const P2P_ORDER_QUEUE_NAME = 'p2p-order-queue';

/**
 * Get the P2P Order Queue instance
 * @throws Error if queue is not initialized
 */
export const getQueue = getP2POrderQueue;
