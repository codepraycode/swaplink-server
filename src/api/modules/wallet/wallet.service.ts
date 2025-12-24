import {
    prisma,
    TransactionStatus,
    TransactionType,
    NotificationType,
} from '../../../shared/database';
import { nameEnquiryService } from './name-enquiry.service';
import { beneficiaryService } from './beneficiary.service';
import {
    BadRequestError,
    NotFoundError,
    ForbiddenError,
} from '../../../shared/lib/utils/api-error';
import { randomUUID } from 'crypto';
import logger from '../../../shared/lib/utils/logger';
import { socketService } from '../../../shared/lib/services/socket.service';
import { walletService as sharedWalletService } from '../../../shared/lib/services/wallet.service';
import { NotificationService } from '../notification/notification.service';
import { getTransferQueue } from '../../../shared/lib/init/service-initializer';
import { redisConnection } from '../../../shared/config/redis.config';

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

export class WalletService {
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
            // We need to check if this internal account belongs to the sender
            // destination likely has accountName, but maybe not userId.
            // Let's rely on processInternalTransfer's check, OR fetch the account here.
            // Better: processInternalTransfer already checks wallet IDs.
            // But to be safe and fail fast:
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

    /**
     * Handle Internal Transfer (Atomic)
     */
    private async processInternalTransfer(payload: TransferRequest, destination: any) {
        const { userId, amount, accountNumber, narration, idempotencyKey } = payload;

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

        if (senderWallet.id === receiverWallet.id) {
            throw new BadRequestError('Cannot transfer to self');
        }

        // Atomic Transaction
        const result = await prisma.$transaction(async tx => {
            // Check Balance
            if (senderWallet.balance < amount) {
                throw new BadRequestError('Insufficient funds');
            }

            // Debit Sender
            const senderTx = await tx.transaction.create({
                data: {
                    userId: senderWallet.userId,
                    walletId: senderWallet.id,
                    type: TransactionType.TRANSFER,
                    amount: -amount,
                    balanceBefore: senderWallet.balance,
                    balanceAfter: senderWallet.balance - amount,
                    status: TransactionStatus.COMPLETED,
                    reference: `TRF-${randomUUID()}`,
                    description: narration || `Transfer to ${destination.accountName}`,
                    destinationAccount: accountNumber,
                    destinationBankCode: payload.bankCode,
                    destinationName: destination.accountName,
                    idempotencyKey,
                    counterpartyId: receiverWallet.userId,
                },
            });

            await tx.wallet.update({
                where: { id: senderWallet.id },
                data: { balance: { decrement: amount } },
            });

            // Credit Receiver
            await tx.transaction.create({
                data: {
                    userId: receiverWallet.userId,
                    walletId: receiverWallet.id,
                    type: TransactionType.DEPOSIT,
                    amount: amount,
                    balanceBefore: receiverWallet.balance,
                    balanceAfter: receiverWallet.balance + amount,
                    status: TransactionStatus.COMPLETED,
                    reference: `DEP-${randomUUID()}`,
                    description: narration || `Received from ${senderWallet.userId}`, // Ideally user name
                    metadata: { senderId: senderWallet.userId },
                    counterpartyId: senderWallet.userId,
                },
            });

            await tx.wallet.update({
                where: { id: receiverWallet.id },
                data: { balance: { increment: amount } },
            });

            return {
                message: 'Transfer successful',
                transactionId: senderTx.id,
                status: 'COMPLETED',
                amount,
                recipient: destination.accountName,
            };
        });

        // Emit Socket Events (Sender)
        const senderNewBalance = await sharedWalletService.getWalletBalance(senderWallet.userId);
        socketService.emitToUser(senderWallet.userId, 'WALLET_UPDATED', {
            ...senderNewBalance,
            message: `Debit Alert: -₦${amount.toLocaleString()}`,
        });

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
            sender: {
                name: senderName,
                id: senderWallet.userId,
            },
        });

        // Send Push Notification to Receiver
        await NotificationService.sendToUser(
            receiverWallet.userId,
            'Credit Alert',
            `You received ₦${amount.toLocaleString()} from ${senderName}`,
            {
                transactionId: result.transactionId,
                type: 'DEPOSIT',
                sender: { name: senderName, id: senderWallet.userId },
            },
            NotificationType.TRANSACTION
        );

        // Send Push Notification to Sender
        await NotificationService.sendToUser(
            senderWallet.userId,
            'Debit Alert',
            `You sent ₦${amount.toLocaleString()} to ${destination.accountName}`,
            {
                transactionId: result.transactionId,
                type: 'DEBIT',
                sender: { name: senderName, id: senderWallet.userId },
            },
            NotificationType.TRANSACTION
        );

        return result;
    }

    /**
     * Initiate External Transfer (Async)
     */
    private async initiateExternalTransfer(payload: TransferRequest, destination: any) {
        const { userId, amount, accountNumber, bankCode, narration, idempotencyKey } = payload;
        const fee = 0; // TODO: Implement fee logic

        const senderWallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!senderWallet) throw new NotFoundError('Sender wallet not found');

        if (senderWallet.balance < amount + fee) {
            throw new BadRequestError('Insufficient funds');
        }

        // 1. Debit & Create Pending Transaction
        const transaction = await prisma.$transaction(async tx => {
            const txRecord = await tx.transaction.create({
                data: {
                    userId: senderWallet.userId,
                    walletId: senderWallet.id,
                    type: TransactionType.TRANSFER,
                    amount: -(amount + fee),
                    balanceBefore: senderWallet.balance,
                    balanceAfter: senderWallet.balance - (amount + fee),
                    status: TransactionStatus.PENDING,
                    reference: `NIP-${randomUUID()}`,
                    description: narration || `Transfer to ${destination.accountName}`,
                    destinationAccount: accountNumber,
                    destinationBankCode: bankCode,
                    destinationName: destination.accountName,
                    fee,
                    idempotencyKey,
                    // counterpartyId: null, // External transfer has no internal counterparty user
                },
            });

            await tx.wallet.update({
                where: { id: senderWallet.id },
                data: { balance: { decrement: amount + fee } },
            });

            return txRecord;
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
            // In a real system, we might want to reverse the debit here or have a reconciliation job pick it up
            // For now, we'll rely on the reconciliation job
        }

        // Emit Socket Event
        const senderNewBalance = await sharedWalletService.getWalletBalance(userId);
        socketService.emitToUser(userId, 'WALLET_UPDATED', {
            ...senderNewBalance,
            message: `Debit Alert: -₦${(amount + fee).toLocaleString()}`,
        });

        return {
            message: 'Transfer processing',
            transactionId: transaction.id,
            status: 'PENDING',
            amount,
            recipient: destination.accountName,
        };
    }
}

export const walletService = new WalletService();
