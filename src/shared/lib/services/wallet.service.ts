import { prisma, Prisma, TransactionType, Transaction, UserFlagType, Wallet } from '../../database';
import { NotFoundError, BadRequestError, InternalError } from '../utils/api-error';
import { UserId } from '../../types/query.types';
import { redisConnection } from '../../config/redis.config';
import { socketService } from './socket.service';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import {
    validateTransactionDetails,
    getUserPartyDetails,
    buildSystemPartyDetails,
} from '../utils/transaction-helpers';
import { scrambleAccountNumber, formatTransactionForClient } from '../utils/email-formatter';

// --- Interfaces ---

interface FetchTransactionOptions {
    userId: UserId;
    page?: number;
    limit?: number;
    type?: TransactionType;
}

/**
 * Standard options for moving money.
 * Allows passing external references (from Banks) or custom descriptions.
 */
interface TransactionOptions {
    reference?: string; // Optional: Provide bank ref. If null, we generate one.
    description?: string; // e.g. "Transfer from John"
    type?: TransactionType; // DEPOSIT, WITHDRAWAL, TRANSFER, etc.
    metadata?: any; // Store webhook payload or external details
    counterpartyId?: string; // Optional: ID of the other party
    fee?: number; // Optional fee to deduct/record
}

interface LedgerEntry {
    userId: string;
    walletId?: string; // Optional if userId is provided
    amount: Decimal | number; // Positive for Credit, Negative for Debit
    type: TransactionType;
    reference: string;
    description: string;
    metadata?: any;
    fee?: Decimal | number;

    // Sender Details (Required)
    senderName: string;
    senderAccount: string;
    senderBankName: string;
    senderBankCode?: string;
    senderAvatarUrl?: string;

    // Receiver Details (Required)
    receiverName: string;
    receiverAccount: string;
    receiverBankName: string;
    receiverBankCode?: string;
    receiverAvatarUrl?: string;
}

export class WalletService {
    // --- Helpers ---

    private calculateAvailableBalance(
        balance: Decimal | number,
        lockedBalance: Decimal | number
    ): number {
        return new Decimal(balance).minus(new Decimal(lockedBalance)).toNumber();
    }

    private getCacheKey(userId: string) {
        return `wallet:${userId}`;
    }

    private async invalidateCache(userId: string) {
        await redisConnection.del(this.getCacheKey(userId));
    }

    // --- Main Methods ---

    async setUpWallet(userId: string, tx: Prisma.TransactionClient): Promise<Wallet> {
        try {
            return await tx.wallet.create({
                data: {
                    userId,
                    balance: 0.0,
                    lockedBalance: 0.0,
                    // currency: 'NGN' // Ensure schema has this if you added it
                },
            });
        } catch (error) {
            console.error(`Error creating wallet for user ${userId}:`, error);
            throw new InternalError('Failed to initialize user wallet system');
        }
    }

    async getWalletBalance(userId: UserId) {
        const cacheKey = this.getCacheKey(userId);

        const cached = await redisConnection.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const wallet = await prisma.wallet.findUnique({
            where: { userId },
            include: { virtualAccount: true },
        });

        if (!wallet) throw new NotFoundError('Wallet not found');

        const result = {
            id: wallet.id,
            balance: Number(wallet.balance),
            lockedBalance: Number(wallet.lockedBalance),
            availableBalance: this.calculateAvailableBalance(wallet.balance, wallet.lockedBalance),
            currency: 'NGN', // Hardcoded for now, or fetch from DB
            virtualAccount: wallet.virtualAccount
                ? {
                      accountNumber: wallet.virtualAccount.accountNumber,
                      bankName: wallet.virtualAccount.bankName,
                      accountName: wallet.virtualAccount.accountName,
                  }
                : null,
        };

        await redisConnection.set(cacheKey, JSON.stringify(result), 'EX', 30);
        return result;
    }

    async getWallet(userId: string): Promise<any> {
        const wallet = await prisma.wallet.findUnique({
            where: { userId },
            include: { virtualAccount: true },
        });

        if (!wallet) throw new NotFoundError('Wallet not found');

        return {
            ...wallet,
            balance: Number(wallet.balance),
            lockedBalance: Number(wallet.lockedBalance),
            availableBalance: this.calculateAvailableBalance(wallet.balance, wallet.lockedBalance),
        };
    }

