import jwt, { JwtPayload } from 'jsonwebtoken';
import { UnauthorizedError, BadRequestError } from './api-error';
import { envConfig } from '../../config/env.config';
import { User } from '../../database';
import { type Request } from 'express';

import { TokenPayload, ResetTokenPayload } from '../../types/auth.types';

export class JwtUtils {
    /**
     * Generate an Access Token (Standard Auth)
     */
    static signAccessToken(payload: TokenPayload): string {
        return jwt.sign(payload, envConfig.JWT_SECRET, {
            expiresIn: envConfig.JWT_ACCESS_EXPIRATION as any,
        });
    }

    /**
     * Generate a Refresh Token (Long lived)
     */
    static signRefreshToken(payload: Pick<TokenPayload, 'userId'>): string {
        return jwt.sign(payload, envConfig.JWT_REFRESH_SECRET, {
            expiresIn: envConfig.JWT_REFRESH_EXPIRATION as any,
        });
    }

    /**
     * Generate a Password Reset Token (Short lived, specific type)
     */
    static signResetToken(email: User['email']): string {
        const payload: ResetTokenPayload = { email, type: 'reset' };
        return jwt.sign(payload, envConfig.JWT_SECRET, {
            expiresIn: '15m', // Hardcoded short expiry for security
        });
    }

    /**
     * Verify Access Token
     */
    static verifyAccessToken(token: string): TokenPayload {
        try {
            return jwt.verify(token, envConfig.JWT_SECRET) as TokenPayload;
        } catch {
            throw new UnauthorizedError('Invalid or expired access token');
        }
    }

    /**
     * Verify Refresh Token
     */
    static verifyRefreshToken(token: string): TokenPayload {
        try {
            return jwt.verify(token, envConfig.JWT_REFRESH_SECRET) as TokenPayload;
        } catch {
            throw new UnauthorizedError('Invalid or expired refresh token');
        }
    }

    /**
     * Verify Reset Token
     * Checks signature AND ensures type is 'reset'
     */
    static verifyResetToken(token: string): ResetTokenPayload {
        try {
            const decoded = jwt.verify(token, envConfig.JWT_SECRET) as ResetTokenPayload;

            if (decoded.type !== 'reset') {
                throw new Error('Invalid token type');
            }

            return decoded;
        } catch {
            throw new BadRequestError('Invalid or expired reset token');
        }
    }

    /**
     * Decode a token without verifying (Useful for debugging/client checks)
     */
    static decode(token: string): JwtPayload | null {
        return jwt.decode(token) as JwtPayload;
    }

    static ensureAuthentication(req: Request) {
        const user = (req as any).user;
        if (!user) {
            throw new UnauthorizedError('No authentication token provided');
        }
        return user;
    }
}
