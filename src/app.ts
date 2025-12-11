import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { envConfig } from './config/env.config';
import { morganMiddleware } from './config/morgan.config';
import { globalErrorHandler } from './middlewares/error.middleware';
import { NotFoundError } from './lib/utils/api-error';
import { sendSuccess } from './lib/utils/api-response';
import routes from './routes'; // Imports the aggregator

const app: Application = express();
const API_ROUTE = '/api/v1';

// ======================================================
// 1. Middlewares
// ======================================================
app.use(helmet());
app.use(
    cors({
        origin: envConfig.CORS_URLS.split(','),
        credentials: true,
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logging
app.use(morganMiddleware);

// ======================================================
// 2. Health Checks
// ======================================================
app.get('/health', (req: Request, res: Response) => {
    // Simple liveness probe
    sendSuccess(res, {
        status: 'OK',
        uptime: process.uptime(),
        timestamp: new Date(),
    });
});

// ======================================================
// 3. Mount Routes
// ======================================================
app.use(API_ROUTE, routes);

// ======================================================
// 4. Error Handling
// ======================================================

// 404 Handler (Must be after all routes)
app.use((req: Request, res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route not found: ${req.originalUrl}`));
});

// Global Error Handler (Must be the very last middleware)
app.use(globalErrorHandler);

export default app;
