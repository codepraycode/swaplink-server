import logger from '../utils/logger';
import { envConfig } from '../../config/env.config';

/**
 * Email Service Interface
 * This will be implemented with actual Email providers (SendGrid, AWS SES, etc.) later
 */
export interface IEmailService {
    sendEmail(to: string, subject: string, body: string): Promise<boolean>;
    sendOtp(email: string, code: string): Promise<boolean>;
    sendPasswordResetLink(email: string, resetToken: string): Promise<boolean>;
    sendWelcomeEmail(email: string, firstName: string): Promise<boolean>;
}

export class EmailService implements IEmailService {
    /**
     * Send a generic email
     */
    async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
        try {
            // TODO: Integrate with actual Email provider (SendGrid, AWS SES, etc.)

            // In development/test, log the email for debugging
            if (envConfig.NODE_ENV === 'development' || envConfig.NODE_ENV === 'test') {
                logger.info(`[Email Service] 📧 Email to ${to}`);
                logger.info(`[Email Service] Subject: ${subject}`);
            }

            // Simulate email sending
            return true;
        } catch (error) {
            logger.error(`[Email Service] Failed to send email to ${to}:`, error);
            throw new Error('Failed to send email');
        }
    }

    /**
     * Send OTP via Email
     */
    async sendOtp(email: string, code: string): Promise<boolean> {
        const subject = 'SwapLink - Verification Code';
        const body = `
            <h2>Email Verification</h2>
            <p>Your SwapLink verification code is: <strong>${code}</strong></p>
            <p>This code is valid for 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
        `;

        // Log OTP prominently in development/test for easy access
        if (envConfig.NODE_ENV === 'development' || envConfig.NODE_ENV === 'test') {
            logger.info('═══════════════════════════════════════');
            logger.info(`📧 EMAIL OTP for ${email}`);
            logger.info(`🔑 CODE: ${code}`);
            logger.info(`⏰ Valid for: 10 minutes`);
            logger.info('═══════════════════════════════════════');
        }

        return this.sendEmail(email, subject, body);
    }

    /**
     * Send password reset link
     */
    async sendPasswordResetLink(email: string, resetToken: string): Promise<boolean> {
        const subject = 'SwapLink - Password Reset Request';
        const resetLink = `${envConfig.FRONTEND_URL}/reset-password?token=${resetToken}`;
        const body = `
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password. Click the link below to proceed:</p>
            <p><a href="${resetLink}">Reset Password</a></p>
            <p>This link is valid for 15 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
        `;

        // Log reset token prominently in development/test for easy access
        if (envConfig.NODE_ENV === 'development' || envConfig.NODE_ENV === 'test') {
            logger.info('═══════════════════════════════════════');
            logger.info(`📧 PASSWORD RESET for ${email}`);
            logger.info(`🔑 Reset Token: ${resetToken}`);
            logger.info(`🔗 Reset Link: ${resetLink}`);
            logger.info(`⏰ Valid for: 15 minutes`);
            logger.info('═══════════════════════════════════════');
        }

        return this.sendEmail(email, subject, body);
    }

    /**
     * Send welcome email after registration
     */
    async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
        const subject = 'Welcome to SwapLink!';
        const body = `
            <h2>Welcome to SwapLink, ${firstName}!</h2>
            <p>Thank you for joining SwapLink. We're excited to have you on board.</p>
            <p>To get started, please verify your email address.</p>
            <p>If you have any questions, feel free to contact our support team.</p>
        `;
        return this.sendEmail(email, subject, body);
    }
}

export const emailService = new EmailService();
