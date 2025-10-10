import { UserId } from '../types/query.types';
import prisma from '../utils/database';
import { ApiError, PrismaErrorHandler } from '../utils/error';
import { isEmpty } from '../utils/functions';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { BaseService } from './abstract';
import { walletService } from './wallet.service';

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
        const expiresIn = 24 * 60 * 60;
        const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET!, {
            expiresIn: '24h',
        });

        const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET!, {
            expiresIn: '7d',
        });

        return { expiresIn, token, refreshToken };
    }

    private async findUser(userId: UserId, hideValue: string[] = []) {
        const res = await PrismaErrorHandler.wrap(
            () =>
                prisma.user.findUnique({
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
                }),
            {
                operationName: this.context,
                customErrorMessage: 'User not found',
            }
        );

        if (!res.success) {
            throw new ApiError(res.error, 404, this.context);
        }

        return res.data!;
    }

    async register(dto: AuthDTO) {
        const { email, phone, password, firstName, lastName } = dto;

        // Check if user already exists
        const existingRes = await PrismaErrorHandler.wrap(
            () =>
                prisma.user.findFirst({
                    where: {
                        OR: [{ email }, { phone }],
                    },
                }),
            {
                operationName: this.context,
                customErrorMessage: 'Error checking existing user',
            }
        );

        if (!existingRes.success) {
            throw new ApiError(existingRes.error, 400, this.context);
        }

        if (existingRes.data) {
            throw new ApiError('User with this email or phone already exists', 400, this.context);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const userRes = await PrismaErrorHandler.wrap(
            () =>
                prisma.user.create({
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
                }),
            {
                operationName: this.context,
                customErrorMessage: 'Failed to create user',
            }
        );

        if (!userRes.success) {
            throw new ApiError(userRes.error, 400, this.context);
        }

        const user = userRes.data!;

        // Create wallets for the new user
        await walletService.setUpWallet(user.id);

        const { expiresIn, refreshToken, token } = this.generateTokens(user);

        return { user, token, refreshToken, expiresIn };
    }

    async login(dto: LoginDto) {
        const { email, password } = dto;

        // Find user
        const userRes = await PrismaErrorHandler.wrap(
            () =>
                prisma.user.findUnique({
                    where: { email },
                    include: { wallets: true },
                }),
            {
                operationName: this.context,
                customErrorMessage: 'Failed to find user',
            }
        );

        if (!userRes.success || !userRes.data) {
            throw new ApiError('Invalid email or password', 401, this.context);
        }

        const user = userRes.data;

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            throw new ApiError('Invalid email or password', 401, this.context);
        }

        if (!user.isActive) {
            throw new ApiError('Account is deactivated', 401, this.context);
        }

        // Update last login
        const updateRes = await PrismaErrorHandler.wrap(
            () =>
                prisma.user.update({
                    where: { id: user.id },
                    data: { lastLogin: new Date() },
                }),
            {
                operationName: this.context,
                customErrorMessage: 'Failed to update last login',
            }
        );

        if (!updateRes.success) {
            throw new ApiError(updateRes.error, 500, this.context);
        }

        const { expiresIn, refreshToken, token } = this.generateTokens(user);

        const { password: _, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword,
            token,
            refreshToken,
            expiresIn,
        };
    }

    async getUser(userId: UserId) {
        const userRes = await PrismaErrorHandler.wrap(
            () =>
                prisma.user.findUnique({
                    where: { id: userId },
                    include: { wallets: true },
                }),
            {
                operationName: this.context,
                customErrorMessage: 'User not found',
            }
        );

        if (!userRes.success) {
            throw new ApiError(userRes.error, 404, this.context);
        }

        return userRes.data;
    }

    async getUserMini(userId: UserId) {
        const userRes = await PrismaErrorHandler.wrap(
            () =>
                prisma.user.findUnique({
                    where: { id: userId },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        kycLevel: true,
                        isVerified: true,
                    },
                }),
            {
                operationName: this.context,
                customErrorMessage: 'Failed to retrieve user profile',
            }
        );

        if (!userRes.success) {
            throw new ApiError(userRes.error, 404, this.context);
        }

        return userRes.data;
    }
}

export const authService = new AuthService('AuthService');
