import crypto from 'crypto';
import { envConfig } from '../../config/env.config';
import { prisma } from '../../database';
import { walletService } from '../../lib/services/wallet.service';
import logger from '../../lib/utils/logger';

export class WebhookService {
    /**
     * Verifies the signature of the webhook request from Globus.
     * @param payload - The raw request body.
     * @param signature - The signature header (x-globus-signature).
     */
    verifySignature(payload: any, signature: string): boolean {
        if (!envConfig.GLOBUS_WEBHOOK_SECRET) {
            logger.warn('⚠️ GLOBUS_WEBHOOK_SECRET is not set. Skipping signature verification.');
            return true; // Allow in dev/test if secret is missing (or return false based on strictness)
        }

        const hash = crypto
            .createHmac('sha256', envConfig.GLOBUS_WEBHOOK_SECRET)
            .update(JSON.stringify(payload))
            .digest('hex');

        return hash === signature;
    }

    /**
     * Handles the webhook payload.
     * @param payload - The webhook data.
     */
    async handleGlobusWebhook(payload: any) {
        logger.info('🪝 Received Globus Webhook:', payload);

        // Example Payload Structure (Hypothetical - adjust based on actual Globus docs)
        // { type: 'credit_notification', data: { accountNumber: '123', amount: 1000, reference: 'ref_123' } }

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
    }) {
        const { accountNumber, amount, reference } = data;

        // 1. Find Wallet by Virtual Account Number
        const virtualAccount = await prisma.virtualAccount.findUnique({
            where: { accountNumber },
            include: { wallet: true },
        });

        if (!virtualAccount) {
            logger.error(`❌ Virtual Account not found for number: ${accountNumber}`);
            return;
        }

        // 2. Credit Wallet
        try {
            await walletService.creditWallet(virtualAccount.wallet.userId, amount, {
                type: 'DEPOSIT',
                reference,
                description: 'Deposit via Globus Bank',
                source: 'GLOBUS_WEBHOOK',
            });
            logger.info(`✅ Wallet credited for User ${virtualAccount.wallet.userId}: +₦${amount}`);
        } catch (error) {
            logger.error(
                `❌ Failed to credit wallet for User ${virtualAccount.wallet.userId}`,
                error
            );
            throw error; // Retry via webhook provider usually
        }
    }
}

export const webhookService = new WebhookService();
