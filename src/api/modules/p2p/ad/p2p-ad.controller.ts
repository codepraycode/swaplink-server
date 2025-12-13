import { Request, Response, NextFunction } from 'express';
import { P2PAdService } from './p2p-ad.service';
import { sendSuccess, sendCreated } from '../../../../shared/lib/utils/api-response';

export class P2PAdController {
    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const ad = await P2PAdService.createAd(userId, req.body);
            return sendCreated(res, ad, 'Ad created successfully');
        } catch (error) {
            next(error);
        }
    }

    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const ads = await P2PAdService.getAds(req.query);
            return sendSuccess(res, ads, 'Ads retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    static async close(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const { id } = req.params;
            const ad = await P2PAdService.closeAd(userId, id);
            return sendSuccess(res, ad, 'Ad closed successfully');
        } catch (error) {
            next(error);
        }
    }
}
