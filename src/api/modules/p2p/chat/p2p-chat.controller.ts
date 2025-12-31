import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../../../shared/lib/utils/api-response';
import { storageService } from '../../../../shared/lib/services/storage.service';
import { P2PChatService } from './p2p-chat.service';
import { p2pOrderService } from '../p2p-order.service';
import { JwtUtils } from '../../../../shared/lib/utils/jwt-utils';

export class P2PChatController {
    static async uploadImage(req: Request, res: Response, next: NextFunction) {
        try {
            const user = JwtUtils.ensureAuthentication(req);
            const userId = user.id;
            const orderId = req.params.orderId;

            if (!orderId) {
                throw new Error('Order ID is required');
            }
            if (!req.file) {
                throw new Error('No file uploaded');
            }

            // Upload to S3/R2
            const url = await storageService.uploadFile(req.file, 'p2p-chat');

            if (!url) {
                throw new Error('Failed to upload file');
            }

            // mark as paid
            await p2pOrderService.markAsPaid(userId, orderId, url);

            return sendSuccess(res, { url }, 'Image uploaded successfully');
        } catch (error) {
            next(error);
        }
    }

    static async getMessages(req: Request, res: Response, next: NextFunction) {
        try {
            const { orderId } = req.params;
            const messages = await P2PChatService.getMessages(orderId);
            return sendSuccess(res, messages, 'Messages retrieved successfully');
        } catch (error) {
            next(error);
        }
    }
}
