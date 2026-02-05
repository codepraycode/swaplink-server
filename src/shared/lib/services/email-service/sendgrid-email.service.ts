import { BaseEmailService, EmailOptions } from './base-email.service';
import sendgrid from '@sendgrid/mail';
import logger from '../../utils/logger';
import { envConfig } from '../../../config/env.config';
import { BadGatewayError } from '../../utils/api-error';
import { templateRenderer } from './template-renderer.service';
import { TemplatedEmailOptions, KycEmailStatus, TransactionEmailData } from './email.types';

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

    // ============================================
    // Template-based Email Methods
    // ============================================

    async sendTemplatedEmail(options: TemplatedEmailOptions): Promise<void> {
        try {
            const html = await templateRenderer.renderTemplate(options.templateName, options.data);
            return this.sendEmail({
                to: options.to,
                subject: options.subject,
                html,
            });
        } catch (error) {
            logger.error(`Failed to send templated email: ${options.templateName}`, error);
            throw error;
        }
    }

    async sendOtpEmail(to: string, name: string, otp: string, duration: number): Promise<void> {
        try {
            const html = await templateRenderer.renderTemplate('verify-otp', {
                title: 'Verify Your Email - BCDees Global',
                name,
                otp,
                duration,
            });
            return this.sendEmail({
                to,
                subject: 'Verify Your Email - BCDees Global',
                html,
            });
        } catch (error) {
            logger.warn('Template rendering failed, using fallback HTML');
            const fallbackHtml = `
                <h2>Email Verification</h2>
                <p>Your BCDees verification code is: <strong>${otp}</strong></p>
                <p>This code is valid for ${duration} minutes.</p>
            `;
            return this.sendEmail({
                to,
                subject: 'Verify Your Email - BCDees Global',
                html: fallbackHtml,
            });
        }
    }

    async sendKycStatusEmail(to: string, name: string, status: KycEmailStatus): Promise<void> {
        try {
            const html = await templateRenderer.renderTemplate('kyc-status', {
                title: 'Your KYC Status - BCDees Global',
                name,
                ...status,
            });
            return this.sendEmail({
                to,
                subject: 'Your KYC Status - BCDees Global',
                html,
            });
        } catch (error) {
            logger.warn('Template rendering failed for KYC status email');
            throw error;
        }
    }

    async sendTransactionEmail(
        to: string,
        name: string,
        data: TransactionEmailData
    ): Promise<void> {
        try {
            const html = await templateRenderer.renderTemplate('transaction', {
                title: 'Transaction Alert - BCDees Global',
                name,
                ...data,
            });
            return this.sendEmail({
                to,
                subject: 'Transaction Alert - BCDees Global',
                html,
            });
        } catch (error) {
            logger.warn('Template rendering failed for transaction email');
            throw error;
        }
    }

    async sendPasswordResetEmail(
        to: string,
        name: string,
        resetUrl: string,
        duration: number
    ): Promise<void> {
        try {
            const html = await templateRenderer.renderTemplate('password-reset', {
                title: 'Password Reset Request - BCDees Global',
                name,
                reset_url: resetUrl,
                duration,
            });
            return this.sendEmail({
                to,
                subject: 'Password Reset Request - BCDees Global',
                html,
            });
        } catch (error) {
            logger.warn('Template rendering failed, using fallback HTML');
            const fallbackHtml = `
                <h2>Password Reset</h2>
                <p>Click here to reset your password: <a href="${resetUrl}">${resetUrl}</a></p>
                <p>This link expires in ${duration} minutes.</p>
            `;
            return this.sendEmail({
                to,
                subject: 'Password Reset Request - BCDees Global',
                html: fallbackHtml,
            });
        }
    }

    async sendWalletCreatedEmail(to: string, name: string, data: any): Promise<void> {
        try {
            const html = await templateRenderer.renderTemplate('wallet-created', {
                title: 'Wallet Created - BCDees Global',
                name,
                ...data,
            });
            return this.sendEmail({
                to,
                subject: 'Wallet Created - BCDees Global',
                html,
            });
        } catch (error) {
            logger.warn('Template rendering failed for wallet created email');
            throw error;
        }
    }

    // ============================================
    // Legacy Methods (Backward Compatibility)
    // ============================================

    async sendVerificationEmail(to: string, code: string): Promise<void> {
        return this.sendOtpEmail(to, 'User', code, 10);
    }

    async sendWelcomeEmail(to: string, name: string): Promise<void> {
        try {
            const html = await templateRenderer.renderTemplate('welcome', {
                title: 'Welcome to BCDees Global!',
                name,
                login_url: `${envConfig.FRONTEND_URL}/login`,
            });
            return this.sendEmail({
                to,
                subject: 'Welcome to BCDees Global!',
                html,
            });
        } catch (error) {
            logger.warn('Template rendering failed, using fallback HTML');
            const fallbackHtml = `
                <h2>Welcome, ${name}!</h2>
                <p>Thank you for joining BCDees Global.</p>
            `;
            return this.sendEmail({
                to,
                subject: 'Welcome to BCDees Global!',
                html: fallbackHtml,
            });
        }
    }

    async sendPasswordResetLink(email: string, resetToken: string): Promise<void> {
        const resetUrl = `${envConfig.FRONTEND_URL}/reset-password?token=${resetToken}`;
        return this.sendPasswordResetEmail(email, 'User', resetUrl, 30);
    }

    async sendVerificationSuccessEmail(to: string, name: string): Promise<void> {
        return this.sendKycStatusEmail(to, name, {
            isSuccess: true,
            dashboard_url: `${envConfig.FRONTEND_URL}/dashboard`,
        });
    }
}
