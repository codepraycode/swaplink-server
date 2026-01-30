import { BaseEmailService, EmailOptions } from './base-email.service';
import { ResendEmailService } from './resend-email.service';
import { SendGridEmailService } from './sendgrid-email.service';
import { MailtrapEmailService } from './mailtrap-email.service';
import { LocalEmailService } from './local-email.service';
import { envConfig } from '../../../config/env.config';
import logger from '../../utils/logger';
import { getEmailQueue } from '../../init/service-initializer';
import {
    KycEmailStatus,
    TemplatedEmailOptions,
    TransactionEmailData,
    SendEmailJob,
    WalletEmailData,
} from './email.types';

export class EmailProviderFactory {
    static create(): BaseEmailService {
        const isProduction = envConfig.NODE_ENV === 'production';
        const isStaging = process.env.STAGING === 'true' || envConfig.NODE_ENV === 'staging';

        // 1. Production/Staging: Use Resend if configured (Primary choice)
        if ((isProduction || isStaging) && envConfig.RESEND_API_KEY) {
            try {
                const mode = isProduction && !isStaging ? 'Production' : 'Staging';
                logger.info(`🚀 ${mode} mode: Initializing Resend Email Service`);
                return new ResendEmailService();
            } catch (error) {
                logger.error('Failed to initialize ResendEmailService, trying SendGrid...', error);
            }
        }

        // 2. Fallback: Use SendGrid if Resend is not available
        if ((isProduction || isStaging) && envConfig.SENDGRID_API_KEY) {
            try {
                logger.info('🧪 Fallback: Initializing SendGrid Email Service');
                return new SendGridEmailService();
            } catch (error) {
                logger.error(
                    'Failed to initialize SendGridEmailService, trying Mailtrap...',
                    error
                );
            }
        }

        // 3. Staging Fallback: Use Mailtrap if neither Resend nor SendGrid is configured
        if (isStaging && envConfig.MAILTRAP_API_TOKEN) {
            try {
                logger.info('🧪 Staging mode: Initializing Mailtrap Email Service (API)');
                return new MailtrapEmailService();
            } catch (error) {
                logger.error(
                    'Failed to initialize MailtrapEmailService, falling back to LocalEmailService',
                    error
                );
            }
        }

        // 4. Development/Fallback: Use LocalEmailService (Logs to console)
        logger.info('💻 Development mode: Using Local Email Service (console logging)');
        return new LocalEmailService();
    }
}

/**
 * Queue-based Email Service
 *
 * Instead of sending emails directly, this service adds them to a queue.
 * The EmailWorker then processes the queue and sends the actual email.
 */
class QueueEmailService extends BaseEmailService {
    async sendEmail(options: EmailOptions): Promise<void> {
        await this.addToQueue({
            type: 'generic',
            to: options.to,
            data: {
                subject: options.subject,
                html: options.html || options.text || '',
            },
        });
    }

    async sendTemplatedEmail(_options: TemplatedEmailOptions): Promise<void> {
        // Not used directly usually
    }

    async sendVerificationEmail(to: string, code: string): Promise<void> {
        await this.addToQueue({
            type: 'otp',
            to,
            data: { name: 'User', otp: code, duration: 10 },
        });
    }

    async sendWelcomeEmail(to: string, name: string): Promise<void> {
        await this.addToQueue({
            type: 'welcome',
            to,
            data: { name, login_url: `#` },
        });
    }

    async sendPasswordResetLink(email: string, resetToken: string): Promise<void> {
        await this.addToQueue({
            type: 'password-reset',
            to: email,
            data: {
                name: 'User',
                reset_url: `#`,
                duration: 30,
            },
        });
    }

    async sendVerificationSuccessEmail(_to: string, _name: string): Promise<void> {
        // Deprecated or map to welcome?
    }

    async sendOtpEmail(to: string, name: string, otp: string, duration: number): Promise<void> {
        await this.addToQueue({
            type: 'otp',
            to,
            data: { name, otp, duration },
        });
    }

    async sendKycStatusEmail(to: string, name: string, status: KycEmailStatus): Promise<void> {
        await this.addToQueue({
            type: 'kyc-status',
            to,
            data: { name, ...status },
        });
    }

    async sendTransactionEmail(
        to: string,
        name: string,
        data: TransactionEmailData
    ): Promise<void> {
        await this.addToQueue({
            type: 'transaction',
            to,
            data: { name, ...data },
        });
    }

    async sendPasswordResetEmail(
        to: string,
        name: string,
        resetUrl: string,
        duration: number
    ): Promise<void> {
        // This seems to be the one we want to align with OTPs if possible,
        // but if the caller passes a URL, we might be stuck.
        // However, looking at auth.service, it uses sendOtpEmail.
        // So this might be unused.
        await this.addToQueue({
            type: 'password-reset',
            to,
            data: { name, reset_url: '#', duration, otp: 'CODE' }, // Placeholder
        });
    }

    async sendWalletCreatedEmail(to: string, name: string, data: WalletEmailData): Promise<void> {
        await this.addToQueue({
            type: 'wallet-created',
            to,
            data: { name, ...data },
        });
    }

    private async addToQueue(job: SendEmailJob) {
        try {
            const queue = getEmailQueue();
            await queue.add('send-email', job);
            logger.info(`📧 Queued ${job.type} email for ${job.to}`);
        } catch (error) {
            logger.error(`Failed to queue email for ${job.to}`, error);
            // Fallback: Try to send directly if queue fails?
            // Or just throw to let caller know.
            // For now, we log and maybe throw.
            throw error;
        }
    }
}

export const emailService = new QueueEmailService();
