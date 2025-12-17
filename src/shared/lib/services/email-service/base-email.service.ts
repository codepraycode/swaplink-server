export interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}

export abstract class BaseEmailService {
    abstract sendEmail(options: EmailOptions): Promise<void>;

    abstract sendVerificationEmail(to: string, code: string): Promise<void>;

    abstract sendWelcomeEmail(to: string, name: string): Promise<void>;

    abstract sendPasswordResetLink(email: string, resetToken: string): Promise<void>;
}
