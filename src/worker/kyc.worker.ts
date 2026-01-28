import { Worker, Job } from 'bullmq';
import { redisConnection } from '../shared/config/redis.config';
import logger from '../shared/lib/utils/logger';
import { LocalKYCService } from '../api/modules/account/kyc/local-kyc.service';
import { eventBus, EventType } from '../shared/lib/events/event-bus';
import { prisma, KycDocumentStatus, KycLevel, KycStatus } from '../shared/database';

const kycService = new LocalKYCService();

export const kycWorker = new Worker(
    'kyc-verification',
    async (job: Job) => {
        logger.info(`[KYC Worker] Processing job ${job.id} for user ${job.data.userId}`);
        const { userId, documentType, documentUrl, kycDocumentId, frontUrl, backUrl, selfieUrl } =
            job.data;

        // Handle unified job which sends frontUrl instead of documentUrl
        const isUnified = !!frontUrl;
        let result;

        try {
            if (isUnified) {
                // 1a. Call Unified Verification Service
                result = await kycService.verifyUnified(userId, {
                    frontUrl,
                    backUrl, // Can be undefined, that's fine
                    selfieUrl,
                    documentType,
                });
            } else {
                // 1b. Call Legacy/Single Document Verification
                if (!documentUrl) {
                    throw new Error(`No document URL provided for job ${job.id}`);
                }
                result = await kycService.verifyDocument(userId, documentType, documentUrl);
            }

            if (result.success) {
                logger.info(`[KYC Worker] Verification successful for user ${userId}`);

                // 2. Update Database
                await prisma.kycDocument.update({
                    where: { id: kycDocumentId },
                    data: {
                        status: KycDocumentStatus.APPROVED,
                        metadata: result.data,
                    },
                });

                // 3. Upgrade User to FULL
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        kycLevel: KycLevel.FULL,
                        kycStatus: KycStatus.APPROVED,
                    },
                });

                // Emit socket event
                eventBus.publish(EventType.KYC_APPROVED, {
                    userId,
                    level: KycLevel.FULL,
                    timestamp: new Date(),
                });
            } else {
                logger.warn(`[KYC Worker] Verification failed for user ${userId}`);
                await prisma.kycDocument.update({
                    where: { id: kycDocumentId },
                    data: {
                        status: KycDocumentStatus.REJECTED,
                        rejectionReason: result.error || 'Verification failed',
                    },
                });

                // Update user status to REJECTED
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        kycStatus: KycStatus.REJECTED,
                    },
                });

                eventBus.publish(EventType.KYC_REJECTED, {
                    userId,
                    reason: result.error || 'Verification failed',
                    timestamp: new Date(),
                });
            }
        } catch (error) {
            logger.error(`[KYC Worker] Job failed:`, error);
            throw error;
        }
    },
    {
        connection: redisConnection,
        concurrency: 5,
    }
);

kycWorker.on('completed', job => {
    logger.info(`[KYC Worker] Job ${job.id} completed`);
});

kycWorker.on('failed', (job, err) => {
    logger.error(`[KYC Worker] Job ${job?.id} failed: ${err.message}`);
});
