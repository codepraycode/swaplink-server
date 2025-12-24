/* eslint-disable @typescript-eslint/no-require-imports */
import { OtpType } from '../../database';
import { BadRequestError } from '../utils/api-error';
import logger from '../utils/logger';
import { messagingProvider } from './messaging/messaging.provider';
import { BaseEmailService } from './email-service/base-email.service';
import { redisConnection } from '../../config/redis.config';

export class OtpService {
    private emailService: BaseEmailService;
    private readonly OTP_TTL = 300; // 5 minutes in seconds

    constructor(emailService?: BaseEmailService) {
        // Lazy load to avoid circular dependency
        this.emailService = emailService || require('./email-service/email.service').emailService;
    }

    /**
     * Generate and Store OTP in Redis
     */
    async generateOtp(identifier: string, type: OtpType, userId?: string): Promise<string> {
        // 1. Generate secure 6 digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // 2. Store in Redis with TTL
        // Key format: otp:{type}:{identifier}
        const key = this.getRedisKey(type, identifier);
        await redisConnection.setex(key, this.OTP_TTL, code);

        // 3. Send OTP via appropriate channel
        try {
            await this.sendOtp(identifier, code, type);
        } catch (error) {
            logger.error(`[OTP] Failed to send OTP to ${identifier}:`, error);
            // We don't throw here to prevent OTP generation failure
            // The OTP is still valid in Redis
            throw error;
        }

        return code;
    }

    /**
     * Send OTP via appropriate channel (SMS or Email)
     */
    private async sendOtp(identifier: string, code: string, type: OtpType): Promise<void> {
        switch (type) {
            case OtpType.PHONE_VERIFICATION:
            case OtpType.TWO_FACTOR:
            case OtpType.WITHDRAWAL_CONFIRMATION:
                // Send via MessagingProvider (SMS/Termii)
                await messagingProvider.sendOtp(identifier, code);
                break;

            case OtpType.EMAIL_VERIFICATION:
            case OtpType.PASSWORD_RESET:
                // Send via Email for email-related OTPs
                await this.emailService.sendVerificationEmail(identifier, code);
                break;

            default:
                logger.warn(`[OTP] Unknown OTP type: ${type} Default to EMAIL`);
                // Fallback to email if possible, or just log
                break;
        }
    }

    /**
     * Verify OTP against Redis
     */
    async verifyOtp(identifier: string, code: string, type: OtpType): Promise<boolean> {
        const key = this.getRedisKey(type, identifier);
        const storedCode = await redisConnection.get(key);

        if (!storedCode) {
            throw new BadRequestError('OTP expired or invalid');
        }

        if (storedCode !== code) {
            throw new BadRequestError('Invalid OTP code');
        }

        // 2. Delete from Redis immediately to prevent replay attacks
        await redisConnection.del(key);

        return true;
    }

    private getRedisKey(type: OtpType, identifier: string): string {
        return `otp:${type}:${identifier}`;
    }
}

export const otpService = new OtpService();
