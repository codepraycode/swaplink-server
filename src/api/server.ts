// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../shared/types/express/index.d.ts" />
import app from './app';

import { envConfig } from '../shared/config/env.config';
import logger from '../shared/lib/utils/logger';
import { checkDatabaseConnection } from '../shared/database';
import { socketService } from '../shared/lib/services/socket.service';
import {
    closeQueues,
    initializeListeners,
    initializeQueues,
} from '../shared/lib/init/service-initializer';
import { initializeSystemResources } from '../shared/lib/init/system-init';

let server: any;
const SERVER_URL = envConfig.SERVER_URL;
const PORT = envConfig.PORT;
const startServer = async () => {
    try {
        // 1. Check database connection
        const isConnected = await checkDatabaseConnection();

        if (!isConnected) {
            throw new Error('Could not establish database connection');
        }
        logger.info('✅ Database connected successfully');

        // 2. Initialize queues (BullMQ)
        logger.info('🔄 Initializing services...');
        await initializeQueues();

        // 3. Initialize Event Listeners
        await initializeListeners();

        // 4. Initialize System Resources (User/Wallet)
        await initializeSystemResources();

        // 5. Start HTTP server
        logger.info('🔄 Starting HTTP server...');
        server = app.listen(PORT, () => {
            logger.info(`🚀 Server running in ${envConfig.NODE_ENV} mode on port ${PORT}`);
            logger.debug(`🔗 Health: ${SERVER_URL}/api/v1/health`);

            // 6. Initialize Socket.io
            socketService.initialize(server);

            logger.info('✅ All services initialized successfully');
        });
    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful Shutdown
const handleShutdown = async (signal: string) => {
    logger.info(`\n${signal} received. Shutting down gracefully...`);

    try {
        // Close queues first
        await closeQueues();

        // Then close HTTP server
        if (server) {
            server.close(() => {
                logger.info('✅ Http server closed.');
                process.exit(0);
            });

            setTimeout(() => {
                logger.error('⏱️  Forcefully shutting down...');
                process.exit(1);
            }, 10000);
        } else {
            logger.warn('Http server not running. No server to close.');
            process.exit(0);
        }
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Start
startServer();
