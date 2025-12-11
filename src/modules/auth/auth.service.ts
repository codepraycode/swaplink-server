import bcrypt from 'bcryptjs';
import { prisma, KycLevel, KycStatus, OtpType } from '../../database'; // Adjust imports based on your index.ts
import { ConflictError, NotFoundError, UnauthorizedError } from '../../lib/utils/api-error';
import { JwtUtils } from '../../lib/utils/jwt-utils';
import { otpService } from '../../lib/services/otp.service';
import walletService from '../../lib/services/wallet.service';

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

    private generateTokens(user: { id: number | string; email: string }) {
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

            await walletService.setUpWallet(user.id, tx);

            return user;
        });

        // 4. Generate Tokens via Utils
        const tokens = this.generateTokens(result);

        return { user: result, ...tokens };
    }

    async login(dto: LoginDto) {
        const { email, password } = dto;

        const user = await prisma.user.findUnique({
            where: { email },
            include: { wallets: true },
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
            .catch(err => console.error('Failed to update last login', err));

        // Generate Tokens via Utils
        const tokens = this.generateTokens(user);

        const { password: _, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword,
            ...tokens,
        };
    }

    async getUser(id: string) {
        const user = await prisma.user.findUnique({
            where: { id },
            include: { wallets: true },
        });

        if (!user) {
            throw new NotFoundError('User not found');
        }

        const { password, ...safeUser } = user;
        return safeUser;
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
}

export default new AuthService();
