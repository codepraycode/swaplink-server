import bcrypt from 'bcryptjs';
import { prisma, KycLevel, KycStatus, OtpType } from '../../../database';
import authService from '../auth.service';
import { otpService } from '../../../lib/services/otp.service';
import walletService from '../../../lib/services/wallet.service';
import { JwtUtils } from '../../../lib/utils/jwt-utils';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../../lib/utils/api-error';

// Mock dependencies
jest.mock('../../../database', () => ({
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

jest.mock('../../../lib/services/otp.service');
jest.mock('../../../lib/services/wallet.service');
jest.mock('../../../lib/utils/jwt-utils');
jest.mock('bcryptjs');

describe('AuthService - Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('register', () => {
        const mockUserData = {
            email: 'test@example.com',
            phone: '+2341234567890',
            password: 'Password123!',
            firstName: 'John',
            lastName: 'Doe',
        };

        it('should successfully register a new user', async () => {
            const hashedPassword = 'hashed_password';
            const mockUser = {
                id: 'user-123',
                email: mockUserData.email,
                phone: mockUserData.phone,
                firstName: mockUserData.firstName,
                lastName: mockUserData.lastName,
                kycLevel: KycLevel.NONE,
                isVerified: false,
                createdAt: new Date(),
            };

            const mockTokens = {
                token: 'access_token',
                refreshToken: 'refresh_token',
                expiresIn: 86400,
            };

            (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
            (prisma.$transaction as jest.Mock).mockImplementation(async callback => {
                return callback({
                    user: {
                        create: jest.fn().mockResolvedValue(mockUser),
                    },
                });
            });
            (JwtUtils.signAccessToken as jest.Mock).mockReturnValue(mockTokens.token);
            (JwtUtils.signRefreshToken as jest.Mock).mockReturnValue(mockTokens.refreshToken);
            (walletService.setUpWallet as jest.Mock).mockResolvedValue(undefined);

            const result = await authService.register(mockUserData);

            expect(prisma.user.findFirst).toHaveBeenCalledWith({
                where: { OR: [{ email: mockUserData.email }, { phone: mockUserData.phone }] },
            });
            expect(bcrypt.hash).toHaveBeenCalledWith(mockUserData.password, 12);
            expect(result.user).toEqual(mockUser);
            expect(result.token).toBe(mockTokens.token);
            expect(result.refreshToken).toBe(mockTokens.refreshToken);
        });

        it('should throw ConflictError if user already exists', async () => {
            (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-user' });

            await expect(authService.register(mockUserData)).rejects.toThrow(ConflictError);
            await expect(authService.register(mockUserData)).rejects.toThrow(
                'User with this email or phone already exists'
            );
        });
    });

    describe('login', () => {
        const mockLoginData = {
            email: 'test@example.com',
            password: 'Password123!',
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
                include: { wallet: true },
            });
            expect(bcrypt.compare).toHaveBeenCalledWith(mockLoginData.password, mockUser.password);
            expect(result.user).toBeDefined();
            expect('password' in result.user).toBe(false);
            expect(result.token).toBe('access_token');
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
            (otpService.generateOtp as jest.Mock).mockResolvedValue({});

            const result = await authService.sendOtp('+2341234567890', 'phone');

            expect(otpService.generateOtp).toHaveBeenCalledWith(
                '+2341234567890',
                OtpType.PHONE_VERIFICATION
            );
            expect(result.expiresIn).toBe(600);
        });

        it('should send email OTP', async () => {
            (otpService.generateOtp as jest.Mock).mockResolvedValue({});

            const result = await authService.sendOtp('test@example.com', 'email');

            expect(otpService.generateOtp).toHaveBeenCalledWith(
                'test@example.com',
                OtpType.EMAIL_VERIFICATION
            );
            expect(result.expiresIn).toBe(600);
        });
    });

    describe('verifyOtp', () => {
        it('should verify phone OTP and update user', async () => {
            (otpService.verifyOtp as jest.Mock).mockResolvedValue(true);
            (prisma.user.update as jest.Mock).mockResolvedValue({});

            const result = await authService.verifyOtp('+2341234567890', '123456', 'phone');

            expect(otpService.verifyOtp).toHaveBeenCalledWith(
                '+2341234567890',
                '123456',
                OtpType.PHONE_VERIFICATION
            );
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { phone: '+2341234567890' },
                data: { isVerified: true },
            });
            expect(result.success).toBe(true);
        });

        it('should verify email OTP and update user', async () => {
            (otpService.verifyOtp as jest.Mock).mockResolvedValue(true);
            (prisma.user.update as jest.Mock).mockResolvedValue({});

            const result = await authService.verifyOtp('test@example.com', '123456', 'email');

            expect(otpService.verifyOtp).toHaveBeenCalledWith(
                'test@example.com',
                '123456',
                OtpType.EMAIL_VERIFICATION
            );
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
                data: { isVerified: true },
            });
            expect(result.success).toBe(true);
        });
    });

    describe('requestPasswordReset', () => {
        it('should generate OTP for existing user', async () => {
            const mockUser = { id: 'user-123', email: 'test@example.com' };
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (otpService.generateOtp as jest.Mock).mockResolvedValue({});

            await authService.requestPasswordReset('test@example.com');

            expect(otpService.generateOtp).toHaveBeenCalledWith(
                'test@example.com',
                OtpType.PASSWORD_RESET,
                'user-123'
            );
        });

        it('should silently fail for non-existent user', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(
                authService.requestPasswordReset('nonexistent@example.com')
            ).resolves.toBeUndefined();
            expect(otpService.generateOtp).not.toHaveBeenCalled();
        });
    });

    describe('verifyResetOtp', () => {
        it('should verify OTP and return reset token', async () => {
            const mockResetToken = 'reset_token_123';
            (otpService.verifyOtp as jest.Mock).mockResolvedValue(true);
            (JwtUtils.signResetToken as jest.Mock).mockReturnValue(mockResetToken);

            const result = await authService.verifyResetOtp('test@example.com', '123456');

            expect(otpService.verifyOtp).toHaveBeenCalledWith(
                'test@example.com',
                '123456',
                OtpType.PASSWORD_RESET
            );
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
});
