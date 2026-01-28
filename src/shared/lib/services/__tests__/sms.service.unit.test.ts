import { MockSmsService, SmsServiceFactory } from '../sms-service/sms.service';

describe('SMS Service', () => {
    describe('MockSmsService', () => {
        let mockSmsService: MockSmsService;

        beforeEach(() => {
            mockSmsService = new MockSmsService();
        });

        it('should send SMS successfully', async () => {
            const result = await mockSmsService.sendSms('+1234567890', 'Test message');
            expect(result).toBe(true);
        });

        it('should send OTP successfully', async () => {
            const result = await mockSmsService.sendOtp('+1234567890', '123456');
            expect(result).toBe(true);
        });
    });

    describe('SmsServiceFactory', () => {
        it('should create a service instance', () => {
            const service = SmsServiceFactory.create();
            expect(service).toBeDefined();
            expect(service.sendSms).toBeDefined();
            expect(service.sendOtp).toBeDefined();
        });
    });
});
