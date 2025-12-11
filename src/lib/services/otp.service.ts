import { prisma, OtpType } from '../../database';

import { BadRequestError, InternalError } from '../utils/api-error';
import logger from '../utils/logger';

export class OtpService {
    /**
     * Generate and Store OTP
     */
    async generateOtp(identifier: string, type: OtpType, userId?: string) {
        // 1. Generate secure 6 digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // 2. Invalidate previous OTPs
        // We use updateMany instead of delete to keep audit history,
        // but ensure 'isUsed' is true so they can't be used again.
        await prisma.otp.updateMany({
            where: { identifier, type, isUsed: false },
            data: { isUsed: true },
        });

        // 3. Create new OTP
        const otpRecord = await prisma.otp.create({
            data: {
                identifier,
                userId,
                code,
                type,
                expiresAt,
            },
        });

        // 4. Send OTP (Simulated)
        // In production, inject an SmsService or EmailService here
        if (process.env.NODE_ENV !== 'test') {
            logger.info(`[OTP] Generated for ${identifier} (${type}): ${code}`);
        }

        return otpRecord;
    }

    /**
     * Verify OTP
     */
    async verifyOtp(identifier: string, code: string, type: OtpType) {
        // 1. Find valid OTP
        const otpRecord = await prisma.otp.findFirst({
            where: {
                identifier,
                code,
                type,
                isUsed: false,
                expiresAt: { gt: new Date() }, // Check expiration in DB query
            },
        });

        if (!otpRecord) {
            throw new BadRequestError('Invalid or expired OTP');
        }

        // 2. Mark as used immediately to prevent replay attacks
        await prisma.otp.update({
            where: { id: otpRecord.id },
            data: { isUsed: true },
        });

        return true;
    }
}

export const otpService = new OtpService();
