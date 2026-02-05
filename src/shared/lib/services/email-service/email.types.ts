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
    bank_name?: string;
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
    reference?: string; // Transaction reference/ID
    transactionId?: string; // Alternative field for transaction ID
    status?: string; // SUCCESS, FAILED, PENDING
    color?: string; // For transaction type color
    // Account information (will be scrambled)
    accountNumber?: string; // User's account number (will be scrambled)
    recipientAccount?: string; // For debits - recipient's account (will be scrambled)
    senderAccount?: string; // For credits - sender's account (will be scrambled)
    recipientName?: string; // For debits
    senderName?: string; // For credits
    bankName?: string; // Bank name
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

export interface P2PAdPausedEmailData {
    adType: string; // BUY_FX, SELL_FX
    currency: string; // USD, EUR, GBP
    price: number; // Exchange rate
    remainingAmount: number;
    dashboardUrl: string;
}

export interface P2PAdLowBalanceEmailData {
    adType: string; // BUY_FX, SELL_FX
    currency: string; // USD, EUR, GBP
    price: number; // Exchange rate
    remainingAmount: number;
    minLimit: number;
    dashboardUrl: string;
}

export interface GenericEmailData {
    subject: string;
    html: string;
}

// Email job types for queue
export type EmailJobType =
    | 'otp'
    | 'welcome'
    | 'kyc-status'
    | 'transaction'
    | 'password-reset'
    | 'wallet-created'
    | 'p2p-ad-paused'
    | 'p2p-ad-low-balance'
    | 'generic';

export interface SendEmailJob {
    type: EmailJobType;
    to: string;
    userId?: string; // For audit logging
    data: any;
}
