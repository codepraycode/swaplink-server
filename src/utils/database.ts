// src/utils/database.ts

import { PrismaClient } from '../generated/prisma';

// Prevent multiple instances in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log:
            process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        errorFormat: 'pretty',
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Connection health check
export const checkDatabaseConnection = async (): Promise<boolean> => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Database connected successfully');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
};

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

export default prisma;
