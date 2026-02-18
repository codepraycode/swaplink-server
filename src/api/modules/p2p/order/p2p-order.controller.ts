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

            let paymentProofUrl: string | undefined;
            if (req.file) {
                paymentProofUrl = await storageService.uploadFile(req.file, 'p2p-proofs');
                if (!paymentProofUrl) {
                    throw new BadRequestError('Failed to upload payment proof');
                }
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

    static async submitProof(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = JwtUtils.ensureAuthentication(req);
            const { id } = req.params;

            if (!req.file) {
                throw new BadRequestError('Payment proof file is required');
            }

            const paymentProofUrl = await storageService.uploadFile(req.file, 'p2p-proofs');
            if (!paymentProofUrl) {
                throw new BadRequestError('Failed to upload payment proof');
            }

            const order = await P2POrderService.submitMakerProof(userId, id, paymentProofUrl);
            const transformed = P2POrderController.transformOrder(order, userId);
            return sendSuccess(res, transformed, 'Payment proof submitted successfully');
        } catch (error) {
            next(error);
        }
    }

    private static transformOrder(order: any, userId: string) {
        const isBuyAd = order.ad.type === AdType.BUY_FX;

        // In P2P:
        // BUY_FX Ad: Maker WANTS FX (Buyer), Taker GIVES FX (Seller)
        // SELL_FX Ad: Maker GIVES FX (Seller), Taker WANTS FX (Buyer)
        const buyer = isBuyAd ? order.maker : order.taker;
        const seller = isBuyAd ? order.taker : order.maker;

        // The "owner" is the one who created the ad
        const owner = order.maker;

        // The "sender" in terms of payment depends on the ad type:
        // In BUY_FX: Maker (Buyer) sends NGN (out of system) -> Taker (Seller).
        // But the ORDER is created by the person who submitted proof.
        // Usually, the "sender" is the one who provides the payment proof.
        const sender = order.takerId === userId ? order.taker : order.maker;

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
            owner: sanitize(owner),
            sender: sanitize(sender),
            userSide: userId === buyer?.id ? 'BUYER' : 'SELLER',
            paymentMethod: order.ad.paymentMethod, // Include ad payment method if available
        };
    }
}
