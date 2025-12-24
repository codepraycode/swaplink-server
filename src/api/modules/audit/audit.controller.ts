import { NextFunction, Request, Response } from 'express';
import { AuditService } from '../../../shared/lib/services/audit.service';
import { sendSuccess } from '../../../shared/lib/utils/api-response';
import { logError } from '../../../shared/lib/utils/logger';

export class AuditController {
    static async getLogs(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId, action, resource, startDate, endDate, page, limit } = req.query;

            const filter = {
                userId: userId as string,
                action: action as string,
                resource: resource as string,
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
                page: page ? parseInt(page as string) : 1,
                limit: limit ? parseInt(limit as string) : 20,
            };

            const result = await AuditService.findAll(filter);

            return sendSuccess(res, result, 'Audit logs retrieved successfully');
        } catch (error) {
            logError(error);
            next(error);
        }
    }
}
