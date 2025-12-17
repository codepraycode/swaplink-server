import { BaseEmailService, EmailOptions } from './base-email.service';
import logger from '../../utils/logger';

export class LocalEmailService extends BaseEmailService {
    constructor() {
        super();
        logger.info('ℹ️ Using Local Email Service (Logging only)');
    }

    async sendEmail(options: EmailOptions): Promise<void> {
        const { to, subject, text, html } = options;
        logger.info('═══════════════════════════════════════');
        logger.info(`📧 [LocalEmailService] Email to ${to}`);
        logger.info(`📝 Subject: ${subject}`);
        if (text) logger.info(`📄 Text Body: ${text}`);
        if (html) logger.info(`🌐 HTML Body (truncated): ${html.substring(0, 100)}...`);
        logger.info('═══════════════════════════════════════');
    }

    async sendVerificationEmail(to: string, code: string): Promise<void> {
        logger.info('═══════════════════════════════════════');
        logger.info(`📧 [LocalEmailService] VERIFICATION EMAIL for ${to}`);
        logger.info(`🔑 CODE: ${code}`);
        logger.info('═══════════════════════════════════════');
    }

    async sendWelcomeEmail(to: string, name: string): Promise<void> {
        logger.info('═══════════════════════════════════════');
        logger.info(`📧 [LocalEmailService] WELCOME EMAIL for ${to}`);
        logger.info(`👋 Name: ${name}`);
        logger.info('═══════════════════════════════════════');
    }

    async sendPasswordResetLink(email: string, resetToken: string): Promise<void> {
        logger.info('═══════════════════════════════════════');
        logger.info(`📧 [LocalEmailService] PASSWORD RESET for ${email}`);
        logger.info(`🔑 Token: ${resetToken}`);
        logger.info('═══════════════════════════════════════');
    }
}
