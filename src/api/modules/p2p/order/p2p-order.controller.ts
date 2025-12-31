import { Request, Response, NextFunction } from 'express';
import { P2POrderService } from './p2p-order.service';
import { sendSuccess, sendCreated } from '../../../../shared/lib/utils/api-response';
import { JwtUtils } from '../../../../shared/lib/utils/jwt-utils';
import { AdType } from '../../../../shared/database';

export class P2POrderController {
    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = JwtUtils.ensureAuthentication(req);
            const order = await P2POrderService.createOrder(userId, req.body);
            const transformed = P2POrderController.transformOrder(order, userId);
            return sendCreated(res, transformed, 'Order created successfully');
        } catch (error) {
            next(error);
        }
    }

    static async getOne(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = JwtUtils.ensureAuthentication(req);
            const { id } = req.params;
            const order = await P2POrderService.getOrder(userId, id);
            const transformed = P2POrderController.transformOrder(order, userId);
            return sendSuccess(res, transformed, 'Order retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    static async confirm(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = JwtUtils.ensureAuthentication(req);
            const { id } = req.params;
            const result = await P2POrderService.confirmOrder(userId, id);
            return sendSuccess(res, result, 'Order confirmed. Funds will be released soon.');
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

    private static transformOrder(order: any, userId: string) {
        const isBuyAd = order.ad.type === AdType.BUY_FX;

        const buyer = isBuyAd ? order.maker : order.taker;
        const seller = isBuyAd ? order.taker : order.maker;

        const sanitize = (u: any) => {
            if (!u) return null;
            return {
                id: u.id,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                avatarUrl: u.avatarUrl,
                kycLevel: u.kycLevel,
            };
        };

        const payTimeLimit = 15 * 60; // 15 mins in seconds
        const expiresAt = new Date(order.expiresAt).getTime();
        const now = Date.now();
        const remainingTime = Math.max(0, Math.floor((expiresAt - now) / 1000));

        return {
            ...order,
            payTimeLimit,
            remainingTime,
            buyer: sanitize(buyer),
            seller: sanitize(seller),
            userSide: userId === buyer?.id ? 'BUYER' : 'SELLER',
        };
    }
}
