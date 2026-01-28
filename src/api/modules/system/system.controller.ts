import { Request, Response, NextFunction } from 'express';
import { systemService } from './system.service';
import { HttpStatusCode } from '../../../shared/lib/utils/http-status-codes';

class SystemController {
    async checkHealth(req: Request, res: Response, next: NextFunction) {
        try {
            const health = await systemService.checkHealth();
            const statusCode =
                health.status === 'OK' ? HttpStatusCode.OK : HttpStatusCode.SERVICE_UNAVAILABLE;
            res.status(statusCode).json(health);
        } catch (error) {
            next(error);
        }
    }

    getSystemInfo(req: Request, res: Response, next: NextFunction) {
        try {
            const info = systemService.getSystemInfo();
            res.status(200).json({
                success: true,
                data: info,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const systemController = new SystemController();
