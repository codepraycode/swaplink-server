import bcrypt from 'bcryptjs';
import { prisma, KycLevel, KycStatus, OtpType } from '../../../../../shared/database';
import authService from '../auth.service';
import { otpService } from '../../../../../shared/lib/services/otp.service';
// import walletService from '../../../../../shared/lib/services/wallet.service';
import { JwtUtils } from '../../../../../shared/lib/utils/jwt-utils';
import {
    ConflictError,
    NotFoundError,
    UnauthorizedError,
} from '../../../../../shared/lib/utils/api-error';
import { redisConnection } from '../../../../../shared/config/redis.config';

// Mock dependencies
jest.mock('../../../../../shared/database', () => ({
    prisma: {
        user: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        $transaction: jest.fn(),
    },
    KycLevel: { NONE: 'NONE', BASIC: 'BASIC', ADVANCED: 'ADVANCED' },
    KycStatus: { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED' },
    OtpType: {
        PHONE_VERIFICATION: 'PHONE_VERIFICATION',
        EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
        PASSWORD_RESET: 'PASSWORD_RESET',
    },
}));

jest.mock('../../../../../shared/lib/services/otp.service');
jest.mock('../../../../../shared/lib/services/wallet.service');
jest.mock('../../../../../shared/lib/utils/jwt-utils');
jest.mock('../../../../../shared/lib/queues/onboarding.queue', () => ({
    getQueue: jest.fn().mockReturnValue({
        add: jest.fn().mockResolvedValue({}),
    }),
}));
jest.mock('bcryptjs');
jest.mock('../../../../../shared/config/redis.config', () => ({
    redisConnection: {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
    },
}));

describe('AuthService - Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('registerStep1', () => {
        const mockUserData = {
            email: 'test@example.com',
            password: 'Password123!',
            firstName: 'John',
            lastName: 'Doe',
            deviceId: 'test-device',
        };

        it('should successfully register a new user (Step 1)', async () => {
            const hashedPassword = 'hashed_password';
            const mockUser = {
                id: 'user-123',
                email: mockUserData.email,
                firstName: mockUserData.firstName,
                lastName: mockUserData.lastName,
                kycLevel: KycLevel.NONE,
                isVerified: false,
                createdAt: new Date(),
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
            (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
            (otpService.generateOtp as jest.Mock).mockResolvedValue({ expiresIn: 600 });

            const result = await authService.registerStep1(mockUserData);

            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: mockUserData.email },
            });
            expect(bcrypt.hash).toHaveBeenCalledWith(mockUserData.password, 12);
            expect(prisma.user.create).toHaveBeenCalled();
            expect(result.userId).toBe(mockUser.id);
        });

        it('should throw ConflictError if email already exists', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-user' });

            await expect(authService.registerStep1(mockUserData)).rejects.toThrow(ConflictError);
            await expect(authService.registerStep1(mockUserData)).rejects.toThrow(
                'Email already in use'
            );
        });
    });

    describe('login', () => {
        const mockLoginData = {
            email: 'test@example.com',
            password: 'Password123!',
            deviceId: 'test-device',
        };

        const mockUser = {
            id: 'user-123',
            email: mockLoginData.email,
            password: 'hashed_password',
            isActive: true,
            wallet: null,
        };

        it('should successfully login a user', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (JwtUtils.signAccessToken as jest.Mock).mockReturnValue('access_token');
            (JwtUtils.signRefreshToken as jest.Mock).mockReturnValue('refresh_token');
            (prisma.user.update as jest.Mock).mockResolvedValue({});

            const result = await authService.login(mockLoginData);

            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: mockLoginData.email },
                include: {
                    wallet: {
                        include: { virtualAccount: true },
                    },
                },
            });
            expect(bcrypt.compare).toHaveBeenCalledWith(mockLoginData.password, mockUser.password);
            expect(result.user).toBeDefined();
            expect('password' in result.user).toBe(false);
            expect(result.accessToken).toBe('access_token');
        });

        it('should throw UnauthorizedError if user not found', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(authService.login(mockLoginData)).rejects.toThrow(UnauthorizedError);
            await expect(authService.login(mockLoginData)).rejects.toThrow(
                'Invalid email or password'
            );
        });

        it('should throw UnauthorizedError if password is incorrect', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(authService.login(mockLoginData)).rejects.toThrow(UnauthorizedError);
            await expect(authService.login(mockLoginData)).rejects.toThrow(
                'Invalid email or password'
            );
        });

        it('should throw UnauthorizedError if account is deactivated', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                ...mockUser,
                isActive: false,
            });
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            await expect(authService.login(mockLoginData)).rejects.toThrow(UnauthorizedError);
            await expect(authService.login(mockLoginData)).rejects.toThrow(
                'Account is deactivated'
            );
        });
    });

    describe('getUser', () => {
        it('should return user without password', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password: 'hashed_password',
                wallet: null,
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

            const result = await authService.getUser('user-123');

            expect('password' in result).toBe(false);
            expect(result.id).toBe('user-123');
        });

        it('should throw NotFoundError if user not found', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(authService.getUser('non-existent')).rejects.toThrow(NotFoundError);
        });
    });

    describe('sendOtp', () => {
        it('should send phone OTP', async () => {
            (otpService.generateOtp as jest.Mock).mockResolvedValue({ expiresIn: 600 });

            const result = await authService.sendOtp('+2341234567890', 'phone');

            expect(otpService.generateOtp).toHaveBeenCalledWith(
                '+2341234567890',
                OtpType.PHONE_VERIFICATION
            );
            expect(result.expiresIn).toBe(600);
        });

        it('should send email OTP', async () => {
            (otpService.generateOtp as jest.Mock).mockResolvedValue({ expiresIn: 600 });

            const result = await authService.sendOtp('test@example.com', 'email');

            expect(otpService.generateOtp).toHaveBeenCalledWith(
                'test@example.com',
                OtpType.EMAIL_VERIFICATION
            );
            expect(result.expiresIn).toBe(600);
        });
    });

    describe('verifyOtp', () => {
        it('should verify phone OTP but not upgrade KYC if email not verified', async () => {
            const mockCurrentUser = {
                id: 'user-123',
                emailVerified: false,
                phoneVerified: false,
                kycLevel: KycLevel.NONE,
            };

            (otpService.verifyOtp as jest.Mock).mockResolvedValue(true);
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockCurrentUser);
            (prisma.user.update as jest.Mock).mockResolvedValue({});

            const result = await authService.verifyOtp({
                identifier: '+2341234567890',
                otp: '123456',
                purpose: 'PHONE_VERIFICATION',
                deviceId: 'test-device',
            });

            expect(otpService.verifyOtp).toHaveBeenCalledWith(
                '+2341234567890',
                '123456',
                OtpType.PHONE_VERIFICATION
            );
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { phone: '+2341234567890' },
            });
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { phone: '+2341234567890' },
                data: {
                    phoneVerified: true,
                },
            });
            expect(result!.message).toBe('Phone verified successfully.');
        });

        it('should verify email OTP but not upgrade KYC if phone not verified', async () => {
            const mockCurrentUser = {
                id: 'user-123',
                emailVerified: false,
                phoneVerified: false,
                kycLevel: KycLevel.NONE,
            };

            (otpService.verifyOtp as jest.Mock).mockResolvedValue(true);
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockCurrentUser);
            (prisma.user.update as jest.Mock).mockResolvedValue({});

            const result = await authService.verifyOtp({
                identifier: 'test@example.com',
                otp: '123456',
                purpose: 'EMAIL_VERIFICATION',
                deviceId: 'test-device',
            });

            expect(otpService.verifyOtp).toHaveBeenCalledWith(
                'test@example.com',
                '123456',
                OtpType.EMAIL_VERIFICATION
            );
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
            });
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
                data: {
                    emailVerified: true,
                },
            });
            expect(result!.message).toBe('Email verified successfully.');
        });

        it('should verify phone OTP and upgrade to BASIC KYC when email already verified', async () => {
            const mockCurrentUser = {
                id: 'user-123',
                emailVerified: true, // Already verified
                phoneVerified: false,
                kycLevel: KycLevel.NONE,
            };

            (otpService.verifyOtp as jest.Mock).mockResolvedValue(true);
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockCurrentUser);
            (prisma.user.update as jest.Mock).mockResolvedValue({});

            const result = await authService.verifyOtp({
                identifier: '+2341234567890',
                otp: '123456',
                purpose: 'PHONE_VERIFICATION',
                deviceId: 'test-device',
            });

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { phone: '+2341234567890' },
                data: {
                    phoneVerified: true,
                    isVerified: true, // Both verified now
                    kycLevel: KycLevel.BASIC, // Upgraded!
                },
            });
            expect(result!.message).toBe('Phone verified successfully.');
        });

        it('should verify email OTP and upgrade to BASIC KYC when phone already verified', async () => {
            const mockCurrentUser = {
                id: 'user-123',
                emailVerified: false,
                phoneVerified: true, // Already verified
                kycLevel: KycLevel.NONE,
            };

            (otpService.verifyOtp as jest.Mock).mockResolvedValue(true);
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockCurrentUser);
            (prisma.user.update as jest.Mock).mockResolvedValue({});

            const result = await authService.verifyOtp({
                identifier: 'test@example.com',
                otp: '123456',
                purpose: 'EMAIL_VERIFICATION',
                deviceId: 'test-device',
            });

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
                data: {
                    emailVerified: true,
                    isVerified: true, // Both verified now
                    kycLevel: KycLevel.BASIC, // Upgraded!
                },
            });
            expect(result!.message).toBe('Email verified successfully.');
        });

        it('should not upgrade KYC if already at BASIC or higher level', async () => {
            const mockCurrentUser = {
                id: 'user-123',
                emailVerified: true,
                phoneVerified: false,
                kycLevel: KycLevel.BASIC, // Already BASIC
            };

            (otpService.verifyOtp as jest.Mock).mockResolvedValue(true);
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockCurrentUser);
            (prisma.user.update as jest.Mock).mockResolvedValue({});

            const result = await authService.verifyOtp({
                identifier: '+2341234567890',
                otp: '123456',
                purpose: 'PHONE_VERIFICATION',
                deviceId: 'test-device',
            });

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { phone: '+2341234567890' },
                data: {
                    phoneVerified: true,
                    isVerified: true,
                    kycLevel: KycLevel.BASIC,
                },
            });
            expect(result!.message).toBe('Phone verified successfully.');
        });

        it('should throw NotFoundError if user not found', async () => {
            (otpService.verifyOtp as jest.Mock).mockResolvedValue(true);
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
            (prisma.user.update as jest.Mock).mockRejectedValue(
                new NotFoundError('User not found')
            );

            await expect(
                authService.verifyOtp({
                    identifier: 'test@example.com',
                    otp: '123456',
                    purpose: 'EMAIL_VERIFICATION',
                    deviceId: 'test-device',
                })
            ).rejects.toThrow(NotFoundError);
        });
    });

    describe('requestPasswordReset', () => {
        it('should generate OTP for existing user', async () => {
            const mockUser = { id: 'user-123', email: 'test@example.com' };
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (otpService.generateOtp as jest.Mock).mockResolvedValue({ expiresIn: 600 });

            await authService.requestPasswordReset('test@example.com');

            expect(otpService.generateOtp).toHaveBeenCalledWith(
                'test@example.com',
                OtpType.PASSWORD_RESET,
                'user-123'
            );
        });

        it('should throw NotFoundError for non-existent user', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(
                authService.requestPasswordReset('nonexistent@example.com')
            ).rejects.toThrow(NotFoundError);
            expect(otpService.generateOtp).not.toHaveBeenCalled();
        });
    });

    describe('verifyOtp (PASSWORD_RESET)', () => {
        it('should verify OTP and return reset token', async () => {
            const mockResetToken = 'reset_token_123';
            (otpService.verifyOtp as jest.Mock).mockResolvedValue(true);
            (JwtUtils.signResetToken as jest.Mock).mockReturnValue(mockResetToken);

            const result = await authService.verifyOtp({
                identifier: 'test@example.com',
                otp: '123456',
                purpose: 'PASSWORD_RESET',
                deviceId: 'test-device',
            });

            expect(otpService.verifyOtp).toHaveBeenCalledWith(
                'test@example.com',
                '123456',
                OtpType.PASSWORD_RESET
            );
            // @ts-expect-error - result.resetToken is not in the return type of verifyOtp but is returned for PASSWORD_RESET
            expect(result.resetToken).toBe(mockResetToken);
        });
    });

    describe('resetPassword', () => {
        it('should reset password with valid token', async () => {
            const mockDecoded = { email: 'test@example.com' };
            const hashedPassword = 'new_hashed_password';

            (JwtUtils.verifyResetToken as jest.Mock).mockReturnValue(mockDecoded);
            (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
            (prisma.user.update as jest.Mock).mockResolvedValue({});

            await authService.resetPassword('valid_reset_token', 'NewPassword123!');

            expect(JwtUtils.verifyResetToken).toHaveBeenCalledWith('valid_reset_token');
            expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 12);
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
                data: { password: hashedPassword },
            });
        });
    });

    describe('submitKyc', () => {
        it('should update user KYC status', async () => {
            const mockUpdatedUser = {
                id: 'user-123',
                kycLevel: KycLevel.BASIC,
                kycStatus: KycStatus.APPROVED,
            };

            (prisma.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

            const result = await authService.submitKyc('user-123', { document: 'passport' });

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user-123' },
                data: {
                    kycLevel: KycLevel.BASIC,
                    kycStatus: KycStatus.APPROVED,
                },
            });
            expect(result.kycLevel).toBe(KycLevel.BASIC);
            expect(result.status).toBe(KycStatus.APPROVED);
        });
    });
    describe('refreshToken', () => {
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            role: 'USER',
            isActive: true,
        };
        const mockToken = 'valid_refresh_token';

        it('should return new tokens for valid refresh token', async () => {
            // const { redisConnection } = require('../../../../../shared/config/redis.config');

            (JwtUtils.verifyRefreshToken as jest.Mock).mockReturnValue({ userId: mockUser.id });
            (redisConnection.get as jest.Mock).mockResolvedValue(null); // Not blacklisted
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (JwtUtils.signAccessToken as jest.Mock).mockReturnValue('new_access_token');
            (JwtUtils.signRefreshToken as jest.Mock).mockReturnValue('new_refresh_token');

            const result = await authService.refreshToken(mockToken);

            expect(JwtUtils.verifyRefreshToken).toHaveBeenCalledWith(mockToken);
            expect(redisConnection.get).toHaveBeenCalledWith(`blacklist:${mockToken}`);
            expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockUser.id } });
            expect(result.accessToken).toBe('new_access_token');
            expect(result.refreshToken).toBe('new_refresh_token');
        });

        it('should throw UnauthorizedError if token is blacklisted', async () => {
            // const { redisConnection } = require('../../../../../shared/config/redis.config');

            (JwtUtils.verifyRefreshToken as jest.Mock).mockReturnValue({ userId: mockUser.id });
            (redisConnection.get as jest.Mock).mockResolvedValue('true'); // Blacklisted

            await expect(authService.refreshToken(mockToken)).rejects.toThrow(UnauthorizedError);
            await expect(authService.refreshToken(mockToken)).rejects.toThrow(
                'Token has been revoked'
            );
        });

        it('should throw UnauthorizedError if user not found', async () => {
            // const { redisConnection } = require('../../../../../shared/config/redis.config');

            (JwtUtils.verifyRefreshToken as jest.Mock).mockReturnValue({ userId: mockUser.id });
            (redisConnection.get as jest.Mock).mockResolvedValue(null);
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(authService.refreshToken(mockToken)).rejects.toThrow(UnauthorizedError);
            await expect(authService.refreshToken(mockToken)).rejects.toThrow('User not found');
        });
    });
});
