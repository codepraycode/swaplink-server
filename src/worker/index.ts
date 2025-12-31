import { transferWorker } from './transfer.worker';
import { bankingWorker } from './banking.worker';
import { onboardingWorker } from './onboarding.worker';
import { notificationWorker } from './notification.worker';
import { p2pOrderWorker } from './p2p-order.worker';
import { kycWorker } from './kyc.worker';
import { p2pAdCleanupWorker } from './p2p-ad-cleanup.worker';
import { startReconciliationJob } from './reconciliation.job';
import { initializeQueues, closeQueues } from '../shared/lib/init/service-initializer';
import logger from '../shared/lib/utils/logger';

/**
 * Initialize and start all background workers
 */
async function startWorkers() {
    try {
        logger.info('🔄 Initializing worker services...');

        // Initialize all queues first
        await initializeQueues();

        logger.info('🚀 Background Workers Started');

        // Start Cron Jobs
        startReconciliationJob();
    } catch (error) {
        logger.error('❌ Failed to start workers:', error);
        process.exit(1);
    }
}

// Start the workers
startWorkers();

// Keep process alive
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Closing workers and queues...');
    await Promise.all([
        transferWorker.close(),
        bankingWorker.close(),
        onboardingWorker.close(),
        notificationWorker.close(),
        p2pOrderWorker.close(),
        kycWorker.close(),
        p2pAdCleanupWorker.close(),
        closeQueues(),
    ]);
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received. Closing workers and queues...');
    await Promise.all([
        transferWorker.close(),
        bankingWorker.close(),
        onboardingWorker.close(),
        notificationWorker.close(),
        p2pOrderWorker.close(),
        kycWorker.close(),
        p2pAdCleanupWorker.close(),
        closeQueues(),
    ]);
    process.exit(0);
});
