import { transferWorker } from './transfer.worker';
import { startReconciliationJob } from './reconciliation.job';
import logger from '../lib/utils/logger';

logger.info('🚀 Background Workers Started');

// Start Cron Jobs
startReconciliationJob();

// Keep process alive
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Closing workers...');
    await transferWorker.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received. Closing workers...');
    await transferWorker.close();
    process.exit(0);
});
