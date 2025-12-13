import app from './app';
import { envConfig } from './config/env.config';
import logger from './lib/utils/logger';
import { prisma, checkDatabaseConnection } from './database';
import { socketService } from './lib/services/socket.service';

let server: any;
const SERVER_URL = envConfig.SERVER_URL;
const PORT = envConfig.PORT;

const startServer = async () => {
    try {
        // 1. Check Database Connection
        // Prisma connects lazily (on first query), but we force it here
        // to fail fast if the DB is down on startup.
        const isConnected = await checkDatabaseConnection();

        if (!isConnected) {
            throw new Error('Could not establish database connection');
        }

        logger.debug('✅ Database connected successfully (Prisma)');

        // 2. Start Listening
        server = app.listen(PORT, () => {
            logger.info(`🚀 Server running in ${envConfig.NODE_ENV} mode on port ${PORT}`);
            logger.debug(`🔗 Health: ${SERVER_URL}:${PORT}/api/v1/health`);

            // 3. Initialize Socket.io
            socketService.initialize(server);
        });
    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful Shutdown
const handleShutdown = (signal: string) => {
    logger.info(`${signal} received. Closing server...`);

    if (server) {
        server.close(async () => {
            logger.info('Http server closed.');

            // 3. Disconnect Prisma
            await prisma.$disconnect();
            logger.debug('Prisma client disconnected.');

            process.exit(0);
        });
    } else {
        process.exit(0);
    }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Start
startServer();
