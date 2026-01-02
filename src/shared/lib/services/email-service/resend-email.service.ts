import { BaseEmailService, EmailOptions } from './base-email.service';
import { Resend } from 'resend';
import logger from '../../utils/logger';
import { envConfig } from '../../../config/env.config';
import { BadGatewayError } from '../../utils/api-error';

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
        logger.info(`📧 FROM_EMAIL configured as: ${this.fromEmail}`);

        // Warn if using a custom domain that might not be verified
        if (!this.fromEmail.endsWith('@resend.dev')) {
            logger.warn(
                '⚠️  Using custom domain email. Ensure your domain is verified in Resend dashboard: https://resend.com/domains'
            );
            logger.warn(
                '💡 For testing without domain verification, use: FROM_EMAIL=onboarding@resend.dev'
            );
        }
    }

    async sendEmail(options: EmailOptions): Promise<void> {
        const { to, subject, html, text } = options;
        try {
            logger.info(`[Resend] Attempting to send email to ${to} from ${this.fromEmail}`);

            const { data, error } = await this.resend.emails.send({
                from: this.fromEmail,
                to: [to],
                subject: subject,
                html: html || text || '',
            });

            if (error) {
                logger.error(`[Resend] Failed to send email to ${to}:`, error);

                // Provide helpful error messages
                if (error.message?.includes('domain')) {
                    logger.error(
                        '❌ Domain verification issue. Please verify your domain at https://resend.com/domains ' +
                            'or use FROM_EMAIL=onboarding@resend.dev for testing'
                    );
                }

                throw new BadGatewayError(`Resend Error: ${error.message}`);
            }
            logger.info(`[Resend] ✅ Email sent successfully to ${to}. ID: ${data?.id}`);

            logger.info('═══════════════════════════════════════');
            logger.info(`📧 [Resend Email Service] Email to ${to}`);
            logger.info(`📝 Subject: ${subject}`);
            if (text) logger.info(`📄 Text Body: ${text}`);
            if (html) logger.info(`🌐 HTML Body (truncated): ${html.substring(0, 100)}...`);
            logger.info('═══════════════════════════════════════');
        } catch (error) {
            logger.error(`[Resend] Exception sending email to ${to}:`, error);
            throw error;
        }
    }

    async sendVerificationEmail(to: string, code: string): Promise<void> {
        const subject = 'BCDees - Verification Code';
        const html = `
            <h2>Email Verification</h2>
            <p>Your BCDees verification code is: <strong>${code}</strong></p>
            <p>This code is valid for 10 minutes.</p>
        `;
        return this.sendEmail({ to, subject, html });
    }

    async sendWelcomeEmail(to: string, name: string): Promise<void> {
        const subject = 'Welcome to BCDees!';
        const html = `
            <h2>Welcome, ${name}!</h2>
            <p>Thank you for joining BCDees.</p>
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

    async sendVerificationSuccessEmail(to: string, name: string): Promise<void> {
        const subject = 'Verification Complete!';
        const html = `
            <h2>Congratulations, ${name}!</h2>
            <p>Your account has been fully verified.</p>
            <p>You can now enjoy the features of BCDees.</p>
        `;
        return this.sendEmail({ to, subject, html });
    }
}
