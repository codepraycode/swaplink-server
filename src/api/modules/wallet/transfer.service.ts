import { prisma, TransactionType } from '../../../shared/database';
import { eventBus, EventType } from '../../../shared/lib/events/event-bus';
import { nameEnquiryService } from './name-enquiry.service';
import { beneficiaryService } from './beneficiary.service';
import {
    BadRequestError,
    NotFoundError,
    ForbiddenError,
    InternalError,
} from '../../../shared/lib/utils/api-error';

import logger from '../../../shared/lib/utils/logger';
import { socketService } from '../../../shared/lib/services/socket.service';
import { walletService as sharedWalletService } from '../../../shared/lib/services/wallet.service';
import { getTransferQueue } from '../../../shared/lib/init/service-initializer';
import { redisConnection } from '../../../shared/config/redis.config';
import { formatTransactionForClient } from '../../../shared/lib/utils/email-formatter';

export interface TransferRequest {
    userId: string;
    amount: number;
    accountNumber: string;
    bankCode: string;
    accountName: string; // For validation
    narration?: string;
    saveBeneficiary?: boolean;
    idempotencyKey: string;
}

export class TransferService {
    private readonly SYSTEM_REVENUE_EMAIL = 'revenue@bcdees.com';
    private readonly TRANSFER_FEE = 53.5;

    /**
     * Process a transfer request (Hybrid: Internal or External)
     * Note: PIN verification is done in a separate step before this
     */
    async processTransfer(payload: TransferRequest): Promise<any> {
        const { userId, accountNumber, bankCode, idempotencyKey, saveBeneficiary } = payload;

        // 1. Validate Idempotency Key belongs to this user
        const idempotencyKeyRedis = `idempotency:${idempotencyKey}`;
        const storedUserId = await redisConnection.get(idempotencyKeyRedis);

        if (!storedUserId) {
            throw new ForbiddenError(
                'Invalid or expired idempotency key. Please verify your PIN again.'
            );
        }

        if (storedUserId !== userId) {
            throw new ForbiddenError('Idempotency key does not belong to this user.');
        }

        // 2. Check if transaction already exists
        const existingTx = await prisma.transaction.findUnique({
            where: { idempotencyKey },
        });
        if (existingTx) {
            return {
                message: 'Transaction already processed',
                transactionId: existingTx.id,
                status: existingTx.status,
            };
        }

        // 3. Resolve Destination (Internal vs External)
        const destination = await nameEnquiryService.resolveAccount(accountNumber, bankCode);

        // Prevent Self-Transfer (Internal)
        if (destination.isInternal) {
            const receiverVirtualAccount = await prisma.virtualAccount.findUnique({
                where: { accountNumber },
                include: { wallet: true },
            });
            if (receiverVirtualAccount && receiverVirtualAccount.wallet.userId === userId) {
                throw new BadRequestError('Cannot transfer to self');
            }
        }

        // 4. Delete the idempotency key from Redis to prevent reuse
        await redisConnection.del(idempotencyKeyRedis);

        if (destination.isInternal) {
            const result = await this.processInternalTransfer(payload, destination);
            if (saveBeneficiary) {
                await this.saveBeneficiary(userId, destination, accountNumber, bankCode);
            }
            return result;
        } else {
            const result = await this.initiateExternalTransfer(payload, destination);
            if (saveBeneficiary) {
                await this.saveBeneficiary(userId, destination, accountNumber, bankCode);
            }
            return result;
        }
    }

    private async saveBeneficiary(
        userId: string,
        destination: any,
        accountNumber: string,
        bankCode: string
    ) {
        try {
            await beneficiaryService.createBeneficiary({
                userId,
                accountNumber,
                accountName: destination.accountName,
                bankCode,
                bankName: destination.bankName,
                isInternal: destination.isInternal,
            });
        } catch (error) {
            logger.error('Failed to save beneficiary', error);
        }
    }

    private async getSystemRevenueUser() {
        const revenueuser = await prisma.user.findUnique({
            where: { email: this.SYSTEM_REVENUE_EMAIL },
            include: { wallet: true },
        });
        return revenueuser;
    }

