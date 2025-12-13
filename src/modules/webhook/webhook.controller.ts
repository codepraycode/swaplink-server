import { Request, Response } from 'express';
import { webhookService } from './webhook.service';
import logger from '../../lib/utils/logger';

export class WebhookController {
    async handleGlobusWebhook(req: Request, res: Response) {
        try {
            const signature = req.headers['x-globus-signature'] as string;
            const payload = req.body;

            // 1. Verify Signature
            if (!webhookService.verifySignature(payload, signature)) {
                logger.warn('⚠️ Invalid Webhook Signature');
                return res.status(401).json({ message: 'Invalid signature' });
            }

            // 2. Process Webhook (Async)
            // We await here to ensure we return 200 only if processed,
            // or we could fire-and-forget if we want fast response.
            // Usually, providers want a 200 OK quickly.
            await webhookService.handleGlobusWebhook(payload);

            return res.status(200).json({ message: 'Webhook received' });
        } catch (error) {
            logger.error('❌ Webhook Error:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}

export const webhookController = new WebhookController();
