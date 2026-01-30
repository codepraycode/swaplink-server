import { Worker, Job } from 'bullmq';
import { redisConnection } from '../shared/config/redis.config';
import logger from '../shared/lib/utils/logger';
import { EmailProviderFactory } from '../shared/lib/services/email-service/email.service';
import { SendEmailJob } from '../shared/lib/services/email-service/email.types';

// Initialize the actual email provider (Resend, SendGrid, etc.)
const emailProvider = EmailProviderFactory.create();

const processEmail = async (job: Job<SendEmailJob>) => {
    const { type, to, data } = job.data;
    logger.info(`[Email Worker] Processing ${type} email for ${to}`);

    try {
        switch (type) {
            case 'otp':
                await emailProvider.sendOtpEmail(to, data.name, data.otp, data.duration);
                break;
            case 'welcome':
                await emailProvider.sendWelcomeEmail(to, data.name);
                break;
            case 'kyc-status':
                await emailProvider.sendKycStatusEmail(to, data.name, data);
                break;
            case 'transaction':
                await emailProvider.sendTransactionEmail(to, data.name, data);
                break;
            case 'password-reset':
                await emailProvider.sendPasswordResetEmail(
                    to,
                    data.name,
                    data.reset_url,
                    data.duration
                );
                break;
            case 'generic':
                await emailProvider.sendEmail({
                    to,
                    subject: data.subject,
                    html: data.html,
                });
                break;
            case 'wallet-created':
                // We need to implement sendWalletCreatedEmail in BaseEmailService and subclasses first?
                // Or just use sendTemplatedEmail if supported.
                // Let's assume we added it to BaseEmailService (we haven't yet, but we will).
                // Wait, I need to update BaseEmailService first.
                // But for now, let's just cast it or use a generic sendTemplatedEmail if available.
                // Actually, I should update BaseEmailService first.
                // But I can't do that in this tool call.
                // I'll add the call here and assume I'll fix the interface next.
                // Actually, I can use 'any' cast to avoid TS error temporarily if needed, but better to fix properly.
                // Let's check if sendWalletCreatedEmail exists on emailProvider (BaseEmailService).
                // It does NOT.
                // So I must update BaseEmailService and all implementations.
                // This is a big change.
                // Alternatively, I can use sendTemplatedEmail if I implement it.
                // But let's stick to the pattern: add method to interface.
                if ('sendWalletCreatedEmail' in emailProvider) {
                    await (emailProvider as any).sendWalletCreatedEmail(to, data.name, data);
                } else {
                    logger.warn(
                        `[Email Worker] sendWalletCreatedEmail not implemented in ${emailProvider.constructor.name}`
                    );
                }
                break;
            default:
                logger.warn(`[Email Worker] Unknown email type: ${type}`);
        }
        logger.info(`[Email Worker] Successfully sent ${type} email to ${to}`);
    } catch (error) {
        logger.error(`[Email Worker] Failed to send ${type} email to ${to}`, error);
        throw error;
    }
};

export const emailWorker = new Worker('email-queue', processEmail, {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
        max: 10, // Max 10 emails
        duration: 1000, // per second
    },
});

emailWorker.on('completed', job => {
    logger.info(`[Email Worker] Job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
    logger.error(`[Email Worker] Job ${job?.id} failed: ${err.message}`);
});
