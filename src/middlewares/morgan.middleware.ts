import morgan, { StreamOptions } from 'morgan';
import { Request, Response } from 'express';
import logger from '../lib/utils/logger';
import { envConfig } from '../config/env.config';
import { SENSITIVE_KEYS } from '../lib/utils/sensitive-data';

const isDevelopment = envConfig.NODE_ENV === 'development';

// ======================================================
// 1. Stream to Winston
// ======================================================
const stream: StreamOptions = {
    // Trim message to remove empty lines from morgan
    write: message => logger.http(message.trim()),
};

// ======================================================
// 2. Custom Tokens (Security & Auditing)
// ======================================================

/**
 * Token: User ID
 * Essential for tracking "Who did what?" in your logs.
 */
morgan.token('user-id', (req: Request) => {
    // Checks standard locations for user ID (JWT middleware usually sets req.user)
    const user = (req as any).user || (req as any).session?.user;
    return user?.id || 'guest';
});

/**
 * Token: Safe URL (Sanitized)
 * 🚨 SECURITY: Strips sensitive query parameters from the logs.
 * Prevents leaks like /verify?token=SECRET or /kyc?bvn=SECRET
 */
morgan.token('url', (req: Request) => {
    const url = req.originalUrl || req.url;

    // If no query params, return as is
    if (!url.includes('?')) return url;

    try {
        const [path, queryString] = url.split('?');
        const params = new URLSearchParams(queryString);

        SENSITIVE_KEYS.forEach(key => {
            if (params.has(key)) {
                params.set(key, '*****'); // Mask it
            }
        });

        return `${path}?${params.toString()}`;
    } catch (error) {
        // Fallback if parsing fails (unlikely)
        return url.split('?')[0] + '?error_parsing_query';
    }
});

// ======================================================
// 3. Skip Logic
// ======================================================
const skip = (req: Request) => {
    // Skip logs in test environment to keep output clean
    if (envConfig.NODE_ENV === 'test') return true;

    // Optional: Skip health checks to avoid clogging logs (Load Balancer pings)
    if (req.url.includes('/health')) return true;

    return false;
};

// ======================================================
// 4. Formats
// ======================================================

/**
 * Development Format
 * Colorful, concise, focuses on timing and status.
 */
const devFormat = ':method :url :status :response-time ms - User: :user-id';

/**
 * Production Format
 * Standard Apache Combined format + User ID.
 * Note: :remote-addr relies on app.set('trust proxy', 1) in app.ts
 */
const prodFormat =
    ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms';

export const morganMiddleware: any = morgan(isDevelopment ? devFormat : prodFormat, {
    stream,
    skip,
});