    /**
     * Handle Internal Transfer (Atomic)
     */
    private async processInternalTransfer(payload: TransferRequest, destination: any) {
        const { userId, amount, accountNumber, narration, idempotencyKey } = payload;
        const fee = this.TRANSFER_FEE;

        // Find Sender Wallet
        const senderWallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!senderWallet) throw new NotFoundError('Sender wallet not found');

        // Find Receiver Wallet (via Virtual Account)
        const receiverVirtualAccount = await prisma.virtualAccount.findUnique({
            where: { accountNumber },
            include: { wallet: true },
        });
        if (!receiverVirtualAccount) throw new NotFoundError('Receiver account not found');

        const receiverWallet = receiverVirtualAccount.wallet;

        // Fetch Revenue User
        const revenueUser = await this.getSystemRevenueUser();
        if (!revenueUser) throw new InternalError('System Revenue User not found');

        // Import helper functions
        const { getUserPartyDetails, generateTransactionReference } =
            await import('../../../shared/lib/utils/transaction-helpers');

        // Get party details
        const senderDetails = await getUserPartyDetails(senderWallet.userId);
        const receiverDetails = await getUserPartyDetails(receiverWallet.userId);
        const revenueDetails = await getUserPartyDetails(revenueUser.id);

        // Prepare Ledger Entries
        // 1. Debit Sender Principal
        // 2. Debit Sender Fee
        // 3. Credit Receiver Principal
        // 4. Credit Revenue Fee

        const entries: any[] = [
            // 1. Debit Sender Principal
            {
                userId: senderWallet.userId,
                amount: -amount,
                type: TransactionType.TRANSFER,
                reference: generateTransactionReference('TRF'),
                description: narration || `Transfer to ${destination.accountName}`,
                idempotencyKey, // Only on the main tx

                // Sender
                senderName: senderDetails.name,
                senderAccount: senderDetails.account,
                senderBankName: senderDetails.bankName,
                senderAvatarUrl: senderDetails.avatarUrl,

                // Receiver
                receiverName: receiverDetails.name,
                receiverAccount: receiverDetails.account,
                receiverBankName: receiverDetails.bankName,
                receiverAvatarUrl: receiverDetails.avatarUrl,
            },
            // 2. Debit Sender Fee
            {
                userId: senderWallet.userId,
                amount: -fee,
                type: TransactionType.FEE,
                reference: generateTransactionReference('FEE'),
                description: 'Transfer Fee',

                // Sender (User paying fee)
                senderName: senderDetails.name,
                senderAccount: senderDetails.account,
                senderBankName: senderDetails.bankName,
                senderAvatarUrl: senderDetails.avatarUrl,

                // Receiver (Revenue)
                receiverName: revenueDetails.name,
                receiverAccount: revenueDetails.account,
                receiverBankName: revenueDetails.bankName,
                receiverAvatarUrl: revenueDetails.avatarUrl,
            },
            // 3. Credit Receiver Principal
            {
                userId: receiverWallet.userId,
                amount: amount,
                type: TransactionType.DEPOSIT,
                reference: generateTransactionReference('DEP'),
                description: narration || `Received from ${senderDetails.name}`,
                metadata: { senderId: senderWallet.userId },

                // Sender
                senderName: senderDetails.name,
                senderAccount: senderDetails.account,
                senderBankName: senderDetails.bankName,
                senderAvatarUrl: senderDetails.avatarUrl,

                // Receiver
                receiverName: receiverDetails.name,
                receiverAccount: receiverDetails.account,
                receiverBankName: receiverDetails.bankName,
                receiverAvatarUrl: receiverDetails.avatarUrl,
            },
            // 4. Credit Revenue Fee
            {
                userId: revenueUser.id,
                amount: fee,
                type: TransactionType.FEE,
                reference: generateTransactionReference('REV'),
                description: `Fee from ${senderDetails.name}`,
                metadata: { originalTx: `TRF-...` }, // Placeholder, will update below

                // Sender (User who paid)
                senderName: senderDetails.name,
                senderAccount: senderDetails.account,
                senderBankName: senderDetails.bankName,
                senderAvatarUrl: senderDetails.avatarUrl,

                // Receiver (Revenue)
                receiverName: revenueDetails.name,
                receiverAccount: revenueDetails.account,
                receiverBankName: revenueDetails.bankName,
                receiverAvatarUrl: revenueDetails.avatarUrl,
            },
        ];

