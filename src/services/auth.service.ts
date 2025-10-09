import { UserId } from '../types/query.types';
import prisma from '../utils/database';
import { ApiError } from '../utils/error';
import { isEmpty } from '../utils/functions';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { BaseService } from './abstract';

interface AuthDTO {
    email: string;
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
}

type LoginDto = Pick<AuthDTO, 'email' | 'password'>;

export class AuthService extends BaseService {
    private generateTokens(user: any) {
        // Generate tokens
        const expiresIn = 24 * 60 * 60; // 24 hours in seconds
        const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET!, {
            expiresIn: '24h',
        });

        const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET!, {
            expiresIn: '7d',
        });

        return {
            expiresIn,
            token,
            refreshToken,
        };
    }

    private async findUser(userId: UserId, hideValue: string[] = []) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                phone: true,
                firstName: true,
                lastName: true,
                kycLevel: true,
                kycStatus: true,
                isVerified: true,
                isActive: true,
                twoFactorEnabled: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true,
                wallets: !hideValue.includes('wallets'),
            },
        });

        if (!user) {
            throw new ApiError('User not found', 404, this.context);
        }

        return user;
    }

    async register(dto: AuthDTO) {
        const { email, phone, password, firstName, lastName } = dto;

        // Check if user exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { phone }],
            },
        });

        if (isEmpty(existingUser)) {
            throw new ApiError('User with this email or phone already exists', 400, this.context);
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                phone,
                password: hashedPassword,
                firstName,
                lastName,
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

        // Create wallets for user
        await prisma.wallet.createMany({
            data: [
                { userId: user.id, currency: 'USD' },
                { userId: user.id, currency: 'NGN' },
            ],
        });

        const { expiresIn, refreshToken, token } = this.generateTokens(user);

        return {
            user,
            token,
            refreshToken,
            expiresIn,
        };
    }

    async login(dto: LoginDto) {
        const { email, password } = dto;

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                wallets: true,
            },
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw new ApiError('Invalid email or password', 401, this.context);
        }

        if (!user.isActive) {
            throw new ApiError('Account is deactivated', 401, this.context);
        }

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });

        const { expiresIn, refreshToken, token } = this.generateTokens(user);

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword,
            token,
            refreshToken,
            expiresIn,
        };
    }

    async getUser(userId: UserId) {
        const user = await this.findUser(userId);

        if (!user) {
            throw new ApiError('User not found', 404, this.context);
        }

        return user;
    }

    async getUserMini(userId: UserId) {
        const user = await this.findUser(userId, ['wallets']);

        if (!user) {
            throw new ApiError('User profile retrieved successfully', 404, this.context);
        }

        return user;
    }
}

export const authService = new AuthService('AuthService');
