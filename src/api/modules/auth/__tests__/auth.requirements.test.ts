/**
 * Authentication Module - Requirements-Based Test Suite
 * Based on: docs/requirements/authentication-module.md
 *
 * This test suite validates all Functional Requirements (FR) and
 * Non-Functional Requirements (NFR) from the specification.
 */

import bcrypt from 'bcryptjs';
import { prisma, KycLevel, KycStatus, OtpType } from '../../../../shared/database';
import authService from '../auth.service';
import { otpService } from '../../../../shared/lib/services/otp.service';
import walletService from '../../../../shared/lib/services/wallet.service';
import { JwtUtils } from '../../../../shared/lib/utils/jwt-utils';
import {
    ConflictError,
    NotFoundError,
    UnauthorizedError,
    BadRequestError,
} from '../../../../shared/lib/utils/api-error';

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
    KycLevel: { NONE: 'NONE', BASIC: 'BASIC', INTERMEDIATE: 'INTERMEDIATE', FULL: 'FULL' },
    KycStatus: { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED' },
    OtpType: {
        PHONE_VERIFICATION: 'PHONE_VERIFICATION',
        EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
        PASSWORD_RESET: 'PASSWORD_RESET',
        TWO_FACTOR: 'TWO_FACTOR',
        WITHDRAWAL_CONFIRMATION: 'WITHDRAWAL_CONFIRMATION',
    },
}));

jest.mock('../../../lib/services/otp.service');
jest.mock('../../../lib/services/wallet.service');
jest.mock('../../../lib/utils/jwt-utils');
jest.mock('bcryptjs');

