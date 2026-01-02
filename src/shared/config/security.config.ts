import { CorsOptions } from 'cors';
import { HelmetOptions } from 'helmet';
import { ipKeyGenerator } from 'express-rate-limit';
import { envConfig } from './env.config';
import { CorsError } from '../lib/utils/api-error';
import { Request } from 'express';

// ======================================================
// 1. Centralized Key Generator (Export this!)
// ======================================================
/**
 * Custom key generator to handle Mobile NAT issues.
 * Identifies users by Device ID if available, falling back to IP.
 */
export const rateLimitKeyGenerator = (req: Request | any): string => {
    // 1. Authenticated User (Best)
    if (req.user && req.user.id) return `user:${req.user.id}`;

    // 2. Unauthenticated Mobile Device (Better than IP)
    // Ensure your Expo app sends this header!
    if (req.headers['x-device-id']) return `device:${req.headers['x-device-id']}`;

    // 3. Fallback to IP (Least accurate on mobile data)
    // Use ipKeyGenerator helper to properly handle IPv6
    return ipKeyGenerator(req);
};

// ======================================================
// 2. Rate Limit Configuration
// ======================================================
export const rateLimitConfig = {
    global: {
        windowMs: 15 * 60 * 1000,
        max: 300,
        message: 'We are receiving too many requests from you.',
    },
    auth: {
        windowMs: 15 * 60 * 1000,
        max: 10,
        message:
            'Too many failed login attempts. For your security, please wait before trying again.',
    },
    // OTP Target: Prevents spamming ONE number
    otpTarget: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10,
        message: 'You have requested too many OTPs for this number.',
    },
    // OTP Source: Prevents ONE device spamming ANY number
    otpSource: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 15,
        message: 'We have detected unusual activity. Please try again later.',
    },
};

// ======================================================
// 3. CORS Configuration
// ======================================================
export const corsConfig: CorsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = envConfig.CORS_URLS.split(',').map(url => url.trim());

        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(new CorsError());
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-ID', 'X-App-Version', 'X-API-Key'],
    maxAge: 600,
    optionsSuccessStatus: 204,
};

// ======================================================
// 4. Helmet & Body Config
// ======================================================
export const helmetConfig: HelmetOptions = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'none'"],
            upgradeInsecureRequests: envConfig.NODE_ENV === 'production' ? [] : null,
        },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
};

export const bodySizeLimits = {
    json: '50kb',
    urlencoded: '50kb',
    fileUpload: '10mb',
};

export const customSecurityHeaders = {
    'X-Request-ID': true,
    'X-API-Version': 'v1',
};
