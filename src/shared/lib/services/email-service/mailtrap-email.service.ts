import { BaseEmailService, EmailOptions } from './base-email.service';
import nodemailer, { Transporter } from 'nodemailer';
import logger from '../../utils/logger';
import { envConfig } from '../../../config/env.config';
import { BadGatewayError } from '../../utils/api-error';

export class MailtrapEmailService extends BaseEmailService {
    private transporter: Transporter;
    private fromEmail: string;

    constructor() {
        super();
        if (!envConfig.MAILTRAP_USER || !envConfig.MAILTRAP_PASSWORD) {
            throw new Error('MAILTRAP_USER and MAILTRAP_PASSWORD are required');
        }

        this.transporter = nodemailer.createTransport({
            host: envConfig.MAILTRAP_HOST,
            port: envConfig.MAILTRAP_PORT,
            auth: {
                user: envConfig.MAILTRAP_USER,
                pass: envConfig.MAILTRAP_PASSWORD,
            },
        });

        this.fromEmail = envConfig.FROM_EMAIL;

        logger.info('✅ Using Mailtrap Email Service (Staging)');
        logger.info(`📧 FROM_EMAIL configured as: ${this.fromEmail}`);
        logger.info(`🔧 Mailtrap Host: ${envConfig.MAILTRAP_HOST}:${envConfig.MAILTRAP_PORT}`);
    }

    async sendEmail(options: EmailOptions): Promise<void> {
        const { to, subject, html, text } = options;
        try {
            logger.info(`[Mailtrap] Attempting to send email to ${to} from ${this.fromEmail}`);

            const info = await this.transporter.sendMail({
                from: this.fromEmail,
                to: to,
                subject: subject,
                text: text,
                html: html || text,
            });

            logger.info(
                `[Mailtrap] ✅ Email sent successfully to ${to}. Message ID: ${info.messageId}`
            );
            logger.info(`[Mailtrap] 📬 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        } catch (error) {
            logger.error(`[Mailtrap] Exception sending email to ${to}:`, error);
            throw new BadGatewayError(
                `Mailtrap Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
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