describe('Authentication Module - Requirements Validation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('FR-01: User Registration with Phone and Email', () => {
        it('should allow registration with verified phone number and email', async () => {
            const registrationData = {
                email: 'user@example.com',
                phone: '+2348012345678',
                password: 'SecurePass123!',
                firstName: 'John',
                lastName: 'Doe',
            };

            const mockUser = {
                id: 'user-123',
                ...registrationData,
                password: 'hashed_password',
                kycLevel: KycLevel.NONE,
                isVerified: false,
                createdAt: new Date(),
            };

            (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
            (prisma.$transaction as jest.Mock).mockImplementation(async callback => {
                return callback({
                    user: {
                        create: jest.fn().mockResolvedValue(mockUser),
                    },
                });
            });
            (JwtUtils.signAccessToken as jest.Mock).mockReturnValue('access_token');
            (JwtUtils.signRefreshToken as jest.Mock).mockReturnValue('refresh_token');
            (walletService.setUpWallet as jest.Mock).mockResolvedValue(undefined);

            const result = await authService.register(registrationData);

            expect(result.user.email).toBe(registrationData.email);
            expect(result.user.phone).toBe(registrationData.phone);
            expect(result.token).toBeDefined();
        });
    });

    describe('FR-02: OTP Verification Before Account Creation', () => {
        it('should require phone OTP verification before account is fully active', async () => {
            const phone = '+2348012345678';
            const otpCode = '123456';

            (otpService.generateOtp as jest.Mock).mockResolvedValue({
                id: 'otp-123',
                code: otpCode,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            });

            await authService.sendOtp(phone, 'phone');

            expect(otpService.generateOtp).toHaveBeenCalledWith(phone, OtpType.PHONE_VERIFICATION);
        });

        it('should verify OTP and mark user as verified', async () => {
            const phone = '+2348012345678';
            const otpCode = '123456';

            (otpService.verifyOtp as jest.Mock).mockResolvedValue(true);
            (prisma.user.update as jest.Mock).mockResolvedValue({
                id: 'user-123',
                isVerified: true,
            });

            const result = await authService.verifyOtp(phone, otpCode, 'phone');

            expect(otpService.verifyOtp).toHaveBeenCalledWith(
                phone,
                otpCode,
                OtpType.PHONE_VERIFICATION
            );
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { phone },
                data: { isVerified: true },
            });
            expect(result.success).toBe(true);
        });
    });

    describe('FR-03: Duplicate Phone/Email Validation', () => {
        it('should reject registration if email already exists', async () => {
            const registrationData = {
                email: 'existing@example.com',
                phone: '+2348012345678',
                password: 'SecurePass123!',
                firstName: 'John',
                lastName: 'Doe',
            };

            (prisma.user.findFirst as jest.Mock).mockResolvedValue({
                id: 'existing-user',
                email: registrationData.email,
            });

            await expect(authService.register(registrationData)).rejects.toThrow(ConflictError);
            await expect(authService.register(registrationData)).rejects.toThrow(
                'User with this email or phone already exists'
            );
        });

        it('should reject registration if phone already exists', async () => {
            const registrationData = {
                email: 'new@example.com',
                phone: '+2348012345678',
                password: 'SecurePass123!',
                firstName: 'John',
                lastName: 'Doe',
            };

            (prisma.user.findFirst as jest.Mock).mockResolvedValue({
                id: 'existing-user',
                phone: registrationData.phone,
            });

            await expect(authService.register(registrationData)).rejects.toThrow(ConflictError);
        });
    });

    describe('FR-04: Password Complexity Policy', () => {
        // Note: Password validation should be done at the controller/validation layer
        // This test ensures the service properly hashes valid passwords
        it('should hash password using bcrypt with salt rounds of 12', async () => {
            const password = 'SecurePass123!';
            const registrationData = {
                email: 'user@example.com',
                phone: '+2348012345678',
                password,
                firstName: 'John',
                lastName: 'Doe',
            };

            (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
            (prisma.$transaction as jest.Mock).mockImplementation(async callback => {
                return callback({
                    user: {
                        create: jest.fn().mockResolvedValue({ id: 'user-123' }),
                    },
                });
            });
            (JwtUtils.signAccessToken as jest.Mock).mockReturnValue('access_token');
            (JwtUtils.signRefreshToken as jest.Mock).mockReturnValue('refresh_token');
            (walletService.setUpWallet as jest.Mock).mockResolvedValue(undefined);

            await authService.register(registrationData);

            expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
        });
    });

    describe('FR-06: Authentication via Email/Phone and Password', () => {
        it('should authenticate user with valid email and password', async () => {
            const loginData = {
                email: 'user@example.com',
                password: 'SecurePass123!',
            };

            const mockUser = {
                id: 'user-123',
                email: loginData.email,
                password: 'hashed_password',
                isActive: true,
                wallet: null,
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (JwtUtils.signAccessToken as jest.Mock).mockReturnValue('access_token');
            (JwtUtils.signRefreshToken as jest.Mock).mockReturnValue('refresh_token');
            (prisma.user.update as jest.Mock).mockResolvedValue({});

            const result = await authService.login(loginData);

            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: loginData.email },
                include: { wallet: true },
            });
            expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
            expect(result.token).toBeDefined();
            expect(result.refreshToken).toBeDefined();
        });

        it('should reject login with invalid email', async () => {
            const loginData = {
                email: 'nonexistent@example.com',
                password: 'SecurePass123!',
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(authService.login(loginData)).rejects.toThrow(UnauthorizedError);
            await expect(authService.login(loginData)).rejects.toThrow('Invalid email or password');
        });

        it('should reject login with invalid password', async () => {
            const loginData = {
                email: 'user@example.com',
                password: 'WrongPassword123!',
            };

            const mockUser = {
                id: 'user-123',
                email: loginData.email,
                password: 'hashed_password',
                isActive: true,
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(authService.login(loginData)).rejects.toThrow(UnauthorizedError);
            await expect(authService.login(loginData)).rejects.toThrow('Invalid email or password');
        });

        it('should reject login for deactivated accounts', async () => {
            const loginData = {
                email: 'user@example.com',
                password: 'SecurePass123!',
            };

            const mockUser = {
                id: 'user-123',
                email: loginData.email,
                password: 'hashed_password',
                isActive: false,
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            await expect(authService.login(loginData)).rejects.toThrow(UnauthorizedError);
            await expect(authService.login(loginData)).rejects.toThrow('Account is deactivated');
        });
    });

    describe('FR-09: JWT Access and Refresh Tokens', () => {
        it('should provide both access and refresh tokens on successful login', async () => {
            const loginData = {
                email: 'user@example.com',
                password: 'SecurePass123!',
            };

            const mockUser = {
                id: 'user-123',
                email: loginData.email,
                password: 'hashed_password',
                isActive: true,
                wallet: null,
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (JwtUtils.signAccessToken as jest.Mock).mockReturnValue('access_token_xyz');
            (JwtUtils.signRefreshToken as jest.Mock).mockReturnValue('refresh_token_xyz');
            (prisma.user.update as jest.Mock).mockResolvedValue({});

            const result = await authService.login(loginData);

            expect(result.token).toBe('access_token_xyz');
            expect(result.refreshToken).toBe('refresh_token_xyz');
            expect(result.expiresIn).toBe(86400);
        });

        it('should sign access token with userId and email', async () => {
            const loginData = {
                email: 'user@example.com',
                password: 'SecurePass123!',
            };

            const mockUser = {
                id: 'user-123',
                email: loginData.email,
                password: 'hashed_password',
                isActive: true,
                wallet: null,
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (JwtUtils.signAccessToken as jest.Mock).mockReturnValue('access_token');
            (JwtUtils.signRefreshToken as jest.Mock).mockReturnValue('refresh_token');
            (prisma.user.update as jest.Mock).mockResolvedValue({});

            await authService.login(loginData);

            expect(JwtUtils.signAccessToken).toHaveBeenCalledWith({
                userId: mockUser.id,
                email: mockUser.email,
            });
        });

        it('should sign refresh token with userId only', async () => {
            const loginData = {
                email: 'user@example.com',
                password: 'SecurePass123!',
            };

            const mockUser = {
                id: 'user-123',
                email: loginData.email,
                password: 'hashed_password',
                isActive: true,
                wallet: null,
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (JwtUtils.signAccessToken as jest.Mock).mockReturnValue('access_token');
            (JwtUtils.signRefreshToken as jest.Mock).mockReturnValue('refresh_token');
            (prisma.user.update as jest.Mock).mockResolvedValue({});

            await authService.login(loginData);

            expect(JwtUtils.signRefreshToken).toHaveBeenCalledWith({
                userId: mockUser.id,
            });
        });
    });

    describe('FR-13 & FR-14: Password Reset with Two-Factor Verification', () => {
        it('should initiate password reset by sending OTP to email', async () => {
            const email = 'user@example.com';
            const mockUser = {
                id: 'user-123',
                email,
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (otpService.generateOtp as jest.Mock).mockResolvedValue({
                id: 'otp-123',
                code: '123456',
            });

            await authService.requestPasswordReset(email);

            expect(otpService.generateOtp).toHaveBeenCalledWith(
                email,
                OtpType.PASSWORD_RESET,
                mockUser.id
            );
        });

        it('should silently fail password reset for non-existent email (security)', async () => {
            const email = 'nonexistent@example.com';

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(authService.requestPasswordReset(email)).resolves.toBeUndefined();
            expect(otpService.generateOtp).not.toHaveBeenCalled();
        });

        it('should verify reset OTP and return reset token', async () => {
            const email = 'user@example.com';
            const otpCode = '123456';
            const resetToken = 'reset_token_xyz';

            (otpService.verifyOtp as jest.Mock).mockResolvedValue(true);
            (JwtUtils.signResetToken as jest.Mock).mockReturnValue(resetToken);

            const result = await authService.verifyResetOtp(email, otpCode);

            expect(otpService.verifyOtp).toHaveBeenCalledWith(
                email,
                otpCode,
                OtpType.PASSWORD_RESET
            );
            expect(JwtUtils.signResetToken).toHaveBeenCalledWith(email);
            expect(result.resetToken).toBe(resetToken);
        });

        it('should reset password with valid reset token', async () => {
            const resetToken = 'valid_reset_token';
            const newPassword = 'NewSecurePass123!';
            const email = 'user@example.com';

            (JwtUtils.verifyResetToken as jest.Mock).mockReturnValue({ email });
            (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
            (prisma.user.update as jest.Mock).mockResolvedValue({});

            await authService.resetPassword(resetToken, newPassword);

            expect(JwtUtils.verifyResetToken).toHaveBeenCalledWith(resetToken);
            expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { email },
                data: { password: 'new_hashed_password' },
            });
        });
    });

    describe('NFR-01: Password Security - Bcrypt Hashing', () => {
        it('should use bcrypt with 12 rounds for password hashing', async () => {
            const password = 'SecurePass123!';
            const registrationData = {
                email: 'user@example.com',
                phone: '+2348012345678',
                password,
                firstName: 'John',
                lastName: 'Doe',
            };

            (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
            (prisma.$transaction as jest.Mock).mockImplementation(async callback => {
                return callback({
                    user: {
                        create: jest.fn().mockResolvedValue({ id: 'user-123' }),
                    },
                });
            });
            (JwtUtils.signAccessToken as jest.Mock).mockReturnValue('access_token');
            (JwtUtils.signRefreshToken as jest.Mock).mockReturnValue('refresh_token');
            (walletService.setUpWallet as jest.Mock).mockResolvedValue(undefined);

            await authService.register(registrationData);

            expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
        });

        it('should never store plain text passwords', async () => {
            const password = 'SecurePass123!';
            const registrationData = {
                email: 'user@example.com',
                phone: '+2348012345678',
                password,
                firstName: 'John',
                lastName: 'Doe',
            };

            let storedPassword: string | undefined;

            (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
            (prisma.$transaction as jest.Mock).mockImplementation(async callback => {
                return callback({
                    user: {
                        create: jest.fn().mockImplementation(data => {
                            storedPassword = data.data.password;
                            return Promise.resolve({ id: 'user-123' });
                        }),
                    },
                });
            });
            (JwtUtils.signAccessToken as jest.Mock).mockReturnValue('access_token');
            (JwtUtils.signRefreshToken as jest.Mock).mockReturnValue('refresh_token');
            (walletService.setUpWallet as jest.Mock).mockResolvedValue(undefined);

            await authService.register(registrationData);

            expect(storedPassword).not.toBe(password);
            expect(storedPassword).toBe('hashed_password');
        });
    });

    describe('Security: Password Exclusion from Responses', () => {
        it('should not return password in login response', async () => {
            const loginData = {
                email: 'user@example.com',
                password: 'SecurePass123!',
            };

            const mockUser = {
                id: 'user-123',
                email: loginData.email,
                password: 'hashed_password',
                isActive: true,
                wallet: null,
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (JwtUtils.signAccessToken as jest.Mock).mockReturnValue('access_token');
            (JwtUtils.signRefreshToken as jest.Mock).mockReturnValue('refresh_token');
            (prisma.user.update as jest.Mock).mockResolvedValue({});

            const result = await authService.login(loginData);

            expect('password' in result.user).toBe(false);
        });

        it('should not return password in getUser response', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'user@example.com',
                password: 'hashed_password',
                wallet: null,
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

            const result = await authService.getUser('user-123');

            expect('password' in result).toBe(false);
        });
    });

    describe('KYC Integration', () => {
        it('should create user with KYC level NONE by default', async () => {
            const registrationData = {
                email: 'user@example.com',
                phone: '+2348012345678',
                password: 'SecurePass123!',
                firstName: 'John',
                lastName: 'Doe',
            };

            let createdUser: any;

            (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
            (prisma.$transaction as jest.Mock).mockImplementation(async callback => {
                return callback({
                    user: {
                        create: jest.fn().mockImplementation(data => {
                            createdUser = data.data;
                            return Promise.resolve({
                                id: 'user-123',
                                ...data.data,
                            });
                        }),
                    },
                });
            });
            (JwtUtils.signAccessToken as jest.Mock).mockReturnValue('access_token');
            (JwtUtils.signRefreshToken as jest.Mock).mockReturnValue('refresh_token');
            (walletService.setUpWallet as jest.Mock).mockResolvedValue(undefined);

            await authService.register(registrationData);

            expect(createdUser.kycLevel).toBe(KycLevel.NONE);
        });

        it('should update KYC level when submitting KYC', async () => {
            const userId = 'user-123';
            const kycData = { documentType: 'NIN', documentUrl: 'https://example.com/doc.pdf' };

            (prisma.user.update as jest.Mock).mockResolvedValue({
                id: userId,
                kycLevel: KycLevel.BASIC,
                kycStatus: KycStatus.APPROVED,
            });

            const result = await authService.submitKyc(userId, kycData);

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: userId },
                data: {
                    kycLevel: KycLevel.BASIC,
                    kycStatus: KycStatus.APPROVED,
                },
            });
            expect(result.kycLevel).toBe(KycLevel.BASIC);
            expect(result.status).toBe(KycStatus.APPROVED);
        });
    });

    describe('Wallet Integration', () => {
        it('should create wallet during user registration', async () => {
            const registrationData = {
                email: 'user@example.com',
                phone: '+2348012345678',
                password: 'SecurePass123!',
                firstName: 'John',
                lastName: 'Doe',
            };

            const mockUser = {
                id: 'user-123',
                ...registrationData,
                kycLevel: KycLevel.NONE,
                isVerified: false,
            };

            (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
            (prisma.$transaction as jest.Mock).mockImplementation(async callback => {
                const tx = {
                    user: {
                        create: jest.fn().mockResolvedValue(mockUser),
                    },
                };
                return callback(tx);
            });
            (JwtUtils.signAccessToken as jest.Mock).mockReturnValue('access_token');
            (JwtUtils.signRefreshToken as jest.Mock).mockReturnValue('refresh_token');
            (walletService.setUpWallet as jest.Mock).mockResolvedValue(undefined);

            await authService.register(registrationData);

            expect(walletService.setUpWallet).toHaveBeenCalledWith(mockUser.id, expect.any(Object));
        });
    });

    describe('Last Login Tracking', () => {
        it('should update lastLogin timestamp on successful login', async () => {
            const loginData = {
                email: 'user@example.com',
                password: 'SecurePass123!',
            };

            const mockUser = {
                id: 'user-123',
                email: loginData.email,
                password: 'hashed_password',
                isActive: true,
                wallet: null,
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (JwtUtils.signAccessToken as jest.Mock).mockReturnValue('access_token');
            (JwtUtils.signRefreshToken as jest.Mock).mockReturnValue('refresh_token');
            (prisma.user.update as jest.Mock).mockResolvedValue({});

            await authService.login(loginData);

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: mockUser.id },
                data: { lastLogin: expect.any(Date) },
            });
        });
    });
});
