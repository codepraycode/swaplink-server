import { BaseEmailService, EmailOptions } from './base-email.service';
import { MailtrapClient } from 'mailtrap';
import logger, { logDebug } from '../../utils/logger';
import { envConfig } from '../../../config/env.config';
import { BadGatewayError } from '../../utils/api-error';

export class MailtrapEmailService extends BaseEmailService {
    private client: MailtrapClient;
    private fromEmail: string;

    constructor() {
        super();
        // logDebug(envConfig.MAILTRAP_API_TOKEN);
        if (!envConfig.MAILTRAP_API_TOKEN) {
            throw new Error('MAILTRAP_API_TOKEN is required');
        }

        this.client = new MailtrapClient({
            token: envConfig.MAILTRAP_API_TOKEN,
            // sandbox: true,
        });

        this.fromEmail = envConfig.FROM_EMAIL;

        logger.info('✅ Using Mailtrap Email Service (Staging - API)');
        logger.info(`📧 FROM_EMAIL configured as: ${this.fromEmail}`);
    }

    async sendEmail(options: EmailOptions): Promise<void> {
        const { to, subject, html, text } = options;
        try {
            logger.info(`[Mailtrap] Attempting to send email to ${to} from ${this.fromEmail}`);

            const response = await this.client.send({
                from: {
                    email: this.fromEmail,
                    name: 'SwapLink',
                },
                to: [{ email: to }],
                subject,
                text: text || '',
                html: html || text || '',
            });

            logger.info(
                `[Mailtrap] ✅ Email sent successfully to ${to}. Message ID: ${
                    response.message_ids?.[0] || 'N/A'
                }`
            );
        } catch (error: unknown) {
            logger.error(`[Mailtrap] Exception sending email to ${to}:`, error);

            const errorMessage =
                error && typeof error === 'object' && 'message' in error
                    ? (error as { message?: string }).message
                    : error instanceof Error
                      ? error.message
                      : 'Unknown error';

            throw new BadGatewayError(`Mailtrap Error: ${errorMessage}`);
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

    async sendVerificationSuccessEmail(to: string, name: string): Promise<void> {
        const subject = 'Verification Complete!';
        const html = `
            <h2>Congratulations, ${name}!</h2>
            <p>Your account has been fully verified.</p>
            <p>You can now enjoy the features of SwapLink.</p>
        `;
        return this.sendEmail({ to, subject, html });
    }
}
