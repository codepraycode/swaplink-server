import { Resend } from 'resend';
import logger from '../utils/logger';
import { envConfig } from '../../config/env.config';
import { IEmailService } from './email.service';

/**
 * Resend Email Service Implementation
 * Production-ready email service using Resend API
 */
export class ResendEmailService implements IEmailService {
    private resend: Resend;
    private fromEmail: string;

    constructor() {
        this.resend = new Resend(envConfig.RESEND_API_KEY);
        this.fromEmail = envConfig.FROM_EMAIL;
    }

    /**
     * Send a generic email using Resend
     */
    async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
        try {
            const { data, error } = await this.resend.emails.send({
                from: this.fromEmail,
                to: [to],
                subject: subject,
                html: body,
            });

            if (error) {
                logger.error(`[Resend Email Service] Failed to send email to ${to}:`, error);
                throw new Error(`Failed to send email: ${error.message}`);
            }

            logger.info(
                `[Resend Email Service] ✅ Email sent successfully to ${to}. ID: ${data?.id}`
            );
            return true;
        } catch (error) {
            logger.error(`[Resend Email Service] Failed to send email to ${to}:`, error);
            throw new Error('Failed to send email');
        }
    }

    /**
     * Send OTP via Email
     */
    async sendOtp(email: string, code: string): Promise<boolean> {
        const subject = 'SwapLink - Verification Code';
        const body = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>SwapLink - Email Verification</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .container {
                        background-color: #ffffff;
                        border-radius: 8px;
                        padding: 40px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .logo {
                        font-size: 32px;
                        font-weight: bold;
                        color: #4F46E5;
                        margin-bottom: 10px;
                    }
                    .code-container {
                        background-color: #F3F4F6;
                        border-radius: 8px;
                        padding: 30px;
                        text-align: center;
                        margin: 30px 0;
                    }
                    .code {
                        font-size: 36px;
                        font-weight: bold;
                        color: #4F46E5;
                        letter-spacing: 8px;
                        font-family: 'Courier New', monospace;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        color: #6B7280;
                        font-size: 14px;
                    }
                    .warning {
                        background-color: #FEF3C7;
                        border-left: 4px solid #F59E0B;
                        padding: 15px;
                        margin-top: 20px;
                        border-radius: 4px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">SwapLink</div>
                        <h2 style="color: #1F2937; margin: 0;">Email Verification</h2>
                    </div>
                    
                    <p>Hello,</p>
                    <p>Your SwapLink verification code is:</p>
                    
                    <div class="code-container">
                        <div class="code">${code}</div>
                    </div>
                    
                    <p style="text-align: center; color: #6B7280;">This code is valid for <strong>10 minutes</strong>.</p>
                    
                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong> If you didn't request this code, please ignore this email and ensure your account is secure.
                    </div>
                    
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} SwapLink. All rights reserved.</p>
                        <p>This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
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
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>SwapLink - Password Reset</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .container {
                        background-color: #ffffff;
                        border-radius: 8px;
                        padding: 40px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .logo {
                        font-size: 32px;
                        font-weight: bold;
                        color: #4F46E5;
                        margin-bottom: 10px;
                    }
                    .button {
                        display: inline-block;
                        background-color: #4F46E5;
                        color: #ffffff;
                        text-decoration: none;
                        padding: 14px 32px;
                        border-radius: 6px;
                        font-weight: 600;
                        margin: 20px 0;
                    }
                    .button:hover {
                        background-color: #4338CA;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        color: #6B7280;
                        font-size: 14px;
                    }
                    .warning {
                        background-color: #FEF3C7;
                        border-left: 4px solid #F59E0B;
                        padding: 15px;
                        margin-top: 20px;
                        border-radius: 4px;
                    }
                    .link-text {
                        word-break: break-all;
                        color: #6B7280;
                        font-size: 12px;
                        margin-top: 15px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">SwapLink</div>
                        <h2 style="color: #1F2937; margin: 0;">Password Reset Request</h2>
                    </div>
                    
                    <p>Hello,</p>
                    <p>We received a request to reset your password for your SwapLink account.</p>
                    <p>Click the button below to reset your password:</p>
                    
                    <div style="text-align: center;">
                        <a href="${resetLink}" class="button">Reset Password</a>
                    </div>
                    
                    <p class="link-text">Or copy and paste this link into your browser:<br>${resetLink}</p>
                    
                    <p style="text-align: center; color: #6B7280;">This link is valid for <strong>15 minutes</strong>.</p>
                    
                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
                    </div>
                    
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} SwapLink. All rights reserved.</p>
                        <p>This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
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
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to SwapLink</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .container {
                        background-color: #ffffff;
                        border-radius: 8px;
                        padding: 40px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .logo {
                        font-size: 32px;
                        font-weight: bold;
                        color: #4F46E5;
                        margin-bottom: 10px;
                    }
                    .welcome-banner {
                        background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
                        color: white;
                        padding: 30px;
                        border-radius: 8px;
                        text-align: center;
                        margin: 20px 0;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        color: #6B7280;
                        font-size: 14px;
                    }
                    .feature-list {
                        background-color: #F9FAFB;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                    }
                    .feature-item {
                        margin: 10px 0;
                        padding-left: 25px;
                        position: relative;
                    }
                    .feature-item:before {
                        content: "✓";
                        position: absolute;
                        left: 0;
                        color: #10B981;
                        font-weight: bold;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">SwapLink</div>
                    </div>
                    
                    <div class="welcome-banner">
                        <h1 style="margin: 0; font-size: 28px;">Welcome to SwapLink, ${firstName}! 🎉</h1>
                    </div>
                    
                    <p>Thank you for joining SwapLink. We're excited to have you on board!</p>
                    
                    <p>With SwapLink, you can:</p>
                    
                    <div class="feature-list">
                        <div class="feature-item">Send and receive money instantly</div>
                        <div class="feature-item">Trade currencies peer-to-peer</div>
                        <div class="feature-item">Manage your digital wallet securely</div>
                        <div class="feature-item">Access real-time exchange rates</div>
                    </div>
                    
                    <p><strong>Next Steps:</strong></p>
                    <ol>
                        <li>Verify your email address</li>
                        <li>Complete your profile</li>
                        <li>Start exploring SwapLink features</li>
                    </ol>
                    
                    <p>If you have any questions or need assistance, our support team is here to help.</p>
                    
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} SwapLink. All rights reserved.</p>
                        <p>This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        return this.sendEmail(email, subject, body);
    }
}

export const resendEmailService = new ResendEmailService();
