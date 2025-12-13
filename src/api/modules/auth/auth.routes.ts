import express, { Router } from 'express';
import authController from './auth.controller';
import rateLimiters from '../../middlewares/rate-limit.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { uploadKyc, uploadAvatar } from '../../middlewares/upload.middleware'; // You need this for KYC!
// import { validateBody } from '../../middlewares/validation';
// import { AuthSchema } from './auth.validation';

const router: Router = express.Router();

// Mock validation for now (Replace with Zod/Joi later)
const validateBody = (schema: any) => (req: any, res: any, next: any) => next();
const AuthSchema = {};

// ======================================================
// 1. Onboarding & Authentication
// ======================================================

router.post(
    '/register',
    rateLimiters.auth, // Strict limit (prevents mass account creation)
    validateBody(AuthSchema),
    authController.register
);

router.post(
    '/login',
    rateLimiters.auth, // Strict limit (prevents credential stuffing)
    validateBody(AuthSchema),
    authController.login
);

router.post(
    '/refresh-token',
    rateLimiters.auth,
    validateBody(AuthSchema),
    authController.refreshToken
);

router.get('/me', authenticate, authController.me);

// ======================================================
// 2. OTP Services (Dual Layer Protection)
// ======================================================
// We apply Source + Target limits to BOTH Phone and Email
// to save costs and prevent harassment.

// --- Phone ---
router.post(
    '/otp/phone',
    [rateLimiters.otpSource, rateLimiters.otpTarget], // <--- Fixed Accessor
    authController.sendPhoneOtp
);

router.post(
    '/verify/phone',
    rateLimiters.auth, // Verification attempts should be strict (prevents brute force guessing)
    authController.verifyPhoneOtp
);

// --- Email ---
router.post(
    '/otp/email',
    [rateLimiters.otpSource, rateLimiters.otpTarget], // <--- Added Dual Layer here too
    authController.sendEmailOtp
);

router.post('/verify/email', rateLimiters.auth, authController.verifyEmailOtp);

// ======================================================
// 3. Password Management
// ======================================================

router.post('/password/reset-request', authController.requestPasswordReset);

router.post(
    '/password/verify-otp',
    rateLimiters.auth, // Strict check for the OTP itself
    authController.verifyResetOtp
);

router.post('/password/reset', authController.resetPassword);

// ======================================================
// 4. KYC & Compliance
// ======================================================

router.post(
    '/kyc',
    authenticate,
    rateLimiters.global,
    uploadKyc.single('document'), // Expects form-data with key 'document'
    authController.submitKyc
);

router.post(
    '/profile/avatar',
    authenticate,
    uploadAvatar.single('avatar'),
    authController.updateAvatar
);

router.get('/verification-status', authenticate, authController.getVerificationStatus);

export default router;
