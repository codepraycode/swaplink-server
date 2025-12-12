import logger from '../utils/logger';

/**
 * SMS Service Interface
 * This will be implemented with actual SMS providers (Twilio, Termii, etc.) later
 */
export interface ISmsService {
    sendSms(phoneNumber: string, message: string): Promise<boolean>;
    sendOtp(phoneNumber: string, code: string): Promise<boolean>;
}

/**
 * Mock SMS Service for Development/Testing
 * Replace this with actual implementation when integrating with SMS providers
 */
export class SmsService implements ISmsService {
    /**
     * Send a generic SMS message
     */
    async sendSms(phoneNumber: string, message: string): Promise<boolean> {
        try {
            // TODO: Integrate with actual SMS provider (Twilio, Termii, etc.)
            if (process.env.NODE_ENV !== 'test') {
                logger.info(`[SMS Service] Sending SMS to ${phoneNumber}: ${message}`);
            }

            // Simulate SMS sending
            return true;
        } catch (error) {
            logger.error(`[SMS Service] Failed to send SMS to ${phoneNumber}:`, error);
            throw new Error('Failed to send SMS');
        }
    }

    /**
     * Send OTP via SMS
     */
    async sendOtp(phoneNumber: string, code: string): Promise<boolean> {
        const message = `Your SwapLink verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;
        return this.sendSms(phoneNumber, message);
    }
}

export const smsService = new SmsService();
