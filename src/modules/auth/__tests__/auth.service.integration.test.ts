import prisma from '../../../lib/utils/database';
import authService from '../auth.service';
import { otpService } from '../../../lib/services/otp.service';
import { TestUtils } from '../../../test/utils';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../../lib/utils/api-error';
import { OtpType } from '../../../database';

describe('AuthService - Integration Tests', () => {
    beforeEach(async () => {
        // Clean up database before each test
        await prisma.otp.deleteMany();
        await prisma.transaction.deleteMany();
        await prisma.wallet.deleteMany();
        await prisma.user.deleteMany();
    });

    describe('register', () => {
        it('should register a new user with wallet', async () => {
            const userData = TestUtils.generateUserData();

            const result = await authService.register(userData);

            expect(result.user).toBeDefined();
            expect(result.user.email).toBe(userData.email.toLowerCase());
            expect(result.user.firstName).toBe(userData.firstName);
            expect(result.user.isVerified).toBe(false);
            expect(result.token).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(result.expiresIn).toBe(86400);

            // Verify wallet was created (single NGN wallet)
            const wallet = await prisma.wallet.findUnique({
                where: { userId: result.user.id },
            });

            expect(wallet).toBeDefined();
            expect(wallet?.balance).toBe(0);
            expect(wallet?.lockedBalance).toBe(0);
        });

        it('should hash the password', async () => {
            const userData = TestUtils.generateUserData({
                password: 'PlainTextPassword123!',
            });

            const result = await authService.register(userData);

            const user = await prisma.user.findUnique({
                where: { id: result.user.id },
            });

            expect(user?.password).not.toBe('PlainTextPassword123!');
            expect(user?.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
        });

        it('should throw ConflictError if email already exists', async () => {
            const userData = TestUtils.generateUserData();

            await authService.register(userData);

            await expect(authService.register(userData)).rejects.toThrow(ConflictError);
        });

        it('should throw ConflictError if phone already exists', async () => {
            const userData1 = TestUtils.generateUserData();
            const userData2 = TestUtils.generateUserData({
                phone: userData1.phone,
            });

            await authService.register(userData1);

            await expect(authService.register(userData2)).rejects.toThrow(ConflictError);
        });

        it('should create user and wallet in a transaction', async () => {
            const userData = TestUtils.generateUserData();

            await authService.register(userData);

            const user = await prisma.user.findUnique({
                where: { email: userData.email },
                include: { wallet: true },
            });

            expect(user).toBeDefined();
            expect(user?.wallet).toBeDefined();
            expect(user?.wallet?.balance).toBe(0);
        });
    });

    describe('login', () => {
        it('should login with valid credentials', async () => {
            const password = 'Password123!';
            const userData = TestUtils.generateUserData({ password });

            const registered = await authService.register(userData);

            const result = await authService.login({
                email: userData.email,
                password,
            });

            expect(result.user.id).toBe(registered.user.id);
            expect(result.user.email).toBe(userData.email.toLowerCase());
            expect(result.token).toBeDefined();
            expect(result.refreshToken).toBeDefined();
        });

        it('should throw UnauthorizedError for invalid email', async () => {
            await expect(
                authService.login({
                    email: 'nonexistent@example.com',
                    password: 'Password123!',
                })
            ).rejects.toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError for invalid password', async () => {
            const userData = TestUtils.generateUserData();
            await authService.register(userData);

            await expect(
                authService.login({
                    email: userData.email,
                    password: 'WrongPassword123!',
                })
            ).rejects.toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError for deactivated account', async () => {
            const userData = TestUtils.generateUserData();
            const registered = await authService.register(userData);

            // Deactivate the account
            await prisma.user.update({
                where: { id: registered.user.id },
                data: { isActive: false },
            });

            await expect(
                authService.login({
                    email: userData.email,
                    password: userData.password,
                })
            ).rejects.toThrow(UnauthorizedError);
        });

        it('should update lastLogin timestamp', async () => {
            const userData = TestUtils.generateUserData();
            await authService.register(userData);

            const beforeLogin = new Date();

            await authService.login({
                email: userData.email,
                password: userData.password,
            });

            // Wait a bit for async update
            await new Promise(resolve => setTimeout(resolve, 100));

            const user = await prisma.user.findUnique({
                where: { email: userData.email },
            });

            expect(user?.lastLogin).toBeDefined();
            expect(user?.lastLogin!.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
        });
    });

    describe('getUser', () => {
        it('should return user without password', async () => {
            const userData = TestUtils.generateUserData();
            const registered = await authService.register(userData);

            const user = await authService.getUser(registered.user.id);

            expect(user.id).toBe(registered.user.id);
            expect(user.email).toBe(userData.email.toLowerCase());
            expect(user.wallet).toBeDefined();
        });

        it('should throw NotFoundError for non-existent user', async () => {
            await expect(authService.getUser('non-existent-id')).rejects.toThrow(NotFoundError);
        });
    });

    describe('OTP Flow', () => {
        describe('sendOtp and verifyOtp', () => {
            it('should send and verify phone OTP', async () => {
                const userData = TestUtils.generateUserData();
                await authService.register(userData);

                // Send OTP
                const sendResult = await authService.sendOtp(userData.phone, 'phone');
                expect(sendResult.expiresIn).toBe(600);

                // Get the OTP from database (in real scenario, it would be sent via SMS)
                const otpRecord = await prisma.otp.findFirst({
                    where: {
                        identifier: userData.phone,
                        type: OtpType.PHONE_VERIFICATION,
                        isUsed: false,
                    },
                    orderBy: { createdAt: 'desc' },
                });

                expect(otpRecord).toBeDefined();
                expect(otpRecord?.code).toMatch(/^\d{6}$/);

                // Verify OTP
                const verifyResult = await authService.verifyOtp(
                    userData.phone,
                    otpRecord!.code,
                    'phone'
                );

                expect(verifyResult.success).toBe(true);

                // Check user is verified
                const user = await prisma.user.findUnique({
                    where: { phone: userData.phone },
                });

                expect(user?.isVerified).toBe(true);
            });

            it('should send and verify email OTP', async () => {
                const userData = TestUtils.generateUserData();
                await authService.register(userData);

                // Send OTP
                await authService.sendOtp(userData.email, 'email');

                // Get the OTP from database
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
                const verifyResult = await authService.verifyOtp(
                    userData.email,
                    otpRecord!.code,
                    'email'
                );

                expect(verifyResult.success).toBe(true);

                // Check user is verified
                const user = await prisma.user.findUnique({
                    where: { email: userData.email },
                });

                expect(user?.isVerified).toBe(true);
            });

            it('should invalidate previous OTPs when generating new one', async () => {
                const userData = TestUtils.generateUserData();
                await authService.register(userData);

                // Generate first OTP
                await authService.sendOtp(userData.email, 'email');
                const firstOtp = await prisma.otp.findFirst({
                    where: { identifier: userData.email, type: OtpType.EMAIL_VERIFICATION },
                    orderBy: { createdAt: 'desc' },
                });

                // Generate second OTP
                await authService.sendOtp(userData.email, 'email');

                // First OTP should be marked as used
                const invalidatedOtp = await prisma.otp.findUnique({
                    where: { id: firstOtp!.id },
                });

                expect(invalidatedOtp?.isUsed).toBe(true);
            });
        });

        describe('Password Reset Flow', () => {
            it('should complete password reset flow', async () => {
                const userData = TestUtils.generateUserData();
                const registered = await authService.register(userData);

                // Request password reset
                await authService.requestPasswordReset(userData.email);

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

                // Verify reset OTP
                const { resetToken } = await authService.verifyResetOtp(
                    userData.email,
                    otpRecord!.code
                );

                expect(resetToken).toBeDefined();

                // Reset password
                const newPassword = 'NewPassword123!';
                await authService.resetPassword(resetToken, newPassword);

                // Verify can login with new password
                const loginResult = await authService.login({
                    email: userData.email,
                    password: newPassword,
                });

                expect(loginResult.user.id).toBe(registered.user.id);

                // Verify cannot login with old password
                await expect(
                    authService.login({
                        email: userData.email,
                        password: userData.password,
                    })
                ).rejects.toThrow(UnauthorizedError);
            });

            it('should silently fail for non-existent email', async () => {
                await expect(
                    authService.requestPasswordReset('nonexistent@example.com')
                ).resolves.toBeUndefined();

                const otpRecord = await prisma.otp.findFirst({
                    where: { identifier: 'nonexistent@example.com' },
                });

                expect(otpRecord).toBeNull();
            });
        });
    });

    describe('submitKyc', () => {
        it('should update KYC status', async () => {
            const userData = TestUtils.generateUserData();
            const registered = await authService.register(userData);

            const result = await authService.submitKyc(registered.user.id, {
                documentType: 'passport',
                documentNumber: 'A12345678',
            });

            expect(result.kycLevel).toBe('BASIC');
            expect(result.status).toBe('APPROVED');

            const user = await prisma.user.findUnique({
                where: { id: registered.user.id },
            });

            expect(user?.kycLevel).toBe('BASIC');
            expect(user?.kycStatus).toBe('APPROVED');
        });
    });
});
