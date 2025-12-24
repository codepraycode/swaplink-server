/**
 * Example: Using req.user in Controllers
 *
 * This file demonstrates how to properly use the req.user property
 * that is populated by the authentication middleware.
 */

import { Request, Response } from 'express';
import { sendSuccess } from '../lib/utils/api-response';

/**
 * Example 1: Basic Usage
 * Access authenticated user information in a protected route
 */
export const getProfile = (req: Request, res: Response) => {
    // TypeScript knows req.user exists and has the TokenPayload shape
    const userId = req.user!.userId; // Use ! if you're certain user exists (after authenticate middleware)
    const email = req.user!.email;

    sendSuccess(res, {
        userId,
        email,
        message: 'Profile retrieved successfully',
    });
};

/**
 * Example 2: Safe Access with Optional Chaining
 * Use when you're not 100% sure user is authenticated
 */
export const getOptionalUserData = (req: Request, res: Response) => {
    // Safe access with optional chaining
    const userId = req.user?.userId;
    const email = req.user?.email;

    if (!userId) {
        return sendSuccess(res, {
            message: 'Public data',
            authenticated: false,
        });
    }

    sendSuccess(res, {
        message: 'User-specific data',
        authenticated: true,
        userId,
        email,
    });
};

/**
 * Example 3: Type Guard Pattern
 * Ensure user is authenticated before proceeding
 */
export const updateProfile = (req: Request, res: Response) => {
    // Type guard
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
        });
    }

    // After the guard, TypeScript knows req.user is defined
    const userId = req.user.userId;
    const { firstName, lastName } = req.body;

    // Update user profile logic here...

    sendSuccess(res, {
        message: 'Profile updated',
        userId,
    });
};

/**
 * Example 4: Using in Service Layer
 * Pass user info to service methods
 */
export const createTransaction = async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { amount, recipientId } = req.body;

    // Pass userId to service
    // const transaction = await transactionService.create({
    //     userId,
    //     amount,
    //     recipientId,
    // });

    sendSuccess(res, {
        message: 'Transaction created',
        // transaction,
    });
};

/**
 * Example 5: Role-Based Access
 * Check user role from JWT payload
 */
export const adminOnlyAction = (req: Request, res: Response) => {
    const userRole = req.user?.role || 'user';

    if (userRole !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required',
        });
    }

    // Admin-only logic here...

    sendSuccess(res, {
        message: 'Admin action completed',
    });
};

/**
 * Example 6: Using with Async/Await
 * Typical controller pattern with database operations
 */
export const getUserWallet = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;

        // Fetch wallet from database
        // const wallet = await prisma.wallet.findUnique({
        //     where: { userId: userId as string },
        // });

        // if (!wallet) {
        //     throw new NotFoundError('Wallet not found');
        // }

        sendSuccess(res, {
            message: 'Wallet retrieved',
            // wallet,
        });
    } catch (error) {
        throw error; // Let global error handler deal with it
    }
};

/**
 * Example 7: Combining with Route Parameters
 * Ensure user can only access their own resources
 */
export const getTransaction = async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { transactionId } = req.params;

    // Fetch transaction
    // const transaction = await prisma.transaction.findUnique({
    //     where: { id: transactionId },
    // });

    // Ensure transaction belongs to authenticated user
    // if (transaction.userId !== userId) {
    //     throw new UnauthorizedError('Access denied');
    // }

    sendSuccess(res, {
        message: 'Transaction retrieved',
        // transaction,
    });
};

/**
 * Example 8: Using in Middleware
 * Custom middleware that uses req.user
 */
export const checkKycStatus = (req: Request, res: Response, next: any) => {
    const userId = req.user!.userId;

    // Check KYC status from database
    // const user = await prisma.user.findUnique({
    //     where: { id: userId as string },
    //     select: { kycStatus: true },
    // });

    // if (user.kycStatus !== 'APPROVED') {
    //     return res.status(403).json({
    //         success: false,
    //         message: 'KYC verification required',
    //     });
    // }

    next();
};

/**
 * Example Route Setup
 *
 * In your routes file:
 *
 * ```typescript
 * import { Router } from 'express';
 * import { authenticate, optionalAuth } from '../../middlewares/auth.middleware';
 * import * as exampleController from './example.controller';
 *
 * const router = Router();
 *
 * // Protected route - requires authentication
 * router.get('/profile', authenticate, exampleController.getProfile);
 *
 * // Optional auth - works with or without token
 * router.get('/data', optionalAuth, exampleController.getOptionalUserData);
 *
 * // Multiple middlewares
 * router.post('/transaction',
 *     authenticate,
 *     checkKycStatus,
 *     exampleController.createTransaction
 * );
 *
 * export default router;
 * ```
 */

/**
 * TypeScript Autocomplete
 *
 * With the express.d.ts declaration, you get full autocomplete:
 *
 * req.user.       // TypeScript will suggest:
 *   ├─ userId     // string | number
 *   ├─ email      // string | undefined
 *   ├─ role       // string | undefined
 *   ├─ iat        // number (issued at)
 *   └─ exp        // number (expiration)
 */
