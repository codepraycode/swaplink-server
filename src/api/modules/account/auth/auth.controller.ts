import { Request, Response, NextFunction } from 'express';
import { sendCreated, sendSuccess } from '../../../../shared/lib/utils/api-response';
import { HttpStatusCode } from '../../../../shared/lib/utils/http-status-codes';
import authService from './auth.service';
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

    registerStep2 = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await authService.registerStep2(req.body);
            sendSuccess(res, result, 'Step 2 successful');
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

    refreshToken = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { refreshToken } = req.body;
            const result = await authService.refreshToken(refreshToken);

            sendSuccess(
                res,
                {
                    tokens: {
                        accessToken: result.accessToken,
                        refreshToken: result.refreshToken,
                        expiresIn: result.expiresIn,
                    },
                },
                'Token refreshed successfully'
            );
        } catch (error) {
            next(error);
        }
    };

    logout = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.userId;
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
            const userId = req.user!.userId;
            const user = await authService.getUser(userId);

            sendSuccess(res, user, 'User profile retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    // --- OTP Handling (Generic) ---

    sendOtp = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { identifier, type } = req.body;
            if (!identifier) throw new BadRequestError('Missing identifier');
            if (!type) throw new BadRequestError('Missing type');
            if (type !== 'phone' && type !== 'email') throw new BadRequestError('Invalid type');
            const result = await authService.sendOtp(identifier, type);
            sendSuccess(res, result, 'OTP sent successfully');
        } catch (error) {
            next(error);
        }
    };

    // --- KYC & Profile ---

    submitKyc = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.userId;
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };

            // 1. Extract Files
            const idDocumentFront = files?.idDocumentFront?.[0];
            const idDocumentBack = files?.idDocumentBack?.[0];
            const proofOfAddress = files?.proofOfAddress?.[0];
            const selfie = files?.selfie?.[0];

            if (!idDocumentFront || !proofOfAddress || !selfie) {
                throw new BadRequestError(
                    'Missing required files (idDocumentFront, proofOfAddress, selfie)'
                );
            }

            // 2. Extract and Transform Body
            // Multer populates req.body with text fields.
            // We expect fields like address[street], governmentId[type], etc.
            // We need to construct the object manually or use a parser.
            // Since we know the structure, we can map it manually for safety.

            const body = req.body;

            const kycData = {
                firstName: body.firstName,
                lastName: body.lastName,
                dateOfBirth: body.dateOfBirth,
                address: {
                    street: body.address.street,
                    city: body.address.city,
                    state: body.address.state,
                    country: body.address.country,
                    postalCode: body.address.postalCode,
                },
                governmentId: {
                    type: body.governmentId.type,
                    number: body.governmentId.number,
                },
            };

            // 3. Validate DTO
            // We can use class-validator here if we want strict validation
            // import { validate } from 'class-validator';
            // import { plainToInstance } from 'class-transformer';
            // const dto = plainToInstance(SubmitKycUnifiedDto, kycData);
            // const errors = await validate(dto);
            // if (errors.length > 0) throw new BadRequestError(formatErrors(errors));

            // For now, let's pass it to the service which can also validate or we assume basic presence checks above.
            // But let's do basic validation here.
            if (!kycData.firstName || !kycData.lastName || !kycData.dateOfBirth) {
                throw new BadRequestError('Missing personal details');
            }
            if (!kycData.address.street || !kycData.address.city || !kycData.address.country) {
                throw new BadRequestError('Missing address details');
            }
            if (!kycData.governmentId.type || !kycData.governmentId.number) {
                throw new BadRequestError('Missing government ID details');
            }

            const result = await kycService.submitKycUnified(userId, kycData, {
                idDocumentFront,
                idDocumentBack,
                proofOfAddress,
                selfie,
            });

            sendSuccess(res, result, 'KYC submitted successfully');
        } catch (error) {
            next(error);
        }
    };

    getVerificationStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.userId;
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
            const userId = req.user!.userId;
            const result = await authService.setupPin(userId, req.body);
            sendSuccess(res, result, 'Transaction PIN set successfully');
        } catch (error) {
            next(error);
        }
    };
}

export default new AuthController();
