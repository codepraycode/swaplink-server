import { BaseEmailService, EmailOptions } from './base-email.service';
import logger from '../../utils/logger';
import { TemplatedEmailOptions, KycEmailStatus, TransactionEmailData } from './email.types';
import { templateRenderer } from './template-renderer.service';
import { envConfig } from '../../../config/env.config';

export class LocalEmailService extends BaseEmailService {
    constructor() {
        super();
        logger.info('💻 Using Local Email Service (Development - Console Logging)');
    }

    async sendEmail(options: EmailOptions): Promise<void> {
        const { to, subject, html, text } = options;

        logger.info('═══════════════════════════════════════');
        logger.info(`📧 [Local Email Service] Email to ${to}`);
        logger.info(`📝 Subject: ${subject}`);
        if (text) logger.info(`📄 Text Body: ${text}`);
        if (html) logger.info(`🌐 HTML Body:\n${html}`);
        logger.info('═══════════════════════════════════════');

        return Promise.resolve();
    }

    // ============================================
    // Template-based Email Methods
    // ============================================

    async sendTemplatedEmail(options: TemplatedEmailOptions): Promise<void> {
        logger.info(`📧 [Local] Templated Email: ${options.templateName}`);
        try {
            const html = await templateRenderer.renderTemplate(options.templateName, options.data);
            return this.sendEmail({
                to: options.to,
                subject: options.subject,
                html,
            });
        } catch (error) {
            logger.error(`Failed to render template ${options.templateName}`, error);
            // Fallback to simple message
            return this.sendEmail({
                to: options.to,
                subject: options.subject,
                html: `Template rendering failed for ${options.templateName}. Data: ${JSON.stringify(options.data)}`,
            });
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
            logger.warn('Template rendering failed, using fallback HTML', error);
            const html = `
                <h2>Email Verification - BCDees Global</h2>
                <p>Hello ${name},</p>
                <p>Your verification code is: <strong>${otp}</strong></p>
                <p>This code is valid for ${duration} minutes.</p>
            `;
            return this.sendEmail({
                to,
                subject: 'Verify Your Email - BCDees Global',
                html,
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
            logger.warn('Template rendering failed, using fallback HTML', error);
            let statusMessage = '';
            if (status.isSubmitted) statusMessage = 'KYC documents submitted for review';
            if (status.isSuccess)
                statusMessage = `KYC approved! Wallet: ${status.account_number || 'N/A'}`;
            if (status.isFailed)
                statusMessage = `KYC rejected: ${status.reason || 'Unknown reason'}`;

            const html = `
                <h2>KYC Status Update - BCDees Global</h2>
                <p>Hello ${name},</p>
                <p>${statusMessage}</p>
            `;
            return this.sendEmail({
                to,
                subject: 'Your KYC Status - BCDees Global',
                html,
            });
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
            logger.warn('Template rendering failed, using fallback HTML', error);
            const html = `
                <h2>Transaction Alert - BCDees Global</h2>
                <p>Hello ${name},</p>
                <p>Type: ${data.type || 'N/A'}</p>
                <p>Amount: ${data.currency || ''} ${data.amount || 'N/A'}</p>
                <p>Reference: ${data.reference || 'N/A'}</p>
            `;
            return this.sendEmail({
                to,
                subject: 'Transaction Alert - BCDees Global',
                html,
            });
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
            logger.warn('Template rendering failed, using fallback HTML', error);
            const html = `
                <h2>Password Reset - BCDees Global</h2>
                <p>Hello ${name},</p>
                <p>Click here to reset your password: <a href="${resetUrl}">${resetUrl}</a></p>
                <p>This link expires in ${duration} minutes.</p>
            `;
            return this.sendEmail({
                to,
                subject: 'Password Reset Request - BCDees Global',
                html,
            });
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
            logger.warn('Template rendering failed, using fallback HTML', error);
            const html = `
                <h2>Welcome to BCDees Global!</h2>
                <p>Hello ${name},</p>
                <p>Thank you for joining BCDees Global.</p>
            `;
            return this.sendEmail({
                to,
                subject: 'Welcome to BCDees Global!',
                html,
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

    static logIntent(intent: string, to: string, name?: string) {
        logger.info('═══════════════════════════════════════');
        logger.info(`📧 [LocalEmailService] ${intent} for ${to}`);
        if (name) logger.info(`👋 Name: ${name}`);
        logger.info('═══════════════════════════════════════');
    }
}
