import rateLimit, { RateLimitRequestHandler, ipKeyGenerator } from 'express-rate-limit';
console.log('🔄 [DEBUG] rate-limit.middleware.ts loading...');
import { Request, Response } from 'express';
import { rateLimitConfig, rateLimitKeyGenerator } from '../../shared/config/security.config';
import { envConfig } from '../../shared/config/env.config';

/**
 * Standard JSON Response Handler
 */
const standardHandler = (req: Request, res: Response, next: any, options: any) => {
    res.status(options.statusCode).json({
        success: false,
        error: 'Too Many Requests',
        message: options.message,
        retryAfter: Math.ceil(options.windowMs / 1000), // seconds
    });
};

// ======================================================
// Global Rate Limiter
// ======================================================
export const globalRateLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: rateLimitConfig.global.windowMs,
    max: rateLimitConfig.global.max,
    message: rateLimitConfig.global.message,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: rateLimitKeyGenerator, // Imported from config
    handler: standardHandler,
    skip: () => envConfig.NODE_ENV === 'test',
    validate: { ip: false },
});

// ======================================================
// Authentication Rate Limiter
// ======================================================
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: rateLimitConfig.auth.windowMs,
    max: rateLimitConfig.auth.max,
    message: rateLimitConfig.auth.message,
    skipSuccessfulRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: rateLimitKeyGenerator, // Imported from config
    handler: standardHandler,
    skip: () => envConfig.NODE_ENV === 'test',
    validate: { ip: false },
});

// ======================================================
// OTP Rate Limiters
// ======================================================
/**
 * Layer 1: Target Limiter
 * Prevents spamming a SINGLE phone number/email.
 */
export const otpTargetLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: rateLimitConfig.otpTarget.windowMs,
    max: rateLimitConfig.otpTarget.max,
    message: rateLimitConfig.otpTarget.message,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => {
        // Special generator just for this limiter
        const target = req.body?.phone || req.body?.email;
        if (target) return `otp_target:${target}`;

        // Fallback to IP using the helper function
        return `otp_target:${ipKeyGenerator(req)}`;
    },
    handler: standardHandler,
    skip: () => envConfig.NODE_ENV === 'test',
    validate: { ip: false },
});

/**
 * Layer 2: Source Limiter
 * Prevents ONE device/IP from requesting OTPs for MANY different numbers.
 */
export const otpSourceLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: rateLimitConfig.otpSource.windowMs,
    max: rateLimitConfig.otpSource.max,
    message: rateLimitConfig.otpSource.message,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: rateLimitKeyGenerator, // Imported from config
    handler: standardHandler,
    skip: () => envConfig.NODE_ENV === 'test',
    validate: { ip: false },
});

export default {
    global: globalRateLimiter,
    auth: authRateLimiter,
    otpSource: otpSourceLimiter,
    otpTarget: otpTargetLimiter,
};
