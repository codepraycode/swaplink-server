import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../../services/notification.service';
import { sendSuccess } from '../../shared/lib/utils/api-response';
import { JwtUtils } from '../../shared/lib/utils/jwt-utils';

export class NotificationController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = JwtUtils.ensureAuthentication(req).userId;
            const notifications = await NotificationService.getAll(userId);
            return sendSuccess(res, notifications, 'Notifications retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    static async markAsRead(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = JwtUtils.ensureAuthentication(req).userId;
            const { id } = req.params;
            await NotificationService.markAsRead(userId, id);
            return sendSuccess(res, 'Notification marked as read');
        } catch (error) {
            next(error);
        }
    }

    static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = JwtUtils.ensureAuthentication(req).userId;
            await NotificationService.markAllAsRead(userId);
            return sendSuccess(res, 'All notifications marked as read');
        } catch (error) {
            next(error);
        }
    }
}
