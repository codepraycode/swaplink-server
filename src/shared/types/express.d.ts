/**
 * Express Type Declarations
 *
 * Extends Express Request interface to include custom properties
 * used throughout the application (user, device info, etc.)
 */

import { TokenPayload } from '../lib/utils/jwt-utils';

declare global {
    namespace Express {
        /**
         * Extended Request interface with custom properties
         */
        interface Request {
            rawBody?: Buffer;
            /**
             * Authenticated user information from JWT token
             * Populated by authentication middleware after token verification
             *
             * @example
             * ```typescript
             * router.get('/profile', authenticate, (req, res) => {
             *     const userId = req.user.userId;
             *     const email = req.user.email;
             * });
             * ```
             */
            user?: TokenPayload;

            /**
             * Device ID from mobile app (sent via X-Device-ID header)
             * Used for rate limiting and device fingerprinting
             */
            deviceId?: string;

            /**
             * App version from mobile app (sent via X-App-Version header)
             * Used for force update checks
             */
            appVersion?: string;

            /**
             * Request ID for tracking and logging
             * Auto-generated or from X-Request-ID header
             */
            requestId?: string;
        }
    }
}

// This export is required to make this a module
export {};
