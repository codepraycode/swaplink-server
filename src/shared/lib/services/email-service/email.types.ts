/**
 * Email Type Definitions
 *
 * Type-safe interfaces for all email data structures
 */

export interface TemplatedEmailOptions {
    to: string;
    subject: string;
    templateName: string;
    data: any;
}

export interface OtpEmailData {
    name: string;
    otp: string;
    duration: number;
}

export interface WelcomeEmailData {
    name: string;
    login_url: string;
}

export interface KycEmailStatus {
    isSubmitted?: boolean;
    isSuccess?: boolean;
    isFailed?: boolean;
    reason?: string;
    dashboard_url?: string;
    kyc_url?: string;
    // Wallet details (only for success)
    account_number?: string;
    account_name?: string;
}

export interface TransactionEmailData {
    isTransaction?: boolean;
    isPinChange?: boolean;
    isWalletCreated?: boolean;
    // Transaction details
    type?: string; // CREDIT, DEBIT
    amount?: string;
    currency?: string;
    date?: string;
    description?: string;
    reference?: string;
    color?: string; // For transaction type color
    // Pin change details
    action?: string; // Set, Reset
    // Wallet created details
    account_number?: string;
    account_name?: string;
}

export interface PasswordResetEmailData {
    name: string;
    reset_url: string;
    duration: number;
}

export interface WalletEmailData {
    account_number: string;
    account_name: string;
}

// Email job types for queue
export type EmailJobType =
    | 'otp'
    | 'welcome'
    | 'kyc-status'
    | 'transaction'
    | 'password-reset'
    | 'wallet-created';

export interface SendEmailJob {
    type: EmailJobType;
    to: string;
    userId?: string; // For audit logging
    data: any;
}