        // Update Revenue Tx metadata with correct reference
        entries[3].metadata.originalTx = entries[0].reference;

        // Execute Atomic Transaction
        const results = await sharedWalletService.processLedgerEntry(entries);
        const senderTx = results[0];

        // Emit Socket Events (Sender)
        const senderNewBalance = await sharedWalletService.getWalletBalance(senderWallet.userId);
        socketService.emitToUser(senderWallet.userId, 'WALLET_UPDATED', {
            ...senderNewBalance,
            message: `Debit Alert: -₦${amount.toLocaleString()}`,
        });
        socketService.emitToUser(senderWallet.userId, 'TRANSACTION_CREATED', senderTx);
        socketService.emitToUser(senderWallet.userId, 'TRANSACTION_CREATED', results[1]); // Fee Tx

        // Fetch Sender Info
        const sender = await prisma.user.findUnique({
            where: { id: senderWallet.userId },
            select: { firstName: true, lastName: true },
        });
        const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'Unknown Sender';

        // Emit Socket Events (Receiver)
        const receiverNewBalance = await sharedWalletService.getWalletBalance(
            receiverWallet.userId
        );
        socketService.emitToUser(receiverWallet.userId, 'WALLET_UPDATED', {
            ...receiverNewBalance,
            message: `Credit Alert: +₦${amount.toLocaleString()}`,
            sender: { name: senderName, id: senderWallet.userId },
        });
        socketService.emitToUser(receiverWallet.userId, 'TRANSACTION_CREATED', results[2]);

        // Emit Event for Receiver (Credit Alert)
        eventBus.publish(EventType.TRANSACTION_COMPLETED, {
            userId: receiverWallet.userId,
            amount,
            type: 'DEPOSIT',
            counterpartyName: senderName,
            reference: results[2].reference, // Credit Tx Reference
            description: results[2].description,
            status: 'SUCCESS',
            date: new Date(),
        });

        // Emit Event for Sender (Debit Alert)
        eventBus.publish(EventType.TRANSACTION_COMPLETED, {
            userId: senderWallet.userId,
            amount,
            type: 'TRANSFER', // Treated as DEBIT by listener
            counterpartyName: destination.accountName,
            reference: senderTx.reference,
            description: senderTx.description,
            status: 'SUCCESS',
            date: new Date(),
        });

