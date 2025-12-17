import { Request, Response, NextFunction } from 'express';
console.log('🔄 [DEBUG] auth.middleware.ts loading...');
import { JwtUtils } from '../../shared/lib/utils/jwt-utils';
import { UnauthorizedError } from '../../shared/lib/utils/api-error';

/**
 * Authentication Middleware
 *
 * Verifies JWT access token and populates req.user with decoded token payload.
 * Expects token in Authorization header: "Bearer <token>"
 *
 * @throws UnauthorizedError if token is missing or invalid
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.header('Authorization');

        if (!authHeader) {
            throw new UnauthorizedError('No authorization token provided');
        }

        // Check for Bearer token format
        if (!authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('Invalid authorization format. Use: Bearer <token>');
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify token using JwtUtils
        const decoded = JwtUtils.verifyAccessToken(token);

        // Attach user info to request
        req.user = decoded;

        next();
    } catch (error) {
        // Pass error to global error handler
        next(error);
    }
};

/**
 * Optional Authentication Middleware
 *
 * Similar to authenticate, but doesn't throw error if token is missing.
 * Useful for endpoints that work both with and without authentication.
 *
 * @example
 * // Public endpoint that shows more data if authenticated
 * router.get('/products', optionalAuth, productController.list);
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token provided, continue without user
            return next();
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = JwtUtils.verifyAccessToken(token);
        req.user = decoded;

        next();
    } catch {
        // Invalid token, but don't block request
        // Just continue without user
        next();
    }
};

/**
 * Require Specific Role Middleware
 *
 * Ensures authenticated user has a specific role.
 * Must be used after authenticate middleware.
 *
 * @param allowedRoles - Array of allowed roles
 *
 * @example
 * router.delete('/users/:id', authenticate, requireRole(['admin']), userController.delete);
 */
export const requireRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new UnauthorizedError('Authentication required'));
        }

        const userRole = req.user.role || 'user';

        if (!allowedRoles.includes(userRole)) {
            return next(
                new UnauthorizedError(`Access denied. Required roles: ${allowedRoles.join(', ')}`)
            );
        }

        next();
    };
};
