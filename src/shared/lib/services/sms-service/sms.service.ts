import logger from '../../utils/logger';
import { envConfig } from '../../../config/env.config';
import { TwilioSmsService } from './twilio-sms.service';

/**
 * SMS Service Interface
 */
export interface ISmsService {
    sendSms(phoneNumber: string, message: string): Promise<boolean>;
    sendOtp(phoneNumber: string, code: string): Promise<boolean>;
}

/**
 * Mock SMS Service for Development/Testing
 */
export class MockSmsService implements ISmsService {
    /**
     * Send a generic SMS message (mock)
     */
    async sendSms(phoneNumber: string, message: string): Promise<boolean> {
        try {
            // In development/test, log the message for debugging
            if (envConfig.NODE_ENV === 'development' || envConfig.NODE_ENV === 'test') {
                logger.info(`[Mock SMS Service] 📱 SMS to ${phoneNumber}`);
                logger.info(`[Mock SMS Service] Message: ${message}`);
            }

            // Simulate SMS sending
            logger.info('═══════════════════════════════════════');
            logger.info(`📱 MOCK SMS for ${phoneNumber}`);
            logger.info(`📝 MESSAGE: ${message}`);
            logger.info('═══════════════════════════════════════');
            return true;
        } catch (error) {
            logger.error(`[Mock SMS Service] Failed to send SMS to ${phoneNumber}:`, error);
            throw new Error('Failed to send SMS');
        }
    }

    /**
     * Send OTP via SMS (mock)
     */
    async sendOtp(phoneNumber: string, code: string): Promise<boolean> {
        const message = `Your BCDees verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;

        // Log OTP prominently in development/test for easy access
        if (envConfig.NODE_ENV === 'development' || envConfig.NODE_ENV === 'test') {
            logger.info('═══════════════════════════════════════');
            logger.info(`📱 MOCK SMS OTP for ${phoneNumber}`);
            logger.info(`🔑 CODE: ${code}`);
            logger.info(`⏰ Valid for: 10 minutes`);
            logger.info('═══════════════════════════════════════');
        }

        return this.sendSms(phoneNumber, message);
    }
}

/**
 * SMS Service Factory
 * Creates the appropriate SMS service based on environment
 */
export class SmsServiceFactory {
    static create(): ISmsService {
        const isProduction = envConfig.NODE_ENV === 'production';
        const isStaging = process.env.STAGING === 'true' || envConfig.NODE_ENV === 'staging';

        // Use Twilio in production or staging if configured
        if ((isProduction || isStaging) && envConfig.TWILIO_ACCOUNT_SID) {
            try {
                logger.info('🚀 Initializing Twilio SMS Service');
                return new TwilioSmsService();
            } catch (error) {
                logger.error(
                    'Failed to initialize TwilioSmsService, falling back to MockSmsService',
                    error
                );
            }
        }

        // Development/Fallback: Use Mock SMS Service
        logger.info('💻 Development mode: Using Mock SMS Service (console logging)');
        return new MockSmsService();
    }
}

export const smsService = SmsServiceFactory.create();
