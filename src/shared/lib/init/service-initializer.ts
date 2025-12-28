import { Queue } from 'bullmq';
import { redisConnection } from '../../config/redis.config';
import logger from '../utils/logger';
import {
    setupAuthListeners,
    setupTransactionListeners,
    setupAuditListeners,
} from '../events/listeners';
import { setupKycTransactionListeners } from '../events/listeners/kyc-transaction.listener';
import { setupKycListeners } from '../events/listeners/kyc.listener';

/**
 * Service Initializer
 *
 * Centralized initialization for all services that require async setup.
 * This prevents top-level module initialization issues and provides
 * better error handling and logging.
 */

// Queue instances (initialized lazily)
let onboardingQueue: Queue | null = null;
let transferQueue: Queue | null = null;
let bankingQueue: Queue | null = null;
let p2pOrderQueue: Queue | null = null;
let notificationQueue: Queue | null = null;

/**
 * Initialize all BullMQ queues
 */
export async function initializeQueues(): Promise<void> {
    logger.info('🔄 Initializing BullMQ queues...');

    try {
        // Onboarding Queue
        logger.debug('  → Initializing Onboarding Queue...');
        onboardingQueue = new Queue('onboarding-queue', {
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
        logger.info('  ✅ Onboarding Queue initialized');

        // Transfer Queue
        logger.debug('  → Initializing Transfer Queue...');
        transferQueue = new Queue('transfer-queue', {
            connection: redisConnection,
            defaultJobOptions: {
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: {
                    count: 100,
                    age: 3600,
                },
                removeOnFail: {
                    count: 500,
                },
            },
        });
        logger.info('  ✅ Transfer Queue initialized');

        // Banking Queue
        logger.debug('  → Initializing Banking Queue...');
        bankingQueue = new Queue('banking-queue', {
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
        logger.info('  ✅ Banking Queue initialized');

        // P2P Order Queue
        logger.debug('  → Initializing P2P Order Queue...');
        p2pOrderQueue = new Queue('p2p-order-queue', {
            connection: redisConnection,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: true,
                removeOnFail: false,
            },
        });
        logger.info('  ✅ P2P Order Queue initialized');

        // Notification Queue
        logger.debug('  → Initializing Notification Queue...');
        notificationQueue = new Queue('notification-queue', {
            connection: redisConnection,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: true,
            },
        });
        logger.info('  ✅ Notification Queue initialized');

        logger.info('✅ All queues initialized successfully');
    } catch (error) {
        logger.error('❌ Failed to initialize queues:', error);
        throw new Error(
            `Queue initialization failed: ${
                error instanceof Error ? error.message : 'Unknown error'
            }`
        );
    }
}

/**
 *  Initialize Listeners
 */

export async function initializeListeners(): Promise<void> {
    logger.info('🔄 Initializing listeners...');

    setupAuthListeners();
    setupTransactionListeners();
    setupAuditListeners();
    setupKycTransactionListeners();
    setupKycListeners();

    logger.info('✅ All listeners initialized successfully');
}

/**
 * Get Onboarding Queue instance
 * @throws Error if queue is not initialized
 */
export function getOnboardingQueue(): Queue {
    if (!onboardingQueue) {
        throw new Error('Onboarding Queue not initialized. Call initializeQueues() first.');
    }
    return onboardingQueue;
}

/**
 * Get Transfer Queue instance
 * @throws Error if queue is not initialized
 */
export function getTransferQueue(): Queue {
    if (!transferQueue) {
        throw new Error('Transfer Queue not initialized. Call initializeQueues() first.');
    }
    return transferQueue;
}

/**
 * Get Banking Queue instance
 * @throws Error if queue is not initialized
 */
export function getBankingQueue(): Queue {
    if (!bankingQueue) {
        throw new Error('Banking Queue not initialized. Call initializeQueues() first.');
    }
    return bankingQueue;
}

/**
 * Get P2P Order Queue instance
 * @throws Error if queue is not initialized
 */
export function getP2POrderQueue(): Queue {
    if (!p2pOrderQueue) {
        throw new Error('P2P Order Queue not initialized. Call initializeQueues() first.');
    }
    return p2pOrderQueue;
}

/**
 * Get Notification Queue instance
 * @throws Error if queue is not initialized
 */
export function getNotificationQueue(): Queue {
    if (!notificationQueue) {
        throw new Error('Notification Queue not initialized. Call initializeQueues() first.');
    }
    return notificationQueue;
}

/**
 * Gracefully close all queues
 */
export async function closeQueues(): Promise<void> {
    logger.info('🔄 Closing all queues...');

    const closePromises: Promise<void>[] = [];

    if (onboardingQueue) {
        closePromises.push(onboardingQueue.close());
    }
    if (transferQueue) {
        closePromises.push(transferQueue.close());
    }
    if (bankingQueue) {
        closePromises.push(bankingQueue.close());
    }
    if (p2pOrderQueue) {
        closePromises.push(p2pOrderQueue.close());
    }
    if (notificationQueue) {
        closePromises.push(notificationQueue.close());
    }

    await Promise.all(closePromises);
    logger.info('✅ All queues closed');
}
