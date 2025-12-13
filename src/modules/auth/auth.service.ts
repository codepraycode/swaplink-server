import bcrypt from 'bcryptjs';
import { prisma, KycLevel, KycStatus, OtpType, User } from '../../database'; // Adjust imports based on your index.ts
import { ConflictError, NotFoundError, UnauthorizedError } from '../../lib/utils/api-error';
import { JwtUtils } from '../../lib/utils/jwt-utils';
import { otpService } from '../../lib/services/otp.service';
import { bankingQueue } from '../../lib/queues/banking.queue';
import walletService from '../../lib/services/wallet.service';
import logger from '../../lib/utils/logger';
import { formatUserInfo } from '../../lib/utils/functions';

// DTOs
interface AuthDTO {
    email: string;
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
}

type LoginDto = Pick<AuthDTO, 'email' | 'password'>;

class AuthService {
    // --- Helpers ---

    private generateTokens(user: Pick<User, 'email' | 'id'>) {
        const tokenPayload = { userId: user.id, email: user.email };

        const token = JwtUtils.signAccessToken(tokenPayload);
        const refreshToken = JwtUtils.signRefreshToken({ userId: user.id });

        return {
            token,
            refreshToken,
            expiresIn: 86400, // 24h in seconds
        };
    }

    // --- Main Methods ---

    async register(dto: AuthDTO) {
        const { email, phone, password, firstName, lastName } = dto;

        // 1. Check existing user
        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] },
        });

        if (existingUser) {
            throw new ConflictError('User with this email or phone already exists');
        }

        // 2. Hash Password
        const hashedPassword = await bcrypt.hash(password, 12);

        // 3. Create User & Wallet
        const result = await prisma.$transaction(async tx => {
            const user = await tx.user.create({
                data: {
                    email,
                    phone,
                    password: hashedPassword,
                    firstName,
                    lastName,
                    kycLevel: KycLevel.NONE,
                    isVerified: false,
                },
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    firstName: true,
                    lastName: true,
                    kycLevel: true,
                    isVerified: true,
                    createdAt: true,
                },
            });

            const wallet = await walletService.setUpWallet(user.id, tx);

            // 4. Add to Banking Queue (Background)
            // We do this AFTER the transaction commits (conceptually), but here we are inside it.
            // Ideally, we should use an "afterCommit" hook or just fire it here.
            // Since Redis is outside the SQL Tx, if SQL fails, we shouldn't add to Redis.
            // But Prisma doesn't have afterCommit easily.
            // We will return the walletId and add to queue OUTSIDE the transaction block.

            return { user, wallet };
        });

        // 5. Add to Queue (Non-blocking)
        bankingQueue
            .add('create-virtual-account', {
                userId: result.user.id,
                walletId: result.wallet.id,
            })
            .catch(err => logger.error('Failed to add banking job', err));

        // 6. Generate Tokens via Utils
        const tokens = this.generateTokens(result.user);

        return { user: result.user, ...tokens };
    }

    async login(dto: LoginDto) {
        const { email, password } = dto;

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                wallet: {
                    include: { virtualAccount: true },
                },
            },
        });

        if (!user) {
            throw new UnauthorizedError('Invalid email or password');
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            throw new UnauthorizedError('Invalid email or password');
        }

        if (!user.isActive) {
            throw new UnauthorizedError('Account is deactivated');
        }

        // Fire & Forget update
        prisma.user
            .update({
                where: { id: user.id },
                data: { lastLogin: new Date() },
            })
            .catch(err => logger.error('Failed to update last login', err));

        // Generate Tokens via Utils
        const tokens = this.generateTokens(user);

        return {
            user: formatUserInfo(user),
            ...tokens,
        };
    }

    async getUser(id: string) {
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                wallet: {
                    include: { virtualAccount: true },
                },
            },
        });

        if (!user) {
            throw new NotFoundError('User not found');
        }

        return formatUserInfo(user);
    }

    async sendOtp(identifier: string, type: 'phone' | 'email') {
        const otpType = type === 'phone' ? OtpType.PHONE_VERIFICATION : OtpType.EMAIL_VERIFICATION;
        await otpService.generateOtp(identifier, otpType);
        return { expiresIn: 600 };
    }

    async verifyOtp(identifier: string, code: string, type: 'phone' | 'email') {
        const otpType = type === 'phone' ? OtpType.PHONE_VERIFICATION : OtpType.EMAIL_VERIFICATION;

        await otpService.verifyOtp(identifier, code, otpType);

        const whereClause = type === 'email' ? { email: identifier } : { phone: identifier };

        await prisma.user.update({
            where: whereClause,
            data: { isVerified: true },
        });

        return { success: true };
    }

    async requestPasswordReset(email: string) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return; // Silent fail

        await otpService.generateOtp(email, OtpType.PASSWORD_RESET, user.id);
    }

    async verifyResetOtp(email: string, code: string) {
        await otpService.verifyOtp(email, code, OtpType.PASSWORD_RESET);

        // Sign specific reset token via Utils
        const resetToken = JwtUtils.signResetToken(email);

        return { resetToken };
    }

    async resetPassword(resetToken: string, newPassword: string) {
        // Verify specific reset token via Utils
        // This throws BadRequestError if invalid or expired
        const decoded = JwtUtils.verifyResetToken(resetToken);

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { email: decoded.email },
            data: { password: hashedPassword },
        });
    }

    async submitKyc(id: string, data: any) {
        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                kycLevel: KycLevel.BASIC,
                kycStatus: KycStatus.APPROVED,
            },
        });

        return {
            kycLevel: updatedUser.kycLevel,
            status: updatedUser.kycStatus,
        };
    }

    async refreshToken(incomingRefreshToken: string) {
        // 1. Verify the incoming token signature & expiry
        // JwtUtils should throw a specific error if verification fails,
        // which globalErrorHandler will catch.
        const decoded = JwtUtils.verifyRefreshToken(incomingRefreshToken);

        // 2. Check if user still exists and is allowed to login
        // We fetch the user to ensure they weren't banned/deleted
        // since the last token was issued.
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, isActive: true },
        });

        if (!user) {
            throw new UnauthorizedError('User no longer exists');
        }

        if (!user.isActive) {
            throw new UnauthorizedError('Account is deactivated');
        }

        // 3. Generate NEW set of tokens (Rotation)
        // This ensures the old refresh token is effectively discarded by the client
        const newTokens = this.generateTokens(user);

        return newTokens;
    }
}

export default new AuthService();
