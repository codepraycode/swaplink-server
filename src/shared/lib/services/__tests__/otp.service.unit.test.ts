import { OtpService } from '../otp.service';
import { OtpType } from '../../../database';
import { redisConnection } from '../../../config/redis.config';
import { eventBus, EventType } from '../../events/event-bus';
import { BadRequestError } from '../../utils/api-error';

// Mock dependencies
jest.mock('../../../config/redis.config', () => ({
    redisConnection: {
        setex: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
        ttl: jest.fn(),
    },
}));

jest.mock('../../events/event-bus', () => ({
    eventBus: {
        publish: jest.fn(),
    },
    EventType: {
        OTP_REQUESTED: 'OTP_REQUESTED',
    },
}));

describe('OtpService - Unit Tests', () => {
    let otpService: OtpService;

    beforeEach(() => {
        jest.clearAllMocks();
        otpService = new OtpService();
    });

    describe('generateOtp', () => {
        it('should generate new OTP if none exists', async () => {
            const identifier = 'test@example.com';
            const type = OtpType.EMAIL_VERIFICATION;

            (redisConnection.get as jest.Mock).mockResolvedValue(null);
            (redisConnection.ttl as jest.Mock).mockResolvedValue(-2);

            const result = await otpService.generateOtp(identifier, type);

            expect(redisConnection.setex).toHaveBeenCalledWith(
                expect.stringContaining(`otp:${type}:${identifier}`),
                600, // 10 mins
                expect.stringMatching(/^\d{6}$/)
            );

            expect(eventBus.publish).toHaveBeenCalledWith(
                EventType.OTP_REQUESTED,
                expect.objectContaining({
                    identifier,
                    code: result.code,
                    purpose: type,
                })
            );
        });

        it('should reuse existing OTP if valid', async () => {
            const identifier = 'test@example.com';
            const type = OtpType.EMAIL_VERIFICATION;
            const existingCode = '123456';

            (redisConnection.get as jest.Mock).mockResolvedValue(existingCode);
            (redisConnection.ttl as jest.Mock).mockResolvedValue(300); // 5 mins left

            const result = await otpService.generateOtp(identifier, type);

            // Should NOT set new OTP
            expect(redisConnection.setex).not.toHaveBeenCalled();

            // Should emit event with EXISTING code
            expect(eventBus.publish).toHaveBeenCalledWith(
                EventType.OTP_REQUESTED,
                expect.objectContaining({
                    identifier,
                    code: existingCode,
                    purpose: type,
                })
            );

            expect(result.code).toBe(existingCode);
            expect(result.expiresIn).toBe(300);
        });
    });

    describe('verifyOtp', () => {
        it('should verify valid OTP', async () => {
            const identifier = 'test@example.com';
            const code = '123456';
            const type = OtpType.EMAIL_VERIFICATION;

            (redisConnection.get as jest.Mock).mockResolvedValue(code);

            const result = await otpService.verifyOtp(identifier, code, type);

            expect(result).toBe(true);
            expect(redisConnection.del).toHaveBeenCalled();
        });

        it('should throw error if OTP invalid', async () => {
            const identifier = 'test@example.com';
            const code = '123456';
            const type = OtpType.EMAIL_VERIFICATION;

            (redisConnection.get as jest.Mock).mockResolvedValue('654321'); // Different code

            await expect(otpService.verifyOtp(identifier, code, type)).rejects.toThrow(
                BadRequestError
            );
        });

        it('should throw error if OTP expired (not found)', async () => {
            const identifier = 'test@example.com';
            const code = '123456';
            const type = OtpType.EMAIL_VERIFICATION;

            (redisConnection.get as jest.Mock).mockResolvedValue(null);

            await expect(otpService.verifyOtp(identifier, code, type)).rejects.toThrow(
                BadRequestError
            );
        });
    });
});
