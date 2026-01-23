import crypto from 'crypto';
import { envConfig } from '../../../shared/config/env.config';
import { prisma, TransactionType } from '../../../shared/database';
import { walletService } from '../../../shared/lib/services/wallet.service';
import logger from '../../../shared/lib/utils/logger';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../../shared/database';
import { InternalError } from '../../../shared/lib/utils/api-error';

export class WebhookService {
    /**
     * Verifies the signature using the RAW BUFFER.
     * Do not use req.body (parsed JSON) for this.
     */
    verifySignature(rawBody: Buffer, signature: string): boolean {
        if (envConfig.NODE_ENV !== 'production') {
            logger.warn('ℹ️ Globus Signature skipped!');
            return true;
        }

        // Security: In Prod, reject if secret is missing
        if (!envConfig.GLOBUS_WEBHOOK_SECRET) {
            logger.error('❌ GLOBUS_WEBHOOK_SECRET missing in production!');

            const isStaging = process.env.STAGING === 'true';

            if (isStaging) {
                logger.warn('ℹ️ Globus Signature skipped in staging!');
                return true;
            }
            return false;
        }

        const hash = crypto
            .createHmac('sha256', envConfig.GLOBUS_WEBHOOK_SECRET)
            .update(rawBody) // <--- Use Buffer, not JSON string
            .digest('hex');

        return hash === signature;
    }

    async handleGlobusWebhook(payload: any) {
        logger.info('🪝 Received Globus Webhook:', payload);

        const { type, data } = payload;

        if (type === 'credit_notification') {
            await this.processCredit(data);
        } else {
            logger.info(`ℹ️ Unhandled webhook type: ${type}`);
        }
    }

    private async processCredit(data: {
        accountNumber: string;
        amount: number;
        reference: string;
        sessionId?: string;
        originatorName?: string;
        originatorAccount?: string;
        originatorBank?: string;
    }) {
        const { accountNumber, amount, reference } = data;
        const INBOUND_FEE = 53.5;
        const SYSTEM_REVENUE_EMAIL = 'revenue@bcdees.com';

        // ====================================================
        // 1. IDEMPOTENCY CHECK (CRITICAL)
        // ====================================================
        const existingTx = await prisma.transaction.findUnique({
            where: { reference: reference },
        });

        if (existingTx) {
            logger.warn(`⚠️ Duplicate Webhook detected (Idempotency): ${reference}`);
            return;
        }

        // ====================================================
        // 2. Find Wallet
        // ====================================================
        const virtualAccount = await prisma.virtualAccount.findUnique({
            where: { accountNumber },
            include: { wallet: true },
        });

        if (!virtualAccount) {
            logger.error(`❌ Virtual Account not found: ${accountNumber}`);
            return;
        }

        // ====================================================
        // 3. Prepare Ledger Entries
        // ====================================================
        try {
            const { getUserPartyDetails, buildExternalPartyDetails } =
                await import('../../../shared/lib/utils/transaction-helpers');

            // Get receiver (user) details
            const receiverDetails = await getUserPartyDetails(virtualAccount.wallet.userId);

            // Build sender details from webhook data
            const senderDetails = buildExternalPartyDetails(
                data.originatorName,
                data.originatorAccount,
                data.originatorBank
            );

            const entries = [];

            // 1. Credit User Principal
            entries.push({
                userId: virtualAccount.wallet.userId,
                amount: amount,
                type: TransactionType.DEPOSIT,
                reference: reference, // Bank Ref
                description: 'Deposit via Globus Bank',
                metadata: data,

                // Sender Details
                senderName: senderDetails.name,
                senderAccount: senderDetails.account,
                senderBankName: senderDetails.bankName,
                senderBankCode: senderDetails.bankCode,

                // Receiver Details
                receiverName: receiverDetails.name,
                receiverAccount: receiverDetails.account,
                receiverBankName: receiverDetails.bankName,
                receiverAvatarUrl: receiverDetails.avatarUrl,
            });

            // 2. Deduct Fee (if amount covers it)
            if (amount > INBOUND_FEE) {
                const revenueUser = await prisma.user.findUnique({
                    where: { email: SYSTEM_REVENUE_EMAIL },
                });
                if (!revenueUser) throw new InternalError('System Revenue User not found');

                const revenueDetails = await getUserPartyDetails(revenueUser.id);

                // Debit User
                entries.push({
                    userId: virtualAccount.wallet.userId,
                    amount: -INBOUND_FEE,
                    type: TransactionType.FEE,
                    reference: `FEE-${reference}`,
                    description: 'Inbound Deposit Fee',

                    // Sender (User paying fee)
                    senderName: receiverDetails.name,
                    senderAccount: receiverDetails.account,
                    senderBankName: receiverDetails.bankName,
                    senderAvatarUrl: receiverDetails.avatarUrl,

                    // Receiver (Revenue account)
                    receiverName: revenueDetails.name,
                    receiverAccount: revenueDetails.account,
                    receiverBankName: revenueDetails.bankName,
                    receiverAvatarUrl: revenueDetails.avatarUrl,
                });

                // Credit Revenue
                entries.push({
                    userId: revenueUser.id,
                    amount: INBOUND_FEE,
                    type: TransactionType.FEE,
                    reference: `REV-${reference}`,
                    description: `Fee from ${receiverDetails.name}`,
                    metadata: { originalTx: reference },

                    // Sender (User who paid)
                    senderName: receiverDetails.name,
                    senderAccount: receiverDetails.account,
                    senderBankName: receiverDetails.bankName,
                    senderAvatarUrl: receiverDetails.avatarUrl,

                    // Receiver (Revenue account)
                    receiverName: revenueDetails.name,
                    receiverAccount: revenueDetails.account,
                    receiverBankName: revenueDetails.bankName,
                    receiverAvatarUrl: revenueDetails.avatarUrl,
                });
            }

            // ====================================================
            // 4. Atomic Execution
            // ====================================================
            const results = await walletService.processLedgerEntry(entries);
            const mainTx = results[0];

            logger.info(`✅ Wallet credited: User ${virtualAccount.wallet.userId} +₦${amount}`);

            // Emit Socket Events (handled by processLedgerEntry for individual txs, but we might want a summary?)
            // processLedgerEntry emits TRANSACTION_CREATED for each.
            // But WALLET_UPDATED is emitted for each too.
            // That's fine.

            // Send Push Notification
            await NotificationService.sendToUser(
                virtualAccount.wallet.userId,
                'Deposit Received',
                `Your wallet has been credited with ₦${amount.toLocaleString()}`,
                {
                    reference,
                    amount,
                    type: 'DEPOSIT_SUCCESS',
                    transactionId: mainTx.id,
                },
                NotificationType.TRANSACTION
            );
        } catch (error) {
            logger.error(`❌ Credit Failed for User ${virtualAccount.wallet.userId}`, error);
            throw error;
        }
    }
}

export const webhookService = new WebhookService();
