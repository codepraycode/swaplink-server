import { TemplatedEmailOptions, KycEmailStatus, TransactionEmailData } from './email.types';

export interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}

export abstract class BaseEmailService {
    abstract sendEmail(options: EmailOptions): Promise<void>;

    // Legacy methods (kept for backward compatibility)
    abstract sendVerificationEmail(to: string, code: string): Promise<void>;
    abstract sendWelcomeEmail(to: string, name: string): Promise<void>;
    abstract sendPasswordResetLink(email: string, resetToken: string): Promise<void>;
    abstract sendVerificationSuccessEmail(to: string, name: string): Promise<void>;

    // New template-based methods
    abstract sendTemplatedEmail(options: TemplatedEmailOptions): Promise<void>;
    abstract sendOtpEmail(to: string, name: string, otp: string, duration: number): Promise<void>;
    abstract sendKycStatusEmail(to: string, name: string, status: KycEmailStatus): Promise<void>;
    abstract sendTransactionEmail(
        to: string,
        name: string,
        data: TransactionEmailData
    ): Promise<void>;
    abstract sendPasswordResetEmail(
        to: string,
        name: string,
        resetUrl: string,
        duration: number
    ): Promise<void>;
}
