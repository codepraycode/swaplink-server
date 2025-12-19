import { BaseEmailService } from './base-email.service';
import { ResendEmailService } from './resend-email.service';
import { SendGridEmailService } from './sendgrid-email.service';
import { MailtrapEmailService } from './mailtrap-email.service';
import { LocalEmailService } from './local-email.service';
import { envConfig } from '../../../config/env.config';
import logger from '../../utils/logger';

export class EmailServiceFactory {
    static create(): BaseEmailService {
        const isProduction = envConfig.NODE_ENV === 'production';
        const isStaging = process.env.STAGING === 'true' || envConfig.NODE_ENV === 'staging';

        // 1. Production: Use Resend if configured
        // if (isProduction && !isStaging && envConfig.RESEND_API_KEY) {
        //     try {
        //         logger.info('🚀 Production mode: Initializing Resend Email Service');
        //         return new ResendEmailService();
        //     } catch (error) {
        //         logger.error(
        //             'Failed to initialize ResendEmailService, falling back to LocalEmailService',
        //             error
        //         );
        //     }
        // }

        // 2. Staging: Use SendGrid if configured (preferred for cloud deployments)
        // if (isStaging && envConfig.SENDGRID_API_KEY) {
        //     try {
        //         logger.info('🧪 Staging mode: Initializing SendGrid Email Service');
        //         return new SendGridEmailService();
        //     } catch (error) {
        //         logger.error(
        //             'Failed to initialize SendGridEmailService, trying Mailtrap...',
        //             error
        //         );
        //     }
        // }

        // 3. Staging Fallback: Use Mailtrap if SendGrid is not configured
        // if (isStaging && envConfig.MAILTRAP_API_TOKEN) {
        //     try {
        //         logger.info('🧪 Staging mode: Initializing Mailtrap Email Service (API)');
        //         return new MailtrapEmailService();
        //     } catch (error) {
        //         logger.error(
        //             'Failed to initialize MailtrapEmailService, falling back to LocalEmailService',
        //             error
        //         );
        //     }
        // }

        // 3. Development/Fallback: Use LocalEmailService (Logs to console)
        logger.info('💻 Development mode: Using Local Email Service (console logging)');
        return new LocalEmailService();
    }
}

export const emailService = EmailServiceFactory.create();
