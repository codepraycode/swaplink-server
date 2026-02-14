import { Request, Response, NextFunction } from 'express';
import { P2PAdService } from './p2p-ad.service';
import { sendSuccess, sendCreated } from '../../../../shared/lib/utils/api-response';
import { JwtUtils } from '../../../../shared/lib/utils/jwt-utils';

export class P2PAdController {
    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = JwtUtils.ensureAuthentication(req);
            const ad = await P2PAdService.createAd(userId, req.body);
            return sendCreated(res, ad, 'Ad created successfully');
        } catch (error) {
            next(error);
        }
    }

    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Surrogate-Control', 'no-store');

            // Force 200 OK by removing conditional headers from request
            delete req.headers['if-none-match'];
            delete req.headers['if-modified-since'];

            // Extract userId if authenticated (optional for public feed, but needed for enrichment)
            let userId: string | undefined;
            if (req.user) {
                userId = req.user.id;
            }

            const ads = await P2PAdService.getAds(req.query, userId);
            return sendSuccess(res, ads, 'Ads retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    static async close(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = JwtUtils.ensureAuthentication(req);
            const { id } = req.params;
            const ad = await P2PAdService.closeAd(userId, id);
            return sendSuccess(res, ad, 'Ad closed successfully');
        } catch (error) {
            next(error);
        }
    }

    static async reactivate(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = JwtUtils.ensureAuthentication(req);
            const { id } = req.params;
            const ad = await P2PAdService.reactivateAd(userId, id);
            return sendSuccess(res, ad, 'Ad reactivated successfully');
        } catch (error) {
            next(error);
        }
    }

    static async engage(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = JwtUtils.ensureAuthentication(req);
            const { id } = req.params;
            const { amount } = req.body;
            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'Amount is required and must be positive' });
            }
            const ad = await P2PAdService.engageAd(userId, id, Number(amount));
            return sendSuccess(res, ad, 'Ad engaged successfully');
        } catch (error) {
            next(error);
        }
    }

    static async disengage(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = JwtUtils.ensureAuthentication(req);
            const { id } = req.params;
            const { amount } = req.body;
            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'Amount is required and must be positive' });
            }
            const ad = await P2PAdService.disengageAd(userId, id, Number(amount));
            return sendSuccess(res, ad, 'Ad disengaged successfully');
        } catch (error) {
            next(error);
        }
    }

    static async getMyAds(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = JwtUtils.ensureAuthentication(req);
            const ads = await P2PAdService.getUserAds(userId);
            return sendSuccess(res, ads, 'My ads retrieved successfully');
        } catch (error) {
            next(error);
        }
    }
}
