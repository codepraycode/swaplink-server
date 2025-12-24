import { NextFunction, Request, Response } from 'express';
import { UserService } from './user.service';
import { sendSuccess } from '../../../../shared/lib/utils/api-response';
import { JwtUtils } from '../../../../shared/lib/utils/jwt-utils';
import { BadRequestError } from '../../../../shared/lib/utils/api-error';

export class UserController {
    static async updatePushToken(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = JwtUtils.ensureAuthentication(req).userId;
            const { token } = req.body;

            if (!token) {
                throw new BadRequestError('Token is required');
            }

            await UserService.updatePushToken(userId, token);

            return sendSuccess(res, 'Push token updated successfully');
        } catch (error) {
            console.error('Error updating push token:', error);
            // return sendError(res, 'Internal server error', 500);
            next(error);
        }
    }

    static async changePassword(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = JwtUtils.ensureAuthentication(req).userId;
            const { oldPassword, newPassword } = req.body;

            if (!oldPassword || !newPassword) {
                throw new BadRequestError('Old and new passwords are required');
            }

            await UserService.changePassword(userId, { oldPassword, newPassword });

            return sendSuccess(res, 'Password changed successfully');
        } catch (error) {
            // console.error('Error changing password:', error);
            next(error);
        }
    }

    static async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = JwtUtils.ensureAuthentication(req).userId;
            const data = req.body;

            const updatedUser = await UserService.updateProfile(userId, data);

            return sendSuccess(res, updatedUser, 'Profile updated successfully');
        } catch (error) {
            console.error('Error updating profile:', error);
            next(error);
        }
    }
}
