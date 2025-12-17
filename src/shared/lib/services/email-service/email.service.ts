console.log('🔄 [DEBUG] email.service.ts loading...');
import { BaseEmailService } from './base-email.service';
import { ResendEmailService } from './resend-email.service';
import { LocalEmailService } from './local-email.service';
import { envConfig } from '../../../config/env.config';
import logger from '../../utils/logger';

export class EmailServiceFactory {
    static create(): BaseEmailService {
        // 1. Try to use Resend if configured and in production (or forced)
        if (envConfig.RESEND_API_KEY) {
            try {
                return new ResendEmailService();
            } catch (error) {
                logger.error(
                    'Failed to initialize ResendEmailService, falling back to LocalEmailService',
                    error
                );
            }
        }

        // 2. Fallback to LocalEmailService (Logs to console)
        return new LocalEmailService();
    }
}

export const emailService = EmailServiceFactory.create();