    async getTransactions(params: FetchTransactionOptions): Promise<any> {
        const { userId, page = 1, limit = 20, type } = params;
        const skip = (page - 1) * limit;

        const where: Prisma.TransactionWhereInput = { userId };
        if (type) where.type = type;

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    type: true,
                    amount: true,
                    status: true,
                    reference: true,
                    balanceBefore: true,
                    balanceAfter: true,
                    createdAt: true,
                    metadata: true,
                    description: true,
                    fee: true,

                    // Sender Details
                    senderName: true,
                    senderAccount: true,
                    senderBankName: true,
                    senderBankCode: true,
                    senderAvatarUrl: true,

                    // Receiver Details
                    receiverName: true,
                    receiverAccount: true,
                    receiverBankName: true,
                    receiverBankCode: true,
                    receiverAvatarUrl: true,
                },
            }),
            prisma.transaction.count({ where }),
        ]);

        // Map transactions and scramble account numbers for security
        const enrichedTransactions = transactions.map(tx => ({
            ...tx,
            amount: Number(tx.amount),
            balanceBefore: Number(tx.balanceBefore),
            balanceAfter: Number(tx.balanceAfter),
            fee: Number(tx.fee),
            narration: tx.description || 'No narration',
            sender: {
                name: tx.senderName,
                // Scramble account number for security
                accountNumber: scrambleAccountNumber(tx.senderAccount),
                // Keep original for internal wallets (optional - you can scramble these too)
                accountNumberFull: tx.senderAccount,
                bankName: tx.senderBankName,
                bankCode: tx.senderBankCode || '',
                avatarUrl: tx.senderAvatarUrl || '',
                type: tx.senderBankName === 'SwapLink Wallet' ? 'INTERNAL' : 'EXTERNAL',
            },
            receiver: {
                name: tx.receiverName,
                // Scramble account number for security
                accountNumber: scrambleAccountNumber(tx.receiverAccount),
                // Keep original for internal wallets (optional - you can scramble these too)
                accountNumberFull: tx.receiverAccount,
                bankName: tx.receiverBankName,
                bankCode: tx.receiverBankCode || '',
                avatarUrl: tx.receiverAvatarUrl || '',
                type: tx.receiverBankName === 'SwapLink Wallet' ? 'INTERNAL' : 'EXTERNAL',
            },
        }));

        return {
            transactions: enrichedTransactions,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async hasSufficientBalance(userId: UserId, amount: number): Promise<boolean> {
        try {
            const wallet = await this.getWalletBalance(userId);
            return wallet.availableBalance >= amount;
        } catch (error) {
            if (error instanceof NotFoundError) return false;
            throw error;
        }
    }

    // ==========================================
    // CRITICAL: Money Movement Methods
    // ==========================================

    /**
     * Process multiple ledger entries atomically.
     * This is the core engine for all money movement.
     */
    async processLedgerEntry(entries: LedgerEntry[]): Promise<Transaction[]> {
        try {
            return await prisma.$transaction(
                async tx => {
                    const results = [];

                    for (const entry of entries) {
                        const { userId, amount, type, reference, description, metadata } = entry;
                        const decimalAmount = new Decimal(amount);

                        // Validate transaction details
                        validateTransactionDetails(
                            Math.abs(Number(amount)),
                            {
                                name: entry.senderName,
                                account: entry.senderAccount,
                                bankName: entry.senderBankName,
                                bankCode: entry.senderBankCode,
                                avatarUrl: entry.senderAvatarUrl,
                            },
                            {
                                name: entry.receiverName,
                                account: entry.receiverAccount,
                                bankName: entry.receiverBankName,
                                bankCode: entry.receiverBankCode,
                                avatarUrl: entry.receiverAvatarUrl,
                            },
                            reference
                        );

                        // 1. Get Wallet
                        const wallet = await tx.wallet.findUnique({ where: { userId } });
                        if (!wallet) throw new NotFoundError(`Wallet not found for user ${userId}`);

                        // 2. Check Balance (if debit)
                        if (decimalAmount.isNegative()) {
                            const available = new Decimal(wallet.balance).minus(
                                new Decimal(wallet.lockedBalance)
                            );
                            if (available.plus(decimalAmount).isNegative()) {
                                // decimalAmount is negative, so + means -
                                throw new BadRequestError(`Insufficient funds for user ${userId}`);
                            }
                        }

                        // 3. Update Balance
                        const updatedWallet = await tx.wallet.update({
                            where: { id: wallet.id },
                            data: { balance: { increment: decimalAmount } },
                        });

                        // 4. Create Transaction Record (Fully Decoupled)
                        const transaction = await tx.transaction.create({
                            data: {
                                userId,
                                walletId: wallet.id,
                                type,
                                amount: decimalAmount,
                                balanceBefore: wallet.balance,
                                balanceAfter: updatedWallet.balance,
                                status: 'COMPLETED',
                                reference,
                                description,
                                metadata,
                                fee: entry.fee ? new Decimal(entry.fee) : 0,

                                // Sender Details (Required)
                                senderName: entry.senderName,
                                senderAccount: entry.senderAccount,
                                senderBankName: entry.senderBankName,
                                senderBankCode: entry.senderBankCode,
                                senderAvatarUrl: entry.senderAvatarUrl,

                                // Receiver Details (Required)
                                receiverName: entry.receiverName,
                                receiverAccount: entry.receiverAccount,
                                receiverBankName: entry.receiverBankName,
                                receiverBankCode: entry.receiverBankCode,
                                receiverAvatarUrl: entry.receiverAvatarUrl,
                            },
                        });

                        results.push(transaction);

                        // 5. 30M Guard (For Credits)
                        if (decimalAmount.isPositive()) {
                            const user = await tx.user.findUnique({ where: { id: userId } });
                            if (user) {
                                const newCumulative = new Decimal(user.cumulativeInflow).plus(
                                    decimalAmount
                                );

                                // Update Cumulative Inflow
                                await tx.user.update({
                                    where: { id: userId },
                                    data: { cumulativeInflow: newCumulative },
                                });

                                // Check Limit
                                if (
                                    newCumulative.greaterThan(30000000) && // 30M
                                    user.kycLevel !== 'FULL'
                                ) {
                                    await tx.user.update({
                                        where: { id: userId },
                                        data: {
                                            flagType: UserFlagType.KYC_LIMIT,
                                            flagReason: 'Cumulative inflow limit exceeded (30M)',
                                            flaggedAt: new Date(),
                                        },
                                    });
                                }
                            }
                        }
                    }

                    return results;
                },
                {
                    timeout: 20000, // 20 seconds timeout to prevent "Transaction already closed"
                }
            );
        } catch (error) {
            console.error('Ledger Processing Error:', error);

            if (error instanceof PrismaClientKnownRequestError) {
                // P2028: Transaction already closed
                if (error.code === 'P2028') {
                    throw new InternalError(
                        'Transaction timed out or was closed unexpectedly. Please try again.'
                    );
                }
            }
            throw error;
        }
    }

    /**
     * Credit a wallet (Deposit)
     * Handles Webhooks (External Ref) and Internal Credits.
     */
    async creditWallet(
        userId: string,
        amount: number,
        options: TransactionOptions = {}
    ): Promise<Transaction> {
        const { reference, description = 'Credit', type = 'DEPOSIT', metadata = {} } = options;

        const txReference =
            reference ||
            `TX-CR-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

        // Get receiver (user) details
        const receiverDetails = await getUserPartyDetails(userId);

        // For credits without explicit sender, use system as sender
        const senderDetails = buildSystemPartyDetails();

        // Use processLedgerEntry for consistency
        const [transaction] = await this.processLedgerEntry([
            {
                userId,
                amount,
                type,
                reference: txReference,
                description,
                metadata,

                // Sender (System or External)
                senderName: senderDetails.name,
                senderAccount: senderDetails.account,
                senderBankName: senderDetails.bankName,

                // Receiver (User)
                receiverName: receiverDetails.name,
                receiverAccount: receiverDetails.account,
                receiverBankName: receiverDetails.bankName,
                receiverAvatarUrl: receiverDetails.avatarUrl,
            },
        ]);

        // Post-Transaction
        await this.invalidateCache(userId);

        // Notify Frontend (Send new balance)
        const newBalance = await this.getWalletBalance(userId);
        socketService.emitToUser(userId, 'WALLET_UPDATED', {
            ...newBalance,
            message: `Credit Alert: +₦${amount.toLocaleString()}`,
        });

        // Emit Transaction Created Event with scrambled account numbers
        socketService.emitToUser(
            userId,
            'TRANSACTION_CREATED',
            formatTransactionForClient(transaction)
        );

        return transaction;
    }

    /**
     * Debit a wallet (Withdrawal/Transfer)
     */
    async debitWallet(
        userId: string,
        amount: number,
        options: TransactionOptions = {}
    ): Promise<Transaction> {
        const { reference, description = 'Debit', type = 'WITHDRAWAL', metadata = {} } = options;

        const txReference =
            reference ||
            `TX-DR-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

        // Get sender (user) details
        const senderDetails = await getUserPartyDetails(userId);

        // For debits without explicit receiver, use system as receiver
        const receiverDetails = buildSystemPartyDetails();

        // Use processLedgerEntry
        const [transaction] = await this.processLedgerEntry([
            {
                userId,
                amount: -amount, // Negative for debit
                type,
                reference: txReference,
                description,
                metadata,

                // Sender (User)
                senderName: senderDetails.name,
                senderAccount: senderDetails.account,
                senderBankName: senderDetails.bankName,
                senderAvatarUrl: senderDetails.avatarUrl,

                // Receiver (System or External)
                receiverName: receiverDetails.name,
                receiverAccount: receiverDetails.account,
                receiverBankName: receiverDetails.bankName,
            },
        ]);

        // Post-Transaction
        await this.invalidateCache(userId);

        const newBalance = await this.getWalletBalance(userId);
        socketService.emitToUser(userId, 'WALLET_UPDATED', {
            ...newBalance,
            message: `Debit Alert: -₦${amount.toLocaleString()}`,
        });

        // Emit Transaction Created Event with scrambled account numbers
        socketService.emitToUser(
            userId,
            'TRANSACTION_CREATED',
            formatTransactionForClient(transaction)
        );

        return transaction;
    }
    /**
     * Lock funds (P2P Escrow)
     * Moves funds from Available to Locked. Balance remains same.
     */
    async lockFunds(userId: string, amount: number): Promise<Wallet> {
        const result = await prisma.$transaction(async tx => {
            const wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) throw new NotFoundError('Wallet not found');

            const balance = new Decimal(wallet.balance);
            const locked = new Decimal(wallet.lockedBalance);
            const available = balance.minus(locked);
            const decimalAmount = new Decimal(amount);

            if (available.lessThan(decimalAmount)) {
                throw new BadRequestError('Insufficient funds to lock');
            }

            // Increment Locked Balance
            return await tx.wallet.update({
                where: { id: wallet.id },
                data: { lockedBalance: { increment: decimalAmount } },
            });
        });

        await this.invalidateCache(userId);
        return result;
    }

    /**
     * Unlock funds (P2P Cancel/Release)
     * Moves funds from Locked back to Available.
     */
    async unlockFunds(userId: string, amount: number): Promise<Wallet> {
        const result = await prisma.$transaction(async tx => {
            const wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) throw new NotFoundError('Wallet not found');

            const locked = new Decimal(wallet.lockedBalance);
            const decimalAmount = new Decimal(amount);

            if (locked.lessThan(decimalAmount)) {
                // Should not happen if logic is correct, but safety first
                throw new BadRequestError('Cannot unlock more than is locked');
            }

            return await tx.wallet.update({
                where: { id: wallet.id },
                data: { lockedBalance: { decrement: decimalAmount } },
            });
        });

        await this.invalidateCache(userId);
        return result;
    }
}

export const walletService = new WalletService();
export default walletService;
