import { Request, Response, NextFunction } from 'express';
console.log('🔄 [DEBUG] auth.controller.ts loading...');
import { sendCreated, sendSuccess } from '../../../shared/lib/utils/api-response';
import { HttpStatusCode } from '../../../shared/lib/utils/http-status-codes';
import authService from './auth.service';
import { storageService } from '../../../shared/lib/services/storage.service';

class AuthController {
    register = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await authService.register(req.body);

            sendCreated(
                res,
                {
                    user: result.user,
                    tokens: {
                        accessToken: result.accessToken,
                        refreshToken: result.refreshToken,
                        expiresIn: result.expiresIn,
                    },
                },
                'User registered successfully'
            );
        } catch (error) {
            next(error);
        }
    };

    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await authService.login(req.body);

            sendSuccess(
                res,
                {
                    user: result.user,
                    tokens: {
                        accessToken: result.accessToken,
                        refreshToken: result.refreshToken,
                        expiresIn: result.expiresIn,
                    },
                },
                'User logged in successfully',
                HttpStatusCode.OK
            );
        } catch (error) {
            next(error);
        }
    };

    me = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Assuming your 'authenticate' middleware attaches user to req
            const userId = (req as any).user.userId;
            const user = await authService.getUser(userId);

            sendSuccess(res, { user }, 'User profile retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    refreshToken = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { refreshToken } = req.body;
            const result = await authService.refreshToken(refreshToken);
            sendSuccess(res, result, 'Token refreshed successfully');
        } catch (error) {
            next(error);
        }
    };

    // --- OTP Handling ---

    sendPhoneOtp = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { phone } = req.body;
            const result = await authService.sendOtp(phone, 'phone');
            sendSuccess(res, result, 'OTP sent successfully');
        } catch (error) {
            next(error);
        }
    };

    verifyPhoneOtp = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { phone, otp } = req.body;
            const result = await authService.verifyOtp(phone, otp, 'phone');
            const message = result.kycLevelUpgraded
                ? 'Phone verified successfully! Your account has been upgraded to BASIC KYC level.'
                : 'Phone verified successfully';
            sendSuccess(res, result, message);
        } catch (error) {
            next(error);
        }
    };

    sendEmailOtp = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email } = req.body;
            const result = await authService.sendOtp(email, 'email');
            sendSuccess(res, result, 'OTP sent successfully');
        } catch (error) {
            next(error);
        }
    };

    verifyEmailOtp = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email, otp } = req.body;
            const result = await authService.verifyOtp(email, otp, 'email');
            const message = result.kycLevelUpgraded
                ? 'Email verified successfully! Your account has been upgraded to BASIC KYC level.'
                : 'Email verified successfully';
            sendSuccess(res, result, message);
        } catch (error) {
            next(error);
        }
    };

    // --- Password Reset ---

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

    verifyResetOtp = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email, otp } = req.body;
            const result = await authService.verifyResetOtp(email, otp);
            sendSuccess(res, result, 'OTP verified');
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

    // --- KYC ---

    submitKyc = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user.userId;

            if (!req.file) throw new Error('KYC Document is required');

            const documentUrl = await storageService.uploadFile(req.file, 'kyc');

            const result = await authService.submitKyc(userId, { ...req.body, documentUrl });
            sendSuccess(res, result, 'KYC submitted successfully');
        } catch (error) {
            next(error);
        }
    };

    updateAvatar = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user.userId;

            if (!req.file) throw new Error('Avatar image is required');

            const avatarUrl = await storageService.uploadFile(req.file, 'avatars');

            const result = await authService.updateAvatar(userId, avatarUrl);
            sendSuccess(res, result, 'Avatar updated successfully');
        } catch (error) {
            next(error);
        }
    };

    getVerificationStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user.userId;
            // Since we didn't explicitly create getVerificationStatus in the service refactor,
            // we can reuse getUser to get the status fields
            const user = await authService.getUser(userId);

            const statusData = {
                kycLevel: user.kycLevel,
                kycStatus: user.kycStatus, // Assuming this field exists on user
                isVerified: user.isVerified,
            };

            sendSuccess(res, statusData, 'Verification status retrieved');
        } catch (error) {
            next(error);
        }
    };
}

export default new AuthController();
