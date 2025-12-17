import express, { Application, Request, Response, NextFunction } from 'express';
console.log('🔄 [DEBUG] app.ts loading...');
import cors from 'cors';
import helmet from 'helmet';
import { envConfig } from '../shared/config/env.config';
import { corsConfig, helmetConfig, bodySizeLimits } from '../shared/config/security.config';
import { morganMiddleware } from './middlewares/morgan.middleware';
import { globalErrorHandler } from './middlewares/error.middleware';
import { NotFoundError } from '../shared/lib/utils/api-error';
import { sendSuccess } from '../shared/lib/utils/api-response';
import routes from './modules/routes';
import { randomUUID } from 'crypto';
import rateLimiters from './middlewares/rate-limit.middleware';
import path from 'path';

const app: Application = express();
const API_ROUTE = '/api/v1';

// ======================================================
// 1. Core Configuration
// ======================================================

// Trust proxy is essential for Rate Limiting to see real IPs
// behind Load Balancers (AWS, Heroku, Render, Nginx)
if (envConfig.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// ======================================================
// 2. Security Middlewares (Order Matters!)
// ======================================================

// 2a. Security Headers & CORS (Always first)
app.use(helmet(helmetConfig));
app.use(cors(corsConfig));

// Serve Static Files (Uploads)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 2b. Request ID (Early tagging for logs)
app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    req.headers['x-request-id'] = requestId; // Attach to Request
    res.setHeader('X-Request-ID', requestId); // Return to Client
    next();
});

// 2c. Logging (Log the request before processing)
app.use(morganMiddleware);

// ======================================================
// 3. Health Check (BEFORE Rate Limiter)
// ======================================================
// We place this here so Load Balancers don't get banned
// by the rate limiter for pinging the server frequently.
const healthCheck = (req: Request, res: Response) => {
    sendSuccess(res, {
        status: 'OK',
        service: 'SwapLink API',
        uptime: process.uptime(),
        timestamp: new Date(),
    });
};

app.get('/health', healthCheck);
app.get(`${API_ROUTE}/health`, healthCheck);

// ======================================================
// 4. Rate Limiting (DoS Protection)
// ======================================================
// Apply global limits ONLY to API routes, or globally after health check.
// Using it before body parser saves CPU on blocked requests.
app.use(API_ROUTE, rateLimiters.global);

// ======================================================
// 5. Body Parsing
// ======================================================
// NOTE: If you integrate webhooks (Paystack/Stripe) later,
// you might need raw body access here for signature verification.
app.use(
    express.json({
        limit: bodySizeLimits.json,
        verify: (req: any, res: any, buf: any) => {
            // Store the raw buffer for signature verification later
            req.rawBody = buf;
        },
    })
);
app.use(express.urlencoded({ extended: true, limit: bodySizeLimits.urlencoded }));

// ======================================================
// 6. Mount Routes
// ======================================================
app.use(API_ROUTE, routes);

// ======================================================
// 7. Error Handling
// ======================================================

// 404 Handler
app.use((req: Request, res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route not found: ${req.originalUrl}`));
});

// Global Error Handler
app.use(globalErrorHandler);

export default app;

// app.use(
//     express.json({
//         limit: bodySizeLimits.json,
//         verify: (req: any, res, buf) => {
//             // Store raw body for webhook signature verification
//             if (req.url.includes('/webhooks')) {
//                 req.rawBody = buf;
//             }
//         },
//     })
// );
