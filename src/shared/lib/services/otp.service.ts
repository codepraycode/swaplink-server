/* eslint-disable @typescript-eslint/no-require-imports */
import { OtpType } from '../../database';
import { BadRequestError } from '../utils/api-error';
import { redisConnection } from '../../config/redis.config';
import { eventBus, EventType } from '../events/event-bus';

export class OtpService {
    private readonly OTP_TTL = 600; // 10 minutes in seconds

    /**
     * Generate and Store OTP in Redis, then Emit Event
     */
    async generateOtp(
        identifier: string,
        type: OtpType,
        userId?: string
    ): Promise<{ code: string; expiresIn: number }> {
        const key = this.getRedisKey(type, identifier);

        // 1. Check if OTP already exists
        let code = await redisConnection.get(key);
        let ttl = await redisConnection.ttl(key);

        if (!code || ttl <= 0) {
            // 2. Generate secure 6 digit code if none exists
            code = Math.floor(100000 + Math.random() * 900000).toString();

            // 3. Store in Redis with TTL
            await redisConnection.setex(key, this.OTP_TTL, code);
            ttl = this.OTP_TTL;
        }

        // 4. Emit Event for Worker to handle sending
        eventBus.publish(EventType.OTP_REQUESTED, {
            identifier,
            type: this.mapOtpTypeToChannel(type),
            code,
            purpose: type,
            userId,
        });

        return { code, expiresIn: ttl };
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

    private mapOtpTypeToChannel(type: OtpType): 'email' | 'phone' {
        switch (type) {
            case OtpType.EMAIL_VERIFICATION:
            case OtpType.PASSWORD_RESET:
                return 'email';
            case OtpType.PHONE_VERIFICATION:
            case OtpType.TWO_FACTOR:
            case OtpType.WITHDRAWAL_CONFIRMATION:
                return 'phone';
            default:
                return 'email'; // Default fallback
        }
    }
}

export const otpService = new OtpService();
