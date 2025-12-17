import { BaseEmailService, EmailOptions } from './base-email.service';
console.log('🔄 [DEBUG] resend-email.service.ts loading...');
import { Resend } from 'resend';
import logger from '../../utils/logger';
import { envConfig } from '../../../config/env.config';

export class ResendEmailService extends BaseEmailService {
    private resend: Resend;
    private fromEmail: string;

    constructor() {
        super();
        if (!envConfig.RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY is not defined');
        }
        this.resend = new Resend(envConfig.RESEND_API_KEY);
        this.fromEmail = envConfig.FROM_EMAIL;
        logger.info('✅ Using Resend Email Service');
    }

    async sendEmail(options: EmailOptions): Promise<void> {
        const { to, subject, html, text } = options;
        try {
            const { data, error } = await this.resend.emails.send({
                from: this.fromEmail,
                to: [to],
                subject: subject,
                html: html || text || '',
            });

            if (error) {
                logger.error(`[Resend] Failed to send email to ${to}:`, error);
                throw new Error(`Resend Error: ${error.message}`);
            }
            logger.info(`[Resend] Email sent to ${to}. ID: ${data?.id}`);
        } catch (error) {
            logger.error(`[Resend] Exception sending email to ${to}:`, error);
            throw error;
        }
    }

    async sendVerificationEmail(to: string, code: string): Promise<void> {
        const subject = 'SwapLink - Verification Code';
        const html = `
            <h2>Email Verification</h2>
            <p>Your SwapLink verification code is: <strong>${code}</strong></p>
            <p>This code is valid for 10 minutes.</p>
        `;
        return this.sendEmail({ to, subject, html });
    }

    async sendWelcomeEmail(to: string, name: string): Promise<void> {
        const subject = 'Welcome to SwapLink!';
        const html = `
            <h2>Welcome, ${name}!</h2>
            <p>Thank you for joining SwapLink.</p>
        `;
        return this.sendEmail({ to, subject, html });
    }

    async sendPasswordResetLink(email: string, resetToken: string): Promise<void> {
        const subject = 'Reset Your Password';
        const link = `${envConfig.FRONTEND_URL}/reset-password?token=${resetToken}`;
        const html = `
            <h2>Password Reset</h2>
            <p>Click here to reset your password: <a href="${link}">${link}</a></p>
        `;
        return this.sendEmail({ to: email, subject, html });
    }
}
