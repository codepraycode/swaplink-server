import { Request, Response, NextFunction } from 'express';
import { P2POrderService } from './p2p-order.service';
import { sendSuccess, sendCreated } from '../../../../shared/lib/utils/api-response';
import { JwtUtils } from '../../../../shared/lib/utils/jwt-utils';
import { AdType } from '../../../../shared/database';
import { storageService } from '../../../../shared/lib/services/storage.service';
import { BadRequestError } from '../../../../shared/lib/utils/api-error';

export class P2POrderController {
    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = JwtUtils.ensureAuthentication(req);

            // Upload proof file to storage
            if (!req.file) {
                throw new BadRequestError('Payment proof file is required');
            }
            const paymentProofUrl = await storageService.uploadFile(req.file, 'p2p-proofs');
            if (!paymentProofUrl) {
                throw new BadRequestError('Failed to upload payment proof');
            }

            const order = await P2POrderService.createOrder(userId, {
                ...req.body,
                paymentProofUrl,
            });
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

    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = JwtUtils.ensureAuthentication(req);
            const orders = await P2POrderService.getUserOrders(userId);
            const transformed = orders.map(order =>
                P2POrderController.transformOrder(order, userId)
            );
            return sendSuccess(res, transformed, 'Orders retrieved successfully');
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

        return {
            ...order,
            buyer: sanitize(buyer),
            seller: sanitize(seller),
            userSide: userId === buyer?.id ? 'BUYER' : 'SELLER',
        };
    }
}
