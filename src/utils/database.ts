import { DATABASE_URL, isDevEnv, isProdEnv, isTestEnv, NODE_ENV } from '../config/env';
import { PrismaClient } from '../generated/prisma';

// Log which database we're using (for debugging)
console.log(`🔧 Environment: ${NODE_ENV || 'development'}`);
console.log(`🗄️  Database: ${isTestEnv ? 'TEST' : 'DEVELOPMENT'}`);

// Prevent multiple instances in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        datasources: {
            db: {
                url: DATABASE_URL,
            },
        },
        log: isDevEnv ? ['query', 'info', 'warn', 'error'] : ['error'],
        errorFormat: 'pretty',
    });

if (!isProdEnv) globalForPrisma.prisma = prisma;

// Connection health check
export const checkDatabaseConnection = async (): Promise<boolean> => {
    try {
        const result = await prisma.$queryRaw<
            Array<{ current_database: string }>
        >`SELECT current_database()`;
        const dbName = result[0]?.current_database;

        console.log(`✅ Database connected: ${dbName} (${NODE_ENV || 'unknown'})`);

        // Verify we're using the correct database for the environment
        if (isTestEnv && !dbName?.includes('test')) {
            console.warn('⚠️  Warning: Tests running on non-test database!');
            return false;
        }

        return true;
    } catch (error) {
        console.error(`❌ Database connection failed:`, error);
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
