import request from 'supertest';
import app from '../../../../app';
import prisma from '../../../../../shared/lib/utils/database';
import { TestUtils } from '../../../../../test/utils';
import { OtpType } from '../../../../../shared/database';

// --- MOCKS ---
jest.mock('../../../../../shared/config/redis.config', () => ({
    redisConnection: {
        on: jest.fn(),
        quit: jest.fn(),
        duplicate: jest.fn(() => ({
            on: jest.fn(),
            connect: jest.fn(),
        })),
    },
}));

jest.mock('../../../../../shared/lib/init/service-initializer', () => ({
    getKycQueue: jest.fn(() => ({
        add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    })),
}));

jest.mock('../../../../../shared/lib/services/storage.service', () => ({
    storageService: {
        uploadFile: jest.fn().mockResolvedValue('https://mock-url.com/file.jpg'),
    },
}));
// --- END MOCKS ---
describe('Auth API - E2E Tests', () => {
    beforeEach(async () => {
        // Clean up database before each test
        await prisma.otp.deleteMany();
        await prisma.transaction.deleteMany();
        await prisma.wallet.deleteMany();
        await prisma.user.deleteMany();
    });

    describe('POST /api/v1/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = TestUtils.generateUserData();

            const response = await request(app).post('/api/v1/auth/register').send(userData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.user.email).toBe(userData.email.toLowerCase());
            expect(response.body.data.user.password).toBeUndefined();
            expect(response.body.data.tokens).toBeDefined();
            expect(response.body.data.tokens.accessToken).toBeDefined();
            expect(response.body.data.tokens.refreshToken).toBeDefined();
        });

        it('should return 409 for duplicate email', async () => {
            const userData = TestUtils.generateUserData();

            await request(app).post('/api/v1/auth/register').send(userData);

            const response = await request(app).post('/api/v1/auth/register').send(userData);

            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
        });

        it('should return 409 for duplicate phone', async () => {
            const userData1 = TestUtils.generateUserData();
            const userData2 = TestUtils.generateUserData({
                phone: userData1.phone,
            });

            await request(app).post('/api/v1/auth/register').send(userData1);

            const response = await request(app).post('/api/v1/auth/register').send(userData2);

            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
        });

        it('should create wallet for the new user', async () => {
            const userData = TestUtils.generateUserData();

            const response = await request(app).post('/api/v1/auth/register').send(userData);

            const wallet = await prisma.wallet.findUnique({
                where: { userId: response.body.data.user.id },
            });

            expect(wallet).toBeDefined();
            expect(wallet?.balance).toBe(0);
            expect(wallet?.lockedBalance).toBe(0);
        });
    });

    describe('POST /api/v1/auth/login', () => {
        it('should login with valid credentials', async () => {
            const password = 'Password123!';
            const userData = TestUtils.generateUserData({ password });

            await request(app).post('/api/v1/auth/register').send(userData);

            const response = await request(app).post('/api/v1/auth/login').send({
                email: userData.email,
                password,
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.user.password).toBeUndefined();
            expect(response.body.data.tokens.accessToken).toBeDefined();
        });

        it('should return 401 for invalid email', async () => {
            const response = await request(app).post('/api/v1/auth/login').send({
                email: 'nonexistent@example.com',
                password: 'Password123!',
            });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should return 401 for invalid password', async () => {
            const userData = TestUtils.generateUserData();
            await request(app).post('/api/v1/auth/register').send(userData);

            const response = await request(app).post('/api/v1/auth/login').send({
                email: userData.email,
                password: 'WrongPassword123!',
            });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should return 401 for deactivated account', async () => {
            const userData = TestUtils.generateUserData();
            const registerResponse = await request(app)
                .post('/api/v1/auth/register')
                .send(userData);

            // Deactivate account
            await prisma.user.update({
                where: { id: registerResponse.body.data.user.id },
                data: { isActive: false },
            });

            const response = await request(app).post('/api/v1/auth/login').send({
                email: userData.email,
                password: userData.password,
            });

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/v1/auth/me', () => {
        it('should return current user profile', async () => {
            const userData = TestUtils.generateUserData();
            const registerResponse = await request(app)
                .post('/api/v1/auth/register')
                .send(userData);

            const token = registerResponse.body.data.tokens.accessToken;

            const response = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe(userData.email.toLowerCase());
            expect(response.body.data.user.password).toBeUndefined();
        });

        it('should return 401 without token', async () => {
            const response = await request(app).get('/api/v1/auth/me');

            expect(response.status).toBe(401);
        });

        it('should return 401 with invalid token', async () => {
            const response = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', 'Bearer invalid-token');

            expect(response.status).toBe(401);
        });
    });

    describe('Phone OTP Flow', () => {
        it('should send and verify phone OTP', async () => {
            const userData = TestUtils.generateUserData();
            await request(app).post('/api/v1/auth/register').send(userData);

            // Send OTP
            const sendResponse = await request(app).post('/api/v1/auth/otp/phone').send({
                phone: userData.phone,
            });

            expect(sendResponse.status).toBe(200);
            expect(sendResponse.body.success).toBe(true);
            expect(sendResponse.body.data.expiresIn).toBe(600);

            // Get OTP from database
            const otpRecord = await prisma.otp.findFirst({
                where: {
                    identifier: userData.phone,
                    type: OtpType.PHONE_VERIFICATION,
                    isUsed: false,
                },
                orderBy: { createdAt: 'desc' },
            });

            expect(otpRecord).toBeDefined();

            // Verify OTP
            const verifyResponse = await request(app).post('/api/v1/auth/verify/phone').send({
                phone: userData.phone,
                otp: otpRecord!.code,
            });

            expect(verifyResponse.status).toBe(200);
            expect(verifyResponse.body.success).toBe(true);

            // Check user is verified
            const user = await prisma.user.findUnique({
                where: { phone: userData.phone },
            });

            expect(user?.isVerified).toBe(true);
        });

        it('should return 400 for invalid OTP', async () => {
            const userData = TestUtils.generateUserData();
            await request(app).post('/api/v1/auth/register').send(userData);

            await request(app).post('/api/v1/auth/otp/phone').send({
                phone: userData.phone,
            });

            const response = await request(app).post('/api/v1/auth/verify/phone').send({
                phone: userData.phone,
                otp: '000000',
            });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('Email OTP Flow', () => {
        it('should send and verify email OTP', async () => {
            const userData = TestUtils.generateUserData();
            await request(app).post('/api/v1/auth/register').send(userData);

            // Send OTP
            const sendResponse = await request(app).post('/api/v1/auth/otp/email').send({
                email: userData.email,
            });

            expect(sendResponse.status).toBe(200);
            expect(sendResponse.body.success).toBe(true);

            // Get OTP from database
            const otpRecord = await prisma.otp.findFirst({
                where: {
                    identifier: userData.email,
                    type: OtpType.EMAIL_VERIFICATION,
                    isUsed: false,
                },
                orderBy: { createdAt: 'desc' },
            });

            expect(otpRecord).toBeDefined();

            // Verify OTP
            const verifyResponse = await request(app).post('/api/v1/auth/verify/email').send({
                email: userData.email,
                otp: otpRecord!.code,
            });

            expect(verifyResponse.status).toBe(200);
            expect(verifyResponse.body.success).toBe(true);
        });
    });

    describe('Password Reset Flow', () => {
        it('should complete full password reset flow', async () => {
            const oldPassword = 'OldPassword123!';
            const newPassword = 'NewPassword123!';
            const userData = TestUtils.generateUserData({ password: oldPassword });

            await request(app).post('/api/v1/auth/register').send(userData);

            // Request password reset
            const requestResponse = await request(app)
                .post('/api/v1/auth/password/reset-request')
                .send({
                    email: userData.email,
                });

            expect(requestResponse.status).toBe(200);

            // Get OTP from database
            const otpRecord = await prisma.otp.findFirst({
                where: {
                    identifier: userData.email,
                    type: OtpType.PASSWORD_RESET,
                    isUsed: false,
                },
                orderBy: { createdAt: 'desc' },
            });

            expect(otpRecord).toBeDefined();

            // Verify OTP
            const verifyResponse = await request(app)
                .post('/api/v1/auth/password/verify-otp')
                .send({
                    email: userData.email,
                    otp: otpRecord!.code,
                });

            expect(verifyResponse.status).toBe(200);
            expect(verifyResponse.body.data.resetToken).toBeDefined();

            const resetToken = verifyResponse.body.data.resetToken;

            // Reset password
            const resetResponse = await request(app).post('/api/v1/auth/password/reset').send({
                resetToken,
                newPassword,
            });

            expect(resetResponse.status).toBe(200);

            // Verify can login with new password
            const loginResponse = await request(app).post('/api/v1/auth/login').send({
                email: userData.email,
                password: newPassword,
            });

            expect(loginResponse.status).toBe(200);

            // Verify cannot login with old password
            const oldLoginResponse = await request(app).post('/api/v1/auth/login').send({
                email: userData.email,
                password: oldPassword,
            });

            expect(oldLoginResponse.status).toBe(401);
        });

        it('should return success even for non-existent email (security)', async () => {
            const response = await request(app).post('/api/v1/auth/password/reset-request').send({
                email: 'nonexistent@example.com',
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('KYC Routes', () => {
        it('should submit KYC with authentication', async () => {
            const userData = TestUtils.generateUserData();
            const registerResponse = await request(app)
                .post('/api/v1/auth/register')
                .send(userData);

            const token = registerResponse.body.data.tokens.accessToken;

            const response = await request(app)
                .post('/api/v1/account/auth/kyc') // Ensure correct route
                .set('Authorization', `Bearer ${token}`)
                .field('firstName', 'John')
                .field('lastName', 'Doe')
                .field('dateOfBirth', '1990-01-01')
                .field('bvn', '12345678901')
                .field('nin', '12345678901')
                .field('address[street]', '123 Main St')
                .field('address[city]', 'Lagos')
                .field('address[state]', 'Lagos')
                .field('address[country]', 'Nigeria')
                .field('address[postalCode]', '100001')
                .field('governmentId[type]', 'passport')
                .field('governmentId[number]', 'A12345678')
                .attach('idDocumentFront', Buffer.from('dummy'), 'front.jpg')
                .attach('proofOfAddress', Buffer.from('dummy'), 'proof.jpg')
                .attach('selfie', Buffer.from('dummy'), 'selfie.jpg')
                .attach('video', Buffer.from('dummy'), 'video.mp4');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should get verification status', async () => {
            const userData = TestUtils.generateUserData();
            const registerResponse = await request(app)
                .post('/api/v1/auth/register')
                .send(userData);

            const token = registerResponse.body.data.tokens.accessToken;

            const response = await request(app)
                .get('/api/v1/auth/verification-status')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.kycLevel).toBeDefined();
            expect(response.body.data.isVerified).toBeDefined();
        });

        it('should return 401 without authentication', async () => {
            const response = await request(app).post('/api/v1/auth/kyc').send({
                documentType: 'passport',
            });

            expect(response.status).toBe(401);
        });
    });

    describe('Complete User Journey', () => {
        it('should complete full user registration and verification journey', async () => {
            const userData = TestUtils.generateUserData();

            // 1. Register
            const registerResponse = await request(app)
                .post('/api/v1/auth/register')
                .send(userData);
            expect(registerResponse.status).toBe(201);

            const token = registerResponse.body.data.tokens.accessToken;
            const userId = registerResponse.body.data.user.id;

            // 2. Verify Email
            await request(app).post('/api/v1/auth/otp/email').send({ email: userData.email });

            const emailOtp = await prisma.otp.findFirst({
                where: { identifier: userData.email, type: OtpType.EMAIL_VERIFICATION },
                orderBy: { createdAt: 'desc' },
            });

            await request(app)
                .post('/api/v1/auth/verify/email')
                .send({ email: userData.email, otp: emailOtp!.code });

            // 3. Verify Phone
            await request(app).post('/api/v1/auth/otp/phone').send({ phone: userData.phone });

            const phoneOtp = await prisma.otp.findFirst({
                where: { identifier: userData.phone, type: OtpType.PHONE_VERIFICATION },
                orderBy: { createdAt: 'desc' },
            });

            await request(app)
                .post('/api/v1/auth/verify/phone')
                .send({ phone: userData.phone, otp: phoneOtp!.code });

            // 4. Submit KYC
            const kycResponse = await request(app)
                .post('/api/v1/account/auth/kyc')
                .set('Authorization', `Bearer ${token}`)
                .field('firstName', 'John')
                .field('lastName', 'Doe')
                .field('dateOfBirth', '1990-01-01')
                .field('bvn', '12345678901')
                .field('nin', '12345678901')
                .field('address[street]', '123 Main St')
                .field('address[city]', 'Lagos')
                .field('address[state]', 'Lagos')
                .field('address[country]', 'Nigeria')
                .field('address[postalCode]', '100001')
                .field('governmentId[type]', 'passport')
                .field('governmentId[number]', 'A12345678')
                .attach('idDocumentFront', Buffer.from('dummy'), 'front.jpg')
                .attach('proofOfAddress', Buffer.from('dummy'), 'proof.jpg')
                .attach('selfie', Buffer.from('dummy'), 'selfie.jpg')
                .attach('video', Buffer.from('dummy'), 'video.mp4');

            expect(kycResponse.status).toBe(200);

            // 5. Check final status
            const statusResponse = await request(app)
                .get('/api/v1/auth/verification-status')
                .set('Authorization', `Bearer ${token}`);

            expect(statusResponse.body.data.isVerified).toBe(true);
            expect(statusResponse.body.data.kycLevel).toBe('BASIC');

            // 6. Verify user has wallet
            const wallet = await prisma.wallet.findUnique({ where: { userId } });
            expect(wallet).toBeDefined();
        });
    });
});
