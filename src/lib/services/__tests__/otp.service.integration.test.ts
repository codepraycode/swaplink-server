import prisma from '../../../lib/utils/database';
import { otpService } from '../otp.service';
import { OtpType } from '../../../database';
import { BadRequestError } from '../../utils/api-error';

describe('OtpService - Integration Tests', () => {
    beforeEach(async () => {
        // Clean up database before each test
        await prisma.otp.deleteMany();
    });

    describe('generateOtp', () => {
        it('should generate and store OTP in database', async () => {
            const identifier = 'test@example.com';
            const type = OtpType.EMAIL_VERIFICATION;

            const result = await otpService.generateOtp(identifier, type);

            expect(result.id).toBeDefined();
            expect(result.identifier).toBe(identifier);
            expect(result.type).toBe(type);
            expect(result.code).toMatch(/^\d{6}$/);
            expect(result.isUsed).toBe(false);
            expect(result.expiresAt).toBeInstanceOf(Date);

            // Verify it's in the database
            const otpRecord = await prisma.otp.findUnique({
                where: { id: result.id },
            });

            expect(otpRecord).toBeDefined();
            expect(otpRecord?.code).toBe(result.code);
        });

        it('should generate unique codes for each OTP', async () => {
            const identifier = 'test@example.com';
            const type = OtpType.EMAIL_VERIFICATION;

            const otp1 = await otpService.generateOtp(identifier, type);
            const otp2 = await otpService.generateOtp(identifier, type);

            expect(otp1.code).not.toBe(otp2.code);
        });

        it('should invalidate previous OTPs when generating new one', async () => {
            const identifier = 'test@example.com';
            const type = OtpType.EMAIL_VERIFICATION;

            const firstOtp = await otpService.generateOtp(identifier, type);

            // Generate second OTP
            await otpService.generateOtp(identifier, type);

            // First OTP should be marked as used
            const invalidatedOtp = await prisma.otp.findUnique({
                where: { id: firstOtp.id },
            });

            expect(invalidatedOtp?.isUsed).toBe(true);
        });

        it('should only invalidate OTPs of the same type', async () => {
            const identifier = 'test@example.com';

            const emailOtp = await otpService.generateOtp(identifier, OtpType.EMAIL_VERIFICATION);
            const resetOtp = await otpService.generateOtp(identifier, OtpType.PASSWORD_RESET);

            // Email OTP should still be valid
            const emailOtpRecord = await prisma.otp.findUnique({
                where: { id: emailOtp.id },
            });

            expect(emailOtpRecord?.isUsed).toBe(false);
            expect(resetOtp.isUsed).toBe(false);
        });

        it('should set expiration to 10 minutes from now', async () => {
            const identifier = 'test@example.com';
            const type = OtpType.EMAIL_VERIFICATION;

            const beforeTime = Date.now();
            const result = await otpService.generateOtp(identifier, type);
            const afterTime = Date.now();

            const expectedExpiration = 10 * 60 * 1000; // 10 minutes in ms
            const expirationTime = result.expiresAt.getTime();

            expect(expirationTime).toBeGreaterThanOrEqual(beforeTime + expectedExpiration);
            expect(expirationTime).toBeLessThanOrEqual(afterTime + expectedExpiration);
        });

        it('should handle different OTP types', async () => {
            const identifier = 'test@example.com';

            const emailOtp = await otpService.generateOtp(identifier, OtpType.EMAIL_VERIFICATION);
            const phoneOtp = await otpService.generateOtp(
                '+2341234567890',
                OtpType.PHONE_VERIFICATION
            );
            const resetOtp = await otpService.generateOtp(identifier, OtpType.PASSWORD_RESET);

            expect(emailOtp.type).toBe(OtpType.EMAIL_VERIFICATION);
            expect(phoneOtp.type).toBe(OtpType.PHONE_VERIFICATION);
            expect(resetOtp.type).toBe(OtpType.PASSWORD_RESET);
        });
    });

    describe('verifyOtp', () => {
        it('should verify valid OTP successfully', async () => {
            const identifier = 'test@example.com';
            const type = OtpType.EMAIL_VERIFICATION;

            const generated = await otpService.generateOtp(identifier, type);

            const result = await otpService.verifyOtp(identifier, generated.code, type);

            expect(result).toBe(true);

            // OTP should be marked as used
            const otpRecord = await prisma.otp.findUnique({
                where: { id: generated.id },
            });

            expect(otpRecord?.isUsed).toBe(true);
        });

        it('should throw BadRequestError for invalid code', async () => {
            const identifier = 'test@example.com';
            const type = OtpType.EMAIL_VERIFICATION;

            await otpService.generateOtp(identifier, type);

            await expect(otpService.verifyOtp(identifier, '000000', type)).rejects.toThrow(
                BadRequestError
            );
            await expect(otpService.verifyOtp(identifier, '000000', type)).rejects.toThrow(
                'Invalid or expired OTP'
            );
        });

        it('should throw BadRequestError for wrong identifier', async () => {
            const identifier = 'test@example.com';
            const type = OtpType.EMAIL_VERIFICATION;

            const generated = await otpService.generateOtp(identifier, type);

            await expect(
                otpService.verifyOtp('wrong@example.com', generated.code, type)
            ).rejects.toThrow(BadRequestError);
        });

        it('should throw BadRequestError for wrong type', async () => {
            const identifier = 'test@example.com';

            const generated = await otpService.generateOtp(identifier, OtpType.EMAIL_VERIFICATION);

            await expect(
                otpService.verifyOtp(identifier, generated.code, OtpType.PASSWORD_RESET)
            ).rejects.toThrow(BadRequestError);
        });

        it('should throw BadRequestError for expired OTP', async () => {
            const identifier = 'test@example.com';
            const type = OtpType.EMAIL_VERIFICATION;

            const generated = await otpService.generateOtp(identifier, type);

            // Manually expire the OTP
            await prisma.otp.update({
                where: { id: generated.id },
                data: { expiresAt: new Date(Date.now() - 1000) }, // 1 second ago
            });

            await expect(otpService.verifyOtp(identifier, generated.code, type)).rejects.toThrow(
                BadRequestError
            );
        });

        it('should throw BadRequestError for already used OTP', async () => {
            const identifier = 'test@example.com';
            const type = OtpType.EMAIL_VERIFICATION;

            const generated = await otpService.generateOtp(identifier, type);

            // Verify once
            await otpService.verifyOtp(identifier, generated.code, type);

            // Try to verify again
            await expect(otpService.verifyOtp(identifier, generated.code, type)).rejects.toThrow(
                BadRequestError
            );
        });

        it('should prevent replay attacks', async () => {
            const identifier = 'test@example.com';
            const type = OtpType.EMAIL_VERIFICATION;

            const generated = await otpService.generateOtp(identifier, type);
            const code = generated.code;

            // First verification should succeed
            await otpService.verifyOtp(identifier, code, type);

            // Second verification with same code should fail
            await expect(otpService.verifyOtp(identifier, code, type)).rejects.toThrow(
                BadRequestError
            );
        });
    });

    describe('Complete OTP Flows', () => {
        it('should handle email verification flow', async () => {
            const email = 'user@example.com';

            // Generate OTP
            const generated = await otpService.generateOtp(email, OtpType.EMAIL_VERIFICATION);
            expect(generated.code).toMatch(/^\d{6}$/);

            // Verify OTP
            const verified = await otpService.verifyOtp(
                email,
                generated.code,
                OtpType.EMAIL_VERIFICATION
            );
            expect(verified).toBe(true);

            // Verify OTP is marked as used
            const otpRecord = await prisma.otp.findUnique({
                where: { id: generated.id },
            });
            expect(otpRecord?.isUsed).toBe(true);
        });

        it('should handle phone verification flow', async () => {
            const phone = '+2341234567890';

            // Generate OTP
            const generated = await otpService.generateOtp(phone, OtpType.PHONE_VERIFICATION);

            // Verify OTP
            const verified = await otpService.verifyOtp(
                phone,
                generated.code,
                OtpType.PHONE_VERIFICATION
            );
            expect(verified).toBe(true);
        });

        // Note: userId field not in current schema - test modified
        it('should handle password reset flow', async () => {
            const email = 'user@example.com';

            // Generate OTP (userId parameter ignored in current implementation)
            const generated = await otpService.generateOtp(email, OtpType.PASSWORD_RESET);

            // Verify OTP
            const verified = await otpService.verifyOtp(
                email,
                generated.code,
                OtpType.PASSWORD_RESET
            );
            expect(verified).toBe(true);
        });

        it('should handle multiple OTP requests for same identifier', async () => {
            const email = 'user@example.com';

            // First request
            const otp1 = await otpService.generateOtp(email, OtpType.EMAIL_VERIFICATION);

            // Second request (should invalidate first)
            const otp2 = await otpService.generateOtp(email, OtpType.EMAIL_VERIFICATION);

            // First OTP should fail
            await expect(
                otpService.verifyOtp(email, otp1.code, OtpType.EMAIL_VERIFICATION)
            ).rejects.toThrow(BadRequestError);

            // Second OTP should succeed
            const verified = await otpService.verifyOtp(
                email,
                otp2.code,
                OtpType.EMAIL_VERIFICATION
            );
            expect(verified).toBe(true);
        });

        it('should handle concurrent OTP types for same identifier', async () => {
            const email = 'user@example.com';

            // Generate both email verification and password reset OTPs
            const emailOtp = await otpService.generateOtp(email, OtpType.EMAIL_VERIFICATION);
            const resetOtp = await otpService.generateOtp(email, OtpType.PASSWORD_RESET);

            // Both should be verifiable
            const emailVerified = await otpService.verifyOtp(
                email,
                emailOtp.code,
                OtpType.EMAIL_VERIFICATION
            );
            const resetVerified = await otpService.verifyOtp(
                email,
                resetOtp.code,
                OtpType.PASSWORD_RESET
            );

            expect(emailVerified).toBe(true);
            expect(resetVerified).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle very long identifiers', async () => {
            const longEmail = 'a'.repeat(100) + '@example.com';
            const type = OtpType.EMAIL_VERIFICATION;

            const generated = await otpService.generateOtp(longEmail, type);
            const verified = await otpService.verifyOtp(longEmail, generated.code, type);

            expect(verified).toBe(true);
        });

        it('should handle special characters in identifier', async () => {
            const email = 'user+test@example.com';
            const type = OtpType.EMAIL_VERIFICATION;

            const generated = await otpService.generateOtp(email, type);
            const verified = await otpService.verifyOtp(email, generated.code, type);

            expect(verified).toBe(true);
        });

        it('should maintain separate OTP histories for different identifiers', async () => {
            const email1 = 'user1@example.com';
            const email2 = 'user2@example.com';
            const type = OtpType.EMAIL_VERIFICATION;

            const otp1 = await otpService.generateOtp(email1, type);
            const otp2 = await otpService.generateOtp(email2, type);

            // Both should be verifiable independently
            await otpService.verifyOtp(email1, otp1.code, type);
            await otpService.verifyOtp(email2, otp2.code, type);

            const allOtps = await prisma.otp.findMany({
                where: { type },
            });

            expect(allOtps).toHaveLength(2);
            expect(allOtps.every(otp => otp.isUsed)).toBe(true);
        });
    });
});
