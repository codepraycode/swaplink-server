import express, { Router } from 'express';
import authController from './auth.controller';
import rateLimiters from '../../../middlewares/rate-limit.middleware';
import { uploadKyc, uploadAvatar, uploadBiometrics } from '../../../middlewares/upload.middleware';
import { validateDto } from '../../../middlewares/validation.middleware';
import { deviceIdMiddleware } from '../../../middlewares/auth/device-id.middleware';
import { SubmitKycInfoDto } from '../kyc/kyc.dto';
import {
    RegisterStep1Dto,
    RegisterStep2Dto,
    VerifyOtpDto,
    LoginDto,
    SetupTransactionPinDto,
} from './auth.dto';
import { authenticate } from '../../../middlewares/auth/auth.middleware';

const router: Router = express.Router();

// ======================================================
// 1. Onboarding & Authentication
// ======================================================

// Step 1: Registration (Name, Email, Password)
router.post(
    '/register/step1',
    rateLimiters.auth,
    deviceIdMiddleware,
    validateDto(RegisterStep1Dto),
    authController.registerStep1
);

// Step 2: Registration (Phone, Password Verify)
router.post(
    '/register/step2',
    rateLimiters.auth,
    deviceIdMiddleware,
    validateDto(RegisterStep2Dto),
    authController.registerStep2
);

// Verify OTP (Email or Phone)
router.post(
    '/verify-otp',
    rateLimiters.auth,
    deviceIdMiddleware,
    validateDto(VerifyOtpDto),
    authController.verifyOtp
);

// Login
router.post(
    '/login',
    rateLimiters.auth,
    deviceIdMiddleware,
    validateDto(LoginDto),
    authController.login
);

router.post('/logout', rateLimiters.auth, authController.logout);

// ======================================================
// 2. OTP Services
// ======================================================

// Send OTP (Generic)
router.post(
    '/otp/send',
    [rateLimiters.otpSource, rateLimiters.otpTarget],
    // validateDto(SendOtpDto), // SendOtpDto was removed, need to check if we use a generic one or create it
    authController.sendOtp
);

// ======================================================
// 3. Password Management
// ======================================================

router.post(
    '/password/reset-request',
    // validateDto(RequestPasswordResetDto), // Removed
    authController.requestPasswordReset
);

router.post(
    '/password/reset',
    // validateDto(ResetPasswordDto), // Removed
    authController.resetPassword
);

// ======================================================
// 4. Authentication
// ======================================================

router.use(authenticate);

router.get('/me', authController.me);

router.post('/pin/setup', validateDto(SetupTransactionPinDto), authController.setupPin);

// ======================================================
// 5. KYC & Compliance
// ======================================================

router.post('/kyc', rateLimiters.global, uploadKyc.single('document'), authController.submitKyc);

router.post('/kyc/bvn', rateLimiters.global, authController.verifyBvn);

router.post(
    '/kyc/info',
    rateLimiters.global,
    validateDto(SubmitKycInfoDto),
    authController.submitKycInfo
);

router.post(
    '/kyc/biometrics',
    rateLimiters.global,
    uploadBiometrics.fields([
        { name: 'selfie', maxCount: 1 },
        { name: 'video', maxCount: 1 },
    ]),
    authController.submitBiometrics
);

router.post('/profile/avatar', uploadAvatar.single('avatar'), authController.updateAvatar);

router.get('/verification-status', authController.getVerificationStatus);

export default router;
