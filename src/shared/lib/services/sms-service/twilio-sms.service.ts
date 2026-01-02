import twilio from 'twilio';
import logger from '../../utils/logger';
import { envConfig } from '../../../config/env.config';
import { ISmsService } from './sms.service';
import { BadGatewayError } from '../../utils/api-error';

// const default_to_number = '+18777804236';
// const default_to_number = '+18777804236';
const default_to_number = '2348122137834';

export class TwilioSmsService implements ISmsService {
    private client: twilio.Twilio;
    private fromPhoneNumber: string;

    constructor() {
        if (!envConfig.TWILIO_ACCOUNT_SID) {
            throw new Error('TWILIO_ACCOUNT_SID is required');
        }
        if (!envConfig.TWILIO_AUTH_TOKEN) {
            throw new Error('TWILIO_AUTH_TOKEN is required');
        }
        if (!envConfig.TWILIO_PHONE_NUMBER) {
            throw new Error('TWILIO_PHONE_NUMBER is required');
        }

        this.client = twilio(envConfig.TWILIO_ACCOUNT_SID, envConfig.TWILIO_AUTH_TOKEN);
        this.fromPhoneNumber = envConfig.TWILIO_PHONE_NUMBER;

        logger.info('✅ Using Twilio SMS Service');
        logger.info(`📱 FROM_PHONE_NUMBER configured as: ${this.fromPhoneNumber}`);
    }

    /**
     * Send a generic SMS message via Twilio
     */
    async sendSms(phoneNumber: string, message: string): Promise<boolean> {
        try {
            // In non-production, use a default test number to avoid sending to real numbers
            const isProduction = envConfig.NODE_ENV === 'production';
            const isStaging = process.env.STAGING === 'true' || envConfig.NODE_ENV === 'staging';

            phoneNumber = !isProduction || isStaging ? default_to_number : phoneNumber;
            logger.info(`[Twilio] Attempting to send SMS to ${phoneNumber}`);

            const result = await this.client.messages.create({
                body: message,
                // from: default_from_number,
                messagingServiceSid: 'MGff78ef5c0ba09ce15ceade799eaf2ae1',
                to: phoneNumber,
            });

            logger.info(
                `[Twilio] ✅ SMS sent successfully to ${phoneNumber}. SID: ${result.sid}, Status: ${result.status}`
            );

            return true;
        } catch (error: unknown) {
            logger.error(`[Twilio] Exception sending SMS to ${phoneNumber}:`, error);

            const errorMessage =
                error && typeof error === 'object' && 'message' in error
                    ? (error as { message: string }).message
                    : 'Unknown error';

            throw new BadGatewayError(`Twilio Error: ${errorMessage}`);
        }
    }

    /**
     * Send OTP via SMS using Twilio
     */
    async sendOtp(phoneNumber: string, code: string): Promise<boolean> {
        const message = `Your SwapLink verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;

        // Log OTP prominently in development/test for easy access
        if (envConfig.NODE_ENV === 'development' || envConfig.NODE_ENV === 'test') {
            logger.info('═══════════════════════════════════════');
            logger.info(`📱 SMS OTP for ${phoneNumber}`);
            logger.info(`🔑 CODE: ${code}`);
            logger.info(`⏰ Valid for: 10 minutes`);
            logger.info('═══════════════════════════════════════');
        }

        return this.sendSms(phoneNumber, message);
    }
}
