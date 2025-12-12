import { prisma, OtpType } from '../../../database';
import { otpService } from '../otp.service';
import { BadRequestError } from '../../utils/api-error';

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
    },
}));

jest.mock('../../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
}));

describe('OtpService - Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
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
            });

            await otpService.generateOtp(identifier, type);

            expect(prisma.otp.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ type: OtpType.PHONE_VERIFICATION }),
            });
        });

        it('should handle PASSWORD_RESET type', async () => {
            const identifier = 'test@example.com';
            const type = OtpType.PASSWORD_RESET;
            const userId = 'user-123';

            (prisma.otp.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
            (prisma.otp.create as jest.Mock).mockResolvedValue({
                id: 'otp-123',
                identifier,
                userId,
                type,
            });

            await otpService.generateOtp(identifier, type, userId);

            expect(prisma.otp.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: OtpType.PASSWORD_RESET,
                    userId,
                }),
            });
        });
    });
});
