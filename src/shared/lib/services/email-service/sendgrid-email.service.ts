import { BaseEmailService, EmailOptions } from './base-email.service';
import sendgrid from '@sendgrid/mail';
import logger from '../../utils/logger';
import { envConfig } from '../../../config/env.config';
import { BadGatewayError } from '../../utils/api-error';

export class SendGridEmailService extends BaseEmailService {
    private fromEmail: string;

    constructor() {
        super();
        if (!envConfig.SENDGRID_API_KEY) {
            throw new Error('SENDGRID_API_KEY is required');
        }

        sendgrid.setApiKey(envConfig.SENDGRID_API_KEY);
        this.fromEmail = envConfig.FROM_EMAIL;

        logger.info('✅ Using SendGrid Email Service (Staging)');
        logger.info(`📧 FROM_EMAIL configured as: ${this.fromEmail}`);
    }

    async sendEmail(options: EmailOptions): Promise<void> {
        const { to, subject, html, text } = options;
        try {
            logger.info(`[SendGrid] Attempting to send email to ${to} from ${this.fromEmail}`);

            const msg = {
                to,
                from: this.fromEmail,
                subject,
                text: text || '',
                html: html || text || '',
            };

            const response = await sendgrid.send(msg);

            logger.info(
                `[SendGrid] ✅ Email sent successfully to ${to}. Status: ${response[0].statusCode}`
            );
        } catch (error: unknown) {
            logger.error(`[SendGrid] Exception sending email to ${to}:`, error);

            // SendGrid errors have a response property with details
            const errorMessage =
                error && typeof error === 'object' && 'response' in error
                    ? (error as { response?: { body?: { errors?: Array<{ message?: string }> } } })
                          ?.response?.body?.errors?.[0]?.message
                    : error instanceof Error
                    ? error.message
                    : 'Unknown error';

            throw new BadGatewayError(`SendGrid Error: ${errorMessage}`);
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
