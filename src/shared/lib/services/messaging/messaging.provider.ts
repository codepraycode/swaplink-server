import axios from 'axios';
import logger from '../../utils/logger';
import { envConfig } from '../../../config/env.config';

export interface IMessagingProvider {
    sendOtp(phone: string, code: string): Promise<boolean>;
    sendSms(phone: string, message: string): Promise<boolean>;
}

export class LocalMessagingProvider implements IMessagingProvider {
    async sendOtp(phone: string, code: string): Promise<boolean> {
        logger.info('═══════════════════════════════════════');
        logger.info(`📱 [LocalMessaging] OTP for ${phone}`);
        logger.info(`🔑 CODE: ${code}`);
        logger.info(`⏰ Valid for: 5 minutes`);
        logger.info('═══════════════════════════════════════');
        return true;
    }

    async sendSms(phone: string, message: string): Promise<boolean> {
        logger.info(`📱 [LocalMessaging] SMS to ${phone}: ${message}`);
        return true;
    }
}

export class TermiiProvider implements IMessagingProvider {
    private apiKey: string;
    private baseUrl: string = 'https://api.ng.termii.com/api';
    private senderId: string;

    constructor() {
        this.apiKey = process.env.TERMII_API_KEY || '';
        this.senderId = process.env.TERMII_SENDER_ID || 'SwapLink';
    }

    async sendOtp(phone: string, code: string): Promise<boolean> {
        // Termii OTP endpoint or generic SMS
        // For now, using generic SMS with OTP message
        const message = `Your SwapLink verification code is ${code}. Valid for 5 minutes.`;
        return this.sendSms(phone, message);
    }

    async sendSms(phone: string, message: string): Promise<boolean> {
        if (!this.apiKey) {
            logger.warn('Termii API Key not configured');
            return false;
        }

        try {
            const payload = {
                to: phone,
                from: this.senderId,
                sms: message,
                type: 'plain',
                api_key: this.apiKey,
                channel: 'generic', // or 'dnd' based on use case
            };

            const response = await axios.post(`${this.baseUrl}/sms/send`, payload);

            if (response.data && (response.data.code === 'ok' || response.status === 200)) {
                return true;
            }

            logger.error('Termii SMS failed:', response.data);
            return false;
        } catch (error) {
            logger.error('Termii SMS Error:', error);
            return false;
        }
    }
}

export class MessagingFactory {
    static getProvider(): IMessagingProvider {
        // Use Local provider if explicitly set or if Termii key is missing in dev
        if (envConfig.NODE_ENV === 'development' || envConfig.NODE_ENV === 'test') {
            // If we want to test Termii in dev, we could check for a specific flag
            // But for now, default to Local in dev/test as per requirements
            return new LocalMessagingProvider();
        }

        return new TermiiProvider();
    }
}

export const messagingProvider = MessagingFactory.getProvider();
