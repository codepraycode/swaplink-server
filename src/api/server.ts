// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../shared/types/express/index.d.ts" />
import app from './app';
import { envConfig } from '../shared/config/env.config';
import logger from '../shared/lib/utils/logger';
import { prisma, checkDatabaseConnection } from '../shared/database';
import { socketService } from '../shared/lib/services/socket.service';
import { P2PChatGateway } from './modules/p2p/chat/p2p-chat.gateway';

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
            logger.debug(`🔗 Health: ${SERVER_URL}/api/v1/health`);

            // 3. Initialize Socket.io
            socketService.initialize(server);

            // 4. Initialize P2P Chat Gateway
            const io = socketService.getIO();
            if (io) {
                new P2PChatGateway(io);
            }
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

            logger.warn('Http server closed.');
            process.exit(0);
        });
    } else {
        logger.warn('Http server not running. No server to close.');
        process.exit(0);
    }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Start
startServer();
