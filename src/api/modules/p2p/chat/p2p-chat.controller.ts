import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../../../shared/lib/utils/api-response';
import { storageService } from '../../../../shared/lib/services/storage.service';
import { P2PChatService } from './p2p-chat.service';
import { P2POrderService } from '../order/p2p-order.service';
import { JwtUtils } from '../../../../shared/lib/utils/jwt-utils';
import { BadRequestError } from '../../../../shared/lib/utils/api-error';

export class P2PChatController {
    static async uploadImage(req: Request, res: Response, next: NextFunction) {
        try {
            const user = JwtUtils.ensureAuthentication(req);
            const userId = user.userId;
            const orderId = req.query.orderId as string;

            console.debug({ userId, orderId, user });

            if (!userId) {
                throw new BadRequestError('You must be authenticated');
            }
            if (!orderId) {
                throw new BadRequestError('Order ID is required');
            }
            if (!req.file) {
                throw new BadRequestError('No file uploaded');
            }

            // Upload to S3/R2
            const url = await storageService.uploadFile(req.file, 'p2p-chat');

            if (!url) {
                throw new BadRequestError('Failed to upload file');
            }

            // mark as paid
            await P2POrderService.markAsPaid(userId, orderId, url);

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
