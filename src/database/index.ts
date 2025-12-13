import logger from '../lib/utils/logger';
import { envConfig } from '../config/env.config';
import { PrismaClient } from './generated/prisma';

export * from './database.types';
export * from './database.errors';

const isDevelopment = envConfig.NODE_ENV === 'development';

// 1. Define the Prisma Client type globally to prevent TS errors on 'global'
declare global {
    var prisma: PrismaClient | undefined;
}

// 2. Create the client instance
// We can configure log levels here based on environment
export const prisma =
    global.prisma ||
    new PrismaClient({
        datasources: {
            db: {
                url: envConfig.DATABASE_URL,
            },
        },
        log: isDevelopment ? ['query', 'info', 'warn', 'error'] : ['error'],
    });

// 3. Middleware: Logging (Optional but recommended)
// Use this to pipe Prisma query times into your Winston logger
if (isDevelopment) {
    prisma.$on('query' as never, (e: any) => {
        // logger.debug(`Query: ${e.query}`);
        // logger.debug(`Duration: ${e.duration}ms`);
    });
}

// 4. Save the instance to global in development
if (isDevelopment) {
    global.prisma = prisma;
}

// 5. Helper function to check connection health
export const checkDatabaseConnection = async (): Promise<boolean> => {
    try {
        await prisma.$connect();
        return true;
    } catch (error) {
        logger.error('Database connection check failed:', error);
        return false;
    }
};
