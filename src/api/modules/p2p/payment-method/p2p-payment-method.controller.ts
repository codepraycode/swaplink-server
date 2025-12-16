import { Request, Response, NextFunction } from 'express';
import { P2PPaymentMethodService } from './p2p-payment-method.service';
import { sendSuccess, sendCreated } from '../../../../shared/lib/utils/api-response';
import { JwtUtils } from '../../../../shared/lib/utils/jwt-utils';

export class P2PPaymentMethodController {
    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            // Assuming req.user is populated by auth middleware
            const { userId } = JwtUtils.ensureAuthentication(req);
            const paymentMethod = await P2PPaymentMethodService.createPaymentMethod(
                userId,
                req.body
            );

            return sendCreated(res, paymentMethod, 'Payment method added successfully');
        } catch (error) {
            next(error);
        }
    }

    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const methods = await P2PPaymentMethodService.getPaymentMethods(userId);

            return sendSuccess(res, methods, 'Payment methods retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const { id } = req.params;

            await P2PPaymentMethodService.deletePaymentMethod(userId, id);

            return sendSuccess(res, null, 'Payment method deleted successfully');
        } catch (error) {
            next(error);
        }
    }
}
