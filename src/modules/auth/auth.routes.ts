import express, { Router } from 'express';
import authController from './auth.controller';
// import { validateBody } from '../../middlewares/validation'; // Uncomment when ready
// import { authenticate } from '../../middlewares/authenticate'; // Uncomment when ready
// import { AuthSchema } from './auth.validation'; // Uncomment when ready

// Mock middleware if not yet imported (Remove these lines once imports above are active)
const router: Router = express.Router();
const validateBody = (schema: any) => (req: any, res: any, next: any) => next();
const authenticate = (req: any, res: any, next: any) => next();
const AuthSchema = {};

// --- Authentication ---
router.post('/register', validateBody(AuthSchema), authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.me);

// --- OTP Routes (Phone) ---
router.post('/otp/phone', authController.sendPhoneOtp);
router.post('/verify/phone', authController.verifyPhoneOtp);

// --- OTP Routes (Email) ---
router.post('/otp/email', authController.sendEmailOtp);
router.post('/verify/email', authController.verifyEmailOtp);

// --- Password Reset ---
router.post('/password/reset-request', authController.requestPasswordReset);
router.post('/password/verify-otp', authController.verifyResetOtp);
router.post('/password/reset', authController.resetPassword);

// --- KYC Routes ---
router.post('/kyc', authenticate, authController.submitKyc);
router.get('/verification-status', authenticate, authController.getVerificationStatus);

export default router;
