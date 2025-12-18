/* eslint-disable @typescript-eslint/no-require-imports */
import { prisma, OtpType, Otp } from '../../database';

import { BadRequestError } from '../utils/api-error';
import logger from '../utils/logger';
import { ISmsService } from './sms-service/sms.service';
import { BaseEmailService } from './email-service/base-email.service';

export class OtpService {
    private smsService: ISmsService;
    private emailService: BaseEmailService;

    constructor(smsService?: ISmsService, emailService?: BaseEmailService) {
        // Lazy load to avoid circular dependency
        this.smsService = smsService || require('./sms-service/sms.service').smsService;
        this.emailService = emailService || require('./email-service/email.service').emailService;
    }

    /**
     * Generate and Store OTP
     */

    async generateOtp(identifier: string, type: OtpType, userId?: string): Promise<Otp> {
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
                code,
                type,
                expiresAt,
            },
        });

        // 4. Send OTP via appropriate channel
        try {
            await this.sendOtp(identifier, code, type);
        } catch (error) {
            logger.error(`[OTP] Failed to send OTP to ${identifier}:`, error);
            // We don't throw here to prevent OTP generation failure
            // The OTP is still valid in the database
            throw error;
        }

        return otpRecord;
    }

    /**
     * Send OTP via appropriate channel (SMS or Email)
     */
    private async sendOtp(identifier: string, code: string, type: OtpType): Promise<void> {
        switch (type) {
            case OtpType.PHONE_VERIFICATION:
            case OtpType.TWO_FACTOR:
            case OtpType.WITHDRAWAL_CONFIRMATION:
                // Send via SMS for phone-related OTPs
                await this.smsService.sendOtp(identifier, code);
                break;

            case OtpType.EMAIL_VERIFICATION:
            case OtpType.PASSWORD_RESET:
                // Send via Email for email-related OTPs
                await this.emailService.sendVerificationEmail(identifier, code);
                break;

            default:
                logger.warn(`[OTP] Unknown OTP type: ${type} Default to EMAIL`);
                await this.emailService.sendVerificationEmail(identifier, code);
                break;
        }
    }

    /**
     * Verify OTP
     */
    async verifyOtp(identifier: string, code: string, type: OtpType): Promise<boolean> {
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
