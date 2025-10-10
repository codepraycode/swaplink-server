// src/server.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user';
import walletRoutes from './routes/wallet';
import offerRoutes from './routes/offer';
import { checkDatabaseConnection } from './utils/database';
import { sendError, sendSuccess } from './utils/response';
import { ApiError } from './utils/error';

dotenv.config({
    path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env.development',
});

const app: express.Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(
    cors({
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        credentials: true,
    })
);
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/wallets', walletRoutes);
app.use('/api/v1/offers', offerRoutes);

// Health check
app.get('/health', async (req, res) => {
    const dbStatus = await checkDatabaseConnection();

    res.status(dbStatus ? 200 : 503).json({
        status: dbStatus ? 'OK' : 'SERVICE_UNAVAILABLE',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        database: dbStatus ? 'connected' : 'disconnected',
        version: process.env.npm_package_version || '1.0.0',
    });
});

// Database connection check on startup
app.get('/ready', async (req, res) => {
    const dbStatus = await checkDatabaseConnection();

    if (dbStatus) {
        return sendSuccess(res, {
            status: 'READY',
            message: 'Application is ready to accept requests',
        });
    } else {
        sendSuccess(
            res,
            {
                status: 'NOT_READY',
                message: 'Database connection failed',
            },
            'NOT_READY',
            513
        );
    }
});

// 404 handler
app.use((req, res) => {
    const err = new ApiError('Route not found', 404, 'SERVER');
    sendError(res, err);
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', error);

    error.message = 'Internal server error';
    error.code = 500;

    sendError(res, error);
});

// Start server with database connection check
const startServer = async () => {
    try {
        const dbConnected = await checkDatabaseConnection();

        if (!dbConnected && process.env.NODE_ENV !== 'test') {
            console.error('❌ Cannot start server without database connection');
            process.exit(1);
        }

        app.listen(PORT, () => {
            console.debug(`🚀 SwapLink API running on port ${PORT}`);
            console.debug(`📊 Environment: ${process.env.NODE_ENV}`);
            console.debug(`🔗 Health check: http://localhost:${PORT}/health`);
            console.debug(`📚 API Docs: http://localhost:${PORT}/api/v1`);

            if (dbConnected) {
                console.debug('✅ Database connected successfully');
            }
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app;
