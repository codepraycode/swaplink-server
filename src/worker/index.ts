import { transferWorker } from './transfer.worker';
import { bankingWorker } from './banking.worker';
import { onboardingWorker } from './onboarding.worker';
import { notificationWorker } from './notification.worker';
import { startReconciliationJob } from './reconciliation.job';
import logger from '../shared/lib/utils/logger';

logger.info('🚀 Background Workers Started');

// Start Cron Jobs
startReconciliationJob();

// Keep process alive
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Closing workers...');
    await Promise.all([
        transferWorker.close(),
        bankingWorker.close(),
        onboardingWorker.close(),
        notificationWorker.close(),
    ]);
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received. Closing workers...');
    await Promise.all([
        transferWorker.close(),
        bankingWorker.close(),
        onboardingWorker.close(),
        notificationWorker.close(),
    ]);
    process.exit(0);
});
