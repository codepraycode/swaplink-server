import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import { rateLimitConfig, rateLimitKeyGenerator } from '../../shared/config/security.config';

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

import { envConfig } from '../../shared/config/env.config';

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
    keyGenerator: req => {
        // Special generator just for this limiter
        return `otp_target:${req.body?.phone || req.body?.email || req.ip}`;
    },
    handler: standardHandler,
    skip: () => envConfig.NODE_ENV === 'test',
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
});

export default {
    global: globalRateLimiter,
    auth: authRateLimiter,
    otpSource: otpSourceLimiter,
    otpTarget: otpTargetLimiter,
};
