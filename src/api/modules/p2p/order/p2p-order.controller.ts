import { Request, Response, NextFunction } from 'express';
import { P2POrderService } from './p2p-order.service';
import { sendSuccess, sendCreated } from '../../../../shared/lib/utils/api-response';
import { JwtUtils } from '../../../../shared/lib/utils/jwt-utils';

export class P2POrderController {
    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = JwtUtils.ensureAuthentication(req);
            const order = await P2POrderService.createOrder(userId, req.body);
            return sendCreated(res, order, 'Order created successfully');
        } catch (error) {
            next(error);
        }
    }

    static async getOne(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = JwtUtils.ensureAuthentication(req);
            const { id } = req.params;
            const order = await P2POrderService.getOrder(userId, id);
            return sendSuccess(res, order, 'Order retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    static async markAsPaid(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = JwtUtils.ensureAuthentication(req);
            const { id } = req.params;
            const order = await P2POrderService.markAsPaid(userId, id);
            return sendSuccess(res, order, 'Order marked as paid');
        } catch (error) {
            next(error);
        }
    }

    static async confirm(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = JwtUtils.ensureAuthentication(req);
            const { id } = req.params;
            const result = await P2POrderService.confirmOrder(userId, id);
            return sendSuccess(res, result, 'Order confirmed and funds released');
        } catch (error) {
            next(error);
        }
    }

    static async cancel(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = JwtUtils.ensureAuthentication(req);
            const { id } = req.params;
            const result = await P2POrderService.cancelOrder(userId, id);
            return sendSuccess(res, result, 'Order cancelled');
        } catch (error) {
            next(error);
        }
    }
}
