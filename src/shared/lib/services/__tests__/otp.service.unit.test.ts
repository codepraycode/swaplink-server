import { OtpService } from '../otp.service';
import { prisma, OtpType } from '../../../database';
import { BadRequestError } from '../../utils/api-error';
import { ISmsService } from '../sms.service';
import { IEmailService } from '../email.service';

// Mock dependencies
jest.mock('../../../database', () => ({
    prisma: {
        otp: {
            updateMany: jest.fn(),
            create: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
        },
    },
    OtpType: {
        PHONE_VERIFICATION: 'PHONE_VERIFICATION',
        EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
        PASSWORD_RESET: 'PASSWORD_RESET',
        TWO_FACTOR: 'TWO_FACTOR',
        WITHDRAWAL_CONFIRMATION: 'WITHDRAWAL_CONFIRMATION',
    },
}));

jest.mock('../../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
}));

describe('OtpService - Unit Tests (with SMS/Email Integration)', () => {
    let otpService: OtpService;
    let mockSmsService: jest.Mocked<ISmsService>;
    let mockEmailService: jest.Mocked<IEmailService>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock services
        mockSmsService = {
            sendSms: jest.fn().mockResolvedValue(true),
            sendOtp: jest.fn().mockResolvedValue(true),
        };

        mockEmailService = {
            sendEmail: jest.fn().mockResolvedValue(true),
            sendOtp: jest.fn().mockResolvedValue(true),
            sendPasswordResetLink: jest.fn().mockResolvedValue(true),
            sendWelcomeEmail: jest.fn().mockResolvedValue(true),
        };

        // Inject mocks into OtpService
        otpService = new OtpService(mockSmsService, mockEmailService);
    });

    describe('generateOtp', () => {
        it('should generate and store OTP successfully', async () => {
            const identifier = 'test@example.com';
            const type = OtpType.EMAIL_VERIFICATION;
            const userId = 'user-123';

            const mockOtpRecord = {
                id: 'otp-123',
                identifier,
                code: '123456',
                type,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                isUsed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            (prisma.otp.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
            (prisma.otp.create as jest.Mock).mockResolvedValue(mockOtpRecord);

            const result = await otpService.generateOtp(identifier, type, userId);

            // Should invalidate previous OTPs
            expect(prisma.otp.updateMany).toHaveBeenCalledWith({
                where: { identifier, type, isUsed: false },
                data: { isUsed: true },
            });

            // Should create new OTP
            expect(prisma.otp.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    identifier,
                    type,
                    code: expect.stringMatching(/^\d{6}$/), // 6 digit code
                    expiresAt: expect.any(Date),
                }),
            });

            // Should send OTP via email
            expect(mockEmailService.sendOtp).toHaveBeenCalledWith(identifier, expect.any(String));

            expect(result).toEqual(mockOtpRecord);
        });

        it('should generate OTP without userId', async () => {
            const identifier = '+2341234567890';
            const type = OtpType.PHONE_VERIFICATION;

            const mockOtpRecord = {
                id: 'otp-456',
                identifier,
                code: '654321',
                type,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                isUsed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            (prisma.otp.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
            (prisma.otp.create as jest.Mock).mockResolvedValue(mockOtpRecord);

            const result = await otpService.generateOtp(identifier, type);

            expect(prisma.otp.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    identifier,
                    type,
                }),
            });

            // Should send OTP via SMS
            expect(mockSmsService.sendOtp).toHaveBeenCalledWith(identifier, expect.any(String));
        });

        it('should generate 6-digit numeric code', async () => {
            const identifier = 'test@example.com';
            const type = OtpType.EMAIL_VERIFICATION;

            (prisma.otp.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
            (prisma.otp.create as jest.Mock).mockImplementation(data => {
                const code = data.data.code;
                expect(code).toMatch(/^\d{6}$/);
                expect(parseInt(code)).toBeGreaterThanOrEqual(100000);
                expect(parseInt(code)).toBeLessThanOrEqual(999999);
                return Promise.resolve({ ...data.data, id: 'otp-123' });
            });

            await otpService.generateOtp(identifier, type);
        });

        it('should set expiration to 10 minutes from now', async () => {
            const identifier = 'test@example.com';
            const type = OtpType.EMAIL_VERIFICATION;
            const beforeTime = Date.now();

            (prisma.otp.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
            (prisma.otp.create as jest.Mock).mockImplementation(data => {
                const expiresAt = data.data.expiresAt;
                const expirationTime = expiresAt.getTime();
                const expectedExpiration = beforeTime + 10 * 60 * 1000;

                // Allow 1 second tolerance for test execution time
                expect(expirationTime).toBeGreaterThanOrEqual(expectedExpiration - 1000);
                expect(expirationTime).toBeLessThanOrEqual(expectedExpiration + 1000);

                return Promise.resolve({ ...data.data, id: 'otp-123' });
            });

            await otpService.generateOtp(identifier, type);
        });

        it('should send OTP via SMS for phone verification', async () => {
            const identifier = '+2348012345678';
            const type = OtpType.PHONE_VERIFICATION;

            (prisma.otp.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
            (prisma.otp.create as jest.Mock).mockResolvedValue({
                id: 'otp-123',
                identifier,
                code: '123456',
                type,
                expiresAt: new Date(),
                isUsed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            await otpService.generateOtp(identifier, type);

            expect(mockSmsService.sendOtp).toHaveBeenCalledWith(identifier, expect.any(String));
            expect(mockEmailService.sendOtp).not.toHaveBeenCalled();
        });

        it('should send OTP via Email for email verification', async () => {
            const identifier = 'user@example.com';
            const type = OtpType.EMAIL_VERIFICATION;

            (prisma.otp.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
            (prisma.otp.create as jest.Mock).mockResolvedValue({
                id: 'otp-123',
                identifier,
                code: '123456',
                type,
                expiresAt: new Date(),
                isUsed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            await otpService.generateOtp(identifier, type);

            expect(mockEmailService.sendOtp).toHaveBeenCalledWith(identifier, expect.any(String));
            expect(mockSmsService.sendOtp).not.toHaveBeenCalled();
        });

        it('should send OTP via SMS for two-factor authentication', async () => {
            const identifier = '+2348012345678';
            const type = OtpType.TWO_FACTOR;

            (prisma.otp.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
            (prisma.otp.create as jest.Mock).mockResolvedValue({
                id: 'otp-123',
                identifier,
                code: '123456',
                type,
                expiresAt: new Date(),
                isUsed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            await otpService.generateOtp(identifier, type);

            expect(mockSmsService.sendOtp).toHaveBeenCalledWith(identifier, expect.any(String));
        });

        it('should send OTP via Email for password reset', async () => {
            const identifier = 'user@example.com';
            const type = OtpType.PASSWORD_RESET;

            (prisma.otp.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
            (prisma.otp.create as jest.Mock).mockResolvedValue({
                id: 'otp-123',
                identifier,
                code: '123456',
                type,
                expiresAt: new Date(),
                isUsed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            await otpService.generateOtp(identifier, type);

            expect(mockEmailService.sendOtp).toHaveBeenCalledWith(identifier, expect.any(String));
        });

        it('should still create OTP even if SMS/Email sending fails', async () => {
            const identifier = '+2348012345678';
            const type = OtpType.PHONE_VERIFICATION;

            const mockOtpRecord = {
                id: 'otp-123',
                identifier,
                code: '123456',
                type,
                expiresAt: new Date(),
                isUsed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            (prisma.otp.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
            (prisma.otp.create as jest.Mock).mockResolvedValue(mockOtpRecord);
            mockSmsService.sendOtp.mockRejectedValue(new Error('SMS service unavailable'));

            const result = await otpService.generateOtp(identifier, type);

            expect(result).toEqual(mockOtpRecord);
            expect(prisma.otp.create).toHaveBeenCalled();
        });
    });

    describe('verifyOtp', () => {
        it('should verify valid OTP successfully', async () => {
            const identifier = 'test@example.com';
            const code = '123456';
            const type = OtpType.EMAIL_VERIFICATION;

            const mockOtpRecord = {
                id: 'otp-123',
                identifier,
                code,
                type,
                isUsed: false,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes in future
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            (prisma.otp.findFirst as jest.Mock).mockResolvedValue(mockOtpRecord);
            (prisma.otp.update as jest.Mock).mockResolvedValue({ ...mockOtpRecord, isUsed: true });

            const result = await otpService.verifyOtp(identifier, code, type);

            expect(prisma.otp.findFirst).toHaveBeenCalledWith({
                where: {
                    identifier,
                    code,
                    type,
                    isUsed: false,
                    expiresAt: { gt: expect.any(Date) },
                },
            });

            expect(prisma.otp.update).toHaveBeenCalledWith({
                where: { id: 'otp-123' },
                data: { isUsed: true },
            });

            expect(result).toBe(true);
        });

        it('should throw BadRequestError for invalid OTP', async () => {
            const identifier = 'test@example.com';
            const code = 'wrong-code';
            const type = OtpType.EMAIL_VERIFICATION;

            (prisma.otp.findFirst as jest.Mock).mockResolvedValue(null);

            await expect(otpService.verifyOtp(identifier, code, type)).rejects.toThrow(
                BadRequestError
            );
            await expect(otpService.verifyOtp(identifier, code, type)).rejects.toThrow(
                'Invalid or expired OTP'
            );

            expect(prisma.otp.update).not.toHaveBeenCalled();
        });

        it('should throw BadRequestError for expired OTP', async () => {
            const identifier = 'test@example.com';
            const code = '123456';
            const type = OtpType.EMAIL_VERIFICATION;

            // OTP expired 1 minute ago
            (prisma.otp.findFirst as jest.Mock).mockResolvedValue(null);

            await expect(otpService.verifyOtp(identifier, code, type)).rejects.toThrow(
                BadRequestError
            );

            expect(prisma.otp.update).not.toHaveBeenCalled();
        });

        it('should throw BadRequestError for already used OTP', async () => {
            const identifier = 'test@example.com';
            const code = '123456';
            const type = OtpType.EMAIL_VERIFICATION;

            // OTP is already used
            (prisma.otp.findFirst as jest.Mock).mockResolvedValue(null);

            await expect(otpService.verifyOtp(identifier, code, type)).rejects.toThrow(
                BadRequestError
            );

            expect(prisma.otp.update).not.toHaveBeenCalled();
        });

        it('should mark OTP as used immediately after verification', async () => {
            const identifier = 'test@example.com';
            const code = '123456';
            const type = OtpType.EMAIL_VERIFICATION;

            const mockOtpRecord = {
                id: 'otp-123',
                identifier,
                code,
                type,
                isUsed: false,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            (prisma.otp.findFirst as jest.Mock).mockResolvedValue(mockOtpRecord);
            (prisma.otp.update as jest.Mock).mockResolvedValue({ ...mockOtpRecord, isUsed: true });

            await otpService.verifyOtp(identifier, code, type);

            expect(prisma.otp.update).toHaveBeenCalledWith({
                where: { id: 'otp-123' },
                data: { isUsed: true },
            });
        });
    });

    describe('OTP Type Handling', () => {
        it('should handle PHONE_VERIFICATION type', async () => {
            const identifier = '+2341234567890';
            const type = OtpType.PHONE_VERIFICATION;

            (prisma.otp.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
            (prisma.otp.create as jest.Mock).mockResolvedValue({
                id: 'otp-123',
                identifier,
                type,
                code: '123456',
                expiresAt: new Date(),
                isUsed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            await otpService.generateOtp(identifier, type);

            expect(prisma.otp.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ type: OtpType.PHONE_VERIFICATION }),
            });
            expect(mockSmsService.sendOtp).toHaveBeenCalled();
        });

        it('should handle PASSWORD_RESET type', async () => {
            const identifier = 'test@example.com';
            const type = OtpType.PASSWORD_RESET;
            const userId = 'user-123';

            (prisma.otp.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
            (prisma.otp.create as jest.Mock).mockResolvedValue({
                id: 'otp-123',
                identifier,
                type,
                code: '123456',
                expiresAt: new Date(),
                isUsed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            await otpService.generateOtp(identifier, type, userId);

            expect(prisma.otp.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: OtpType.PASSWORD_RESET,
                }),
            });
            expect(mockEmailService.sendOtp).toHaveBeenCalled();
        });

        it('should handle WITHDRAWAL_CONFIRMATION type', async () => {
            const identifier = '+2348012345678';
            const type = OtpType.WITHDRAWAL_CONFIRMATION;

            (prisma.otp.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
            (prisma.otp.create as jest.Mock).mockResolvedValue({
                id: 'otp-123',
                identifier,
                type,
                code: '123456',
                expiresAt: new Date(),
                isUsed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            await otpService.generateOtp(identifier, type);

            expect(mockSmsService.sendOtp).toHaveBeenCalled();
        });
    });
});
