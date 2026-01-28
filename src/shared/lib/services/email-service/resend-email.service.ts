import { BaseEmailService, EmailOptions } from './base-email.service';
import { Resend } from 'resend';
import logger from '../../utils/logger';
import { envConfig } from '../../../config/env.config';
import { BadGatewayError } from '../../utils/api-error';
import { templateRenderer } from './template-renderer.service';
import { TemplatedEmailOptions, KycEmailStatus, TransactionEmailData } from './email.types';

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
            // Fallback to hardcoded HTML
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
            // Fallback to hardcoded HTML
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

    // ============================================
    // Legacy Methods (Backward Compatibility)
    // ============================================

    async sendVerificationEmail(to: string, code: string): Promise<void> {
        // Use new template-based method
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
        // This can be merged with KYC success email
        return this.sendKycStatusEmail(to, name, {
            isSuccess: true,
            dashboard_url: `${envConfig.FRONTEND_URL}/dashboard`,
        });
    }
}