        return {
            message: 'Transfer successful',
            transactionId: senderTx.id,
            status: 'COMPLETED',
            amount,
            recipient: destination.accountName,
            transaction: formatTransactionForClient(senderTx),
        };
    }

    /**
     * Initiate External Transfer (Async)
     */
    private async initiateExternalTransfer(payload: TransferRequest, destination: any) {
        const { userId, amount, accountNumber, bankCode, narration, idempotencyKey } = payload;
        const fee = this.TRANSFER_FEE;

        const senderWallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!senderWallet) throw new NotFoundError('Sender wallet not found');

        const revenueUser = await this.getSystemRevenueUser();
        if (!revenueUser) throw new InternalError('System Revenue User not found');

        // Import helper functions
        const { getUserPartyDetails, buildExternalPartyDetails, generateTransactionReference } =
            await import('../../../shared/lib/utils/transaction-helpers');

        // Get party details
        const senderDetails = await getUserPartyDetails(senderWallet.userId);
        const revenueDetails = await getUserPartyDetails(revenueUser.id);
        const receiverDetails = buildExternalPartyDetails(
            destination.accountName,
            accountNumber,
            destination.bankName,
            bankCode
        );

        // Prepare Ledger Entries
        // 1. Debit Sender Principal
        // 2. Debit Sender Fee
        // 3. Credit Revenue Fee
        // (External Credit happens via Worker/Provider, not here)

        const entries = [
            // 1. Debit Sender Principal
            {
                userId: senderWallet.userId,
                amount: -amount,
                type: TransactionType.TRANSFER,
                reference: generateTransactionReference('NIP'),
                description: narration || `Transfer to ${destination.accountName}`,
                idempotencyKey,

                // Sender
                senderName: senderDetails.name,
                senderAccount: senderDetails.account,
                senderBankName: senderDetails.bankName,
                senderAvatarUrl: senderDetails.avatarUrl,

                // Receiver (External)
                receiverName: receiverDetails.name,
                receiverAccount: receiverDetails.account,
                receiverBankName: receiverDetails.bankName,
                receiverBankCode: receiverDetails.bankCode,
            },
            // 2. Debit Sender Fee
            {
                userId: senderWallet.userId,
                amount: -fee,
                type: TransactionType.FEE,
                reference: generateTransactionReference('FEE'),
                description: 'Transfer Fee',

                // Sender (User paying fee)
                senderName: senderDetails.name,
                senderAccount: senderDetails.account,
                senderBankName: senderDetails.bankName,
                senderAvatarUrl: senderDetails.avatarUrl,

                // Receiver (Revenue)
                receiverName: revenueDetails.name,
                receiverAccount: revenueDetails.account,
                receiverBankName: revenueDetails.bankName,
                receiverAvatarUrl: revenueDetails.avatarUrl,
            },
            // 3. Credit Revenue Fee
            {
                userId: revenueUser.id,
                amount: fee,
                type: TransactionType.FEE,
                reference: generateTransactionReference('REV'),
                description: `Fee from ${senderDetails.name}`,
                metadata: { originalTx: `NIP-...` }, // Will update with real ref

                // Sender (User who paid)
                senderName: senderDetails.name,
                senderAccount: senderDetails.account,
                senderBankName: senderDetails.bankName,
                senderAvatarUrl: senderDetails.avatarUrl,

                // Receiver (Revenue)
                receiverName: revenueDetails.name,
                receiverAccount: revenueDetails.account,
                receiverBankName: revenueDetails.bankName,
                receiverAvatarUrl: revenueDetails.avatarUrl,
            },
        ];

        // Execute Atomic Transaction
        const results = await sharedWalletService.processLedgerEntry(entries);
        const transaction = results[0]; // Principal Tx
        const feeTx = results[1];
        const revenueTx = results[2];

        // Update Metadata to link transactions
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                metadata: {
                    ...(transaction.metadata as object),
                    feeTransactionId: feeTx.id,
                    revenueTransactionId: revenueTx.id,
                },
            },
        });

        await prisma.transaction.update({
            where: { id: revenueTx.id },
            data: {
                metadata: {
                    ...(revenueTx.metadata as object),
                    originalTransactionId: transaction.id,
                },
            },
        });

        // 2. Add to Queue
        try {
            await getTransferQueue().add('process-external-transfer', {
                transactionId: transaction.id,
                destination,
                amount,
                narration,
            });
        } catch (error) {
            logger.error('Failed to queue transfer', error);
            // Reconciliation will handle stuck PENDING txs
        }

        // Emit Socket Event
        const senderNewBalance = await sharedWalletService.getWalletBalance(userId);
        socketService.emitToUser(userId, 'WALLET_UPDATED', {
            ...senderNewBalance,
            message: `Debit Alert: -₦${(amount + fee).toLocaleString()}`,
        });
        socketService.emitToUser(userId, 'TRANSACTION_CREATED', transaction);
        socketService.emitToUser(userId, 'TRANSACTION_CREATED', results[1]); // Fee Tx

        return {
            message: 'Transfer processing',
            transactionId: transaction.id,
            status: 'PENDING',
            amount,
            recipient: destination.accountName,
            transaction: formatTransactionForClient(transaction),
        };
    }
}

export const transferService = new TransferService();
