import prisma from '../lib/utils/database';
import logger from '../lib/utils/logger';

// Global test timeout
jest.setTimeout(30000);

// Verify we're using test database
beforeAll(async () => {
    logger.debug(`🧪 Test Environment: ${process.env.NODE_ENV}`);

    try {
        const result = await prisma.$queryRaw<
            Array<{ current_database: string }>
        >`SELECT current_database()`;
        const dbName = result?.[0]?.current_database;
        logger.debug(`🔍 Connected to database: ${dbName}`);

        if (!dbName?.includes('test')) {
            throw new Error(
                `❌ Tests are running on wrong database: ${dbName}. Expected test database.`
            );
        }
    } catch (error) {
        throw new Error(`❌ Database connection failed: ${error}`);
    }
});

// Disconnect from database after all tests
afterAll(async () => {
    if (process.env.NODE_ENV !== 'test') {
        throw new Error('Tests should only run in test environment!');
    }

    // Clean up database tables in correct order (respecting foreign keys)
    try {
        await prisma.transaction.deleteMany();
        await prisma.wallet.deleteMany();
        await prisma.kycDocument.deleteMany();
        await prisma.bankAccount.deleteMany();
        await prisma.otp.deleteMany();
        await prisma.user.deleteMany();
        logger.debug('✅ Database cleaned successfully');
    } catch (error) {
        logger.warn('⚠️ Database cleanup had issues:', error);
    }

    await prisma.$disconnect();
});
