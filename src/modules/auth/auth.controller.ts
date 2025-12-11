import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../lib/utils/api-response';
import { HttpStatusCode } from '../../lib/utils/http-status-codes';
import authService from './auth.service';

class AuthController {
    register = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await authService.register(req.body);

            sendSuccess(
                res,
                {
                    user: result.user,
                    tokens: {
                        accessToken: result.token,
                        refreshToken: result.refreshToken,
                        expiresIn: result.expiresIn,
                    },
                },
                'User registered successfully',
                HttpStatusCode.CREATED
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
                        accessToken: result.token,
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
            sendSuccess(res, result, 'Phone verified successfully');
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
            sendSuccess(res, result, 'Email verified successfully');
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
            const result = await authService.submitKyc(userId, req.body);
            sendSuccess(res, result, 'KYC submitted successfully');
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
