import crypto from 'crypto';
import { envConfig } from '../../../shared/config/env.config';
import { prisma } from '../../../shared/database';
import { walletService } from '../../../shared/lib/services/wallet.service';
import logger from '../../../shared/lib/utils/logger';
import { NotificationService } from '../../../services/notification.service';
import { NotificationType } from '../../../shared/database';

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
        sessionId?: string; // Often provided by banks
    }) {
        const { accountNumber, amount, reference } = data;

        // ====================================================
        // 1. IDEMPOTENCY CHECK (CRITICAL)
        // ====================================================
        // Check if we have already processed this specific bank reference.
        // If yes, stop immediately.
        const existingTx = await prisma.transaction.findUnique({
            where: { reference: reference },
        });

        if (existingTx) {
            logger.warn(`⚠️ Duplicate Webhook detected (Idempotency): ${reference}`);
            return; // Return successfully so the Bank stops retrying
        }

        // ====================================================
        // 2. Find Wallet
        // ====================================================
        const virtualAccount = await prisma.virtualAccount.findUnique({
            where: { accountNumber },
            include: { wallet: true },
        });

        if (!virtualAccount) {
            // If account doesn't exist, we can't credit.
            // We log error but DO NOT throw, or the bank will retry forever.
            logger.error(`❌ Virtual Account not found: ${accountNumber}`);
            return;
        }

        // ====================================================
        // 3. Atomic Credit
        // ====================================================
        try {
            // Ensure creditWallet handles the DB transaction internally
            // and creates the Transaction record with the 'reference' provided.
            await walletService.creditWallet(virtualAccount.wallet.userId, amount, {
                type: 'DEPOSIT',
                reference, // <--- Must use the BANK'S reference, not a new UUID
                description: 'Deposit via Globus Bank',
                metadata: data,
            });

            logger.info(`✅ Wallet credited: User ${virtualAccount.wallet.userId} +₦${amount}`);

            // Send Push Notification
            await NotificationService.sendToUser(
                virtualAccount.wallet.userId,
                'Deposit Received',
                `Your wallet has been credited with ₦${amount.toLocaleString()}`,
                {
                    reference,
                    amount,
                    type: 'DEPOSIT_SUCCESS',
                },
                NotificationType.TRANSACTION
            );
        } catch (error) {
            logger.error(`❌ Credit Failed for User ${virtualAccount.wallet.userId}`, error);
            throw error; // Throwing here causes 500, triggering Bank Retry (Good behavior for DB errors)
        }
    }
}

export const webhookService = new WebhookService();
