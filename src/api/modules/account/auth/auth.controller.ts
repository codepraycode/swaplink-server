import { Request, Response, NextFunction } from 'express';
import { sendCreated, sendSuccess } from '../../../../shared/lib/utils/api-response';
import { HttpStatusCode } from '../../../../shared/lib/utils/http-status-codes';
import authService from './auth.service';
import { storageService } from '../../../../shared/lib/services/storage.service';
import { BadRequestError } from '../../../../shared/lib/utils/api-error';
import { kycService } from '../kyc/kyc.service';

class AuthController {
    // --- Registration Steps ---

    registerStep1 = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await authService.registerStep1(req.body);
            sendCreated(res, result, 'Step 1 successful');
        } catch (error) {
            next(error);
        }
    };

    verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await authService.verifyOtp(req.body);
            sendSuccess(res, result, 'OTP verified successfully');
        } catch (error) {
            next(error);
        }
    };

    // --- Login & Session ---

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

    logout = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user.userId;
            const token = req.headers.authorization?.split(' ')[1];

            if (token) {
                await authService.logout(userId, token);
            }

            sendSuccess(res, null, 'Logged out successfully');
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

    // --- OTP Handling (Generic) ---

    sendOtp = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { identifier, type } = req.body;
            // Assuming body has identifier and type if not using DTO, or DTO is generic
            // But SendOtpDto was removed.
            // Let's assume the client sends { identifier: '...', type: 'email' | 'phone' }
            const result = await authService.sendOtp(identifier, type);
            sendSuccess(res, result, 'OTP sent successfully');
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

    resetPassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { resetToken, newPassword } = req.body;
            await authService.resetPassword(resetToken, newPassword);
            sendSuccess(res, null, 'Password reset successful');
        } catch (error) {
            next(error);
        }
    };

    // --- KYC & Profile ---

    submitKyc = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user.userId;

            if (!req.file) throw new BadRequestError('KYC Document is required');
            const { documentType } = req.body;

            if (!documentType) throw new BadRequestError('Document type is required');

            const result = await kycService.submitKycDocument(userId, req.file, documentType);
            sendSuccess(res, result, 'KYC submitted successfully');
        } catch (error) {
            next(error);
        }
    };

    verifyBvn = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user.userId;
            const { bvn } = req.body;

            if (!bvn) throw new BadRequestError('BVN is required');

            const result = await kycService.verifyBvn(userId, bvn);
            sendSuccess(res, result, 'BVN verified successfully');
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
            const user = await authService.getUser(userId);

            const statusData = {
                kycLevel: user.kycLevel,
                kycStatus: user.kycStatus,
                isVerified: user.isVerified,
                isKycCompleted: user.isKycCompleted,
                isPinSet: user.isPinSet,
                isEmailVerified: user.isEmailVerified,
                isPhoneVerified: user.isPhoneVerified,
                isTwoFactorEnabled: user.isTwoFactorEnabled,
            };

            sendSuccess(res, statusData, 'Verification status retrieved');
        } catch (error) {
            next(error);
        }
    };

    setupPin = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user.userId;
            const result = await authService.setupPin(userId, req.body);
            sendSuccess(res, result, 'Transaction PIN set successfully');
        } catch (error) {
            next(error);
        }
    };
}

export default new AuthController();
