import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../../../shared/lib/utils/api-response';
import authService from './auth.service';

class PasswordController {
    requestPasswordReset = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email } = req.body;
            await authService.requestPasswordReset(email);
            // Always return success message for security (prevent email enumeration)
            sendSuccess(res, { message: 'If email exists, OTP sent' }, 'Password reset initiated');
        } catch (error) {
            next(error);
        }
    };

    verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // We can enforce purpose here if needed, or rely on DTO validation
            // For extra safety, we could override the purpose in the body or check it
            if (req.body.purpose !== 'PASSWORD_RESET') {
                req.body.purpose = 'PASSWORD_RESET';
            }

            const result = await authService.verifyOtp(req.body);
            sendSuccess(res, result, 'OTP verified successfully');
        } catch (error) {
            next(error);
        }
    };

    resetPassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { resetToken, newPassword } = req.body;
            await authService.resetPassword(resetToken, newPassword);
            sendSuccess(res, null, 'Password reset successful');
        } catch (error) {
            next(error);
        }
    };
}

export default new PasswordController();
