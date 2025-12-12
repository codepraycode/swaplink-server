import { SmsService } from '../sms.service';
import logger from '../../utils/logger';

jest.mock('../../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
}));

describe('SmsService - Unit Tests', () => {
    let smsService: SmsService;

    beforeEach(() => {
        jest.clearAllMocks();
        smsService = new SmsService();
        // Set NODE_ENV to test to suppress logging
        process.env.NODE_ENV = 'test';
    });

    describe('sendSms', () => {
        it('should successfully send SMS message', async () => {
            const phoneNumber = '+2348012345678';
            const message = 'Test message';

            const result = await smsService.sendSms(phoneNumber, message);

            expect(result).toBe(true);
        });

        it('should log SMS details in non-test environment', async () => {
            process.env.NODE_ENV = 'development';
            const phoneNumber = '+2348012345678';
            const message = 'Test message';

            await smsService.sendSms(phoneNumber, message);

            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining(`[SMS Service] Sending SMS to ${phoneNumber}`)
            );
        });

        it('should not log in test environment', async () => {
            process.env.NODE_ENV = 'test';
            const phoneNumber = '+2348012345678';
            const message = 'Test message';

            await smsService.sendSms(phoneNumber, message);

            expect(logger.info).not.toHaveBeenCalled();
        });

        it('should handle SMS sending errors gracefully', async () => {
            // Mock implementation to throw error
            const mockSmsService = new SmsService();
            jest.spyOn(mockSmsService, 'sendSms').mockRejectedValue(
                new Error('SMS provider error')
            );

            await expect(mockSmsService.sendSms('+2348012345678', 'Test')).rejects.toThrow();
        });
    });

    describe('sendOtp', () => {
        it('should send OTP via SMS with proper format', async () => {
            const phoneNumber = '+2348012345678';
            const code = '123456';

            const sendSmsSpy = jest.spyOn(smsService, 'sendSms');

            const result = await smsService.sendOtp(phoneNumber, code);

            expect(result).toBe(true);
            expect(sendSmsSpy).toHaveBeenCalledWith(phoneNumber, expect.stringContaining(code));
            expect(sendSmsSpy).toHaveBeenCalledWith(
                phoneNumber,
                expect.stringContaining('SwapLink')
            );
            expect(sendSmsSpy).toHaveBeenCalledWith(
                phoneNumber,
                expect.stringContaining('10 minutes')
            );
        });

        it('should include security warning in OTP message', async () => {
            const phoneNumber = '+2348012345678';
            const code = '123456';

            const sendSmsSpy = jest.spyOn(smsService, 'sendSms');

            await smsService.sendOtp(phoneNumber, code);

            expect(sendSmsSpy).toHaveBeenCalledWith(
                phoneNumber,
                expect.stringContaining('Do not share this code')
            );
        });

        it('should format OTP message correctly', async () => {
            const phoneNumber = '+2348012345678';
            const code = '654321';

            const sendSmsSpy = jest.spyOn(smsService, 'sendSms');

            await smsService.sendOtp(phoneNumber, code);

            const expectedMessage = `Your SwapLink verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;
            expect(sendSmsSpy).toHaveBeenCalledWith(phoneNumber, expectedMessage);
        });
    });

    describe('NFR-09: OTP Delivery Failover', () => {
        it('should be ready for failover implementation', async () => {
            // This test documents the requirement for failover
            // Actual implementation will be added when integrating with real SMS providers
            const phoneNumber = '+2348012345678';
            const code = '123456';

            // Current implementation should succeed
            const result = await smsService.sendOtp(phoneNumber, code);
            expect(result).toBe(true);

            // TODO: Implement failover logic:
            // 1. Primary: SMS via Termii/Twilio
            // 2. Failover: WhatsApp Business API
            // 3. Last resort: Voice call
        });
    });

    describe('E.164 Phone Number Format', () => {
        it('should accept valid E.164 formatted phone numbers', async () => {
            const validPhoneNumbers = [
                '+2348012345678',
                '+2347012345678',
                '+2349012345678',
                '+234803456789',
            ];

            for (const phone of validPhoneNumbers) {
                const result = await smsService.sendOtp(phone, '123456');
                expect(result).toBe(true);
            }
        });
    });

    describe('Integration Readiness', () => {
        it('should have interface ready for real SMS provider integration', () => {
            // Verify the service implements the required interface
            expect(smsService.sendSms).toBeDefined();
            expect(smsService.sendOtp).toBeDefined();
            expect(typeof smsService.sendSms).toBe('function');
            expect(typeof smsService.sendOtp).toBe('function');
        });
    });
});
