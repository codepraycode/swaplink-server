import { Request, Response } from 'express';
import { webhookService } from './webhook.service';
import logger from '../../lib/utils/logger';

export class WebhookController {
    async handleGlobusWebhook(req: Request, res: Response) {
        try {
            const signature = req.headers['x-globus-signature'] as string;

            // 1. Access Raw Body (Buffer)
            // Ensure your app.ts middleware is configured as shown above!
            const rawBody = req.rawBody;

            if (!rawBody) {
                logger.error('❌ Raw body missing. Middleware misconfiguration.');
                return res.status(500).json({ message: 'Internal Server Error' });
            }

            // 2. Verify Signature
            if (!webhookService.verifySignature(rawBody, signature)) {
                logger.warn('⚠️ Invalid Webhook Signature');
                // Return 401/403 to tell Bank to stop (or verify credentials)
                return res.status(401).json({ message: 'Invalid signature' });
            }

            // 3. Process
            await webhookService.handleGlobusWebhook(req.body);

            return res.status(200).json({ message: 'Webhook received' });
        } catch (error) {
            logger.error('❌ Webhook Controller Error:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}

export const webhookController = new WebhookController();
