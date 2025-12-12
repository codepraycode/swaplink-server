import { envConfig } from '../../config/env.config';
import { PrismaClient } from '../../database/generated/prisma';

// Prevent multiple instances in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const isDevEnv = envConfig.NODE_ENV === 'development';
const isProdEnv = envConfig.NODE_ENV === 'production';
const isTestEnv = envConfig.NODE_ENV === 'test';

function getPrismaInstance() {
    // Log which database we're using (for debugging)
    console.log(`🔧 Environment: ${envConfig.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: ${isTestEnv ? 'TEST' : 'DEVELOPMENT'}`);
    console.log(`🗄️  Database URL: ${envConfig.DATABASE_URL}`);

    return new PrismaClient({
        datasources: {
            db: {
                url: envConfig.DATABASE_URL,
            },
        },
        log: isDevEnv ? ['query', 'info', 'warn', 'error'] : ['error'],
        errorFormat: 'pretty',
    });
}

export const prisma = globalForPrisma.prisma || getPrismaInstance();

if (!isProdEnv) globalForPrisma.prisma = prisma;

// Connection health check
export const checkDatabaseConnection = async (): Promise<boolean> => {
    try {
        const result = await prisma.$queryRaw<
            Array<{ current_database: string }>
        >`SELECT current_database()`;
        const dbName = result[0]?.current_database;

        console.log(`✅ Database connected: ${dbName} (${envConfig.NODE_ENV || 'unknown'})`);

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
