import prisma from '../shared/lib/utils/database';
import logger from '../shared/lib/utils/logger';

jest.setTimeout(30000);

// Helper to detect if we are running unit tests (which shouldn't touch DB)
// You can set this via the command line: "test:unit": "IS_UNIT_TEST=true ..."
const isUnitTest = process.env.IS_UNIT_TEST === 'true';

beforeAll(async () => {
    // SKIP DB connection for unit tests
    if (process.env.IS_UNIT_TEST === 'true') return;

    logger.debug(`🧪 Test Environment: ${process.env.NODE_ENV}`);
    try {
        const result = await prisma.$queryRaw<
            Array<{ current_database: string }>
        >`SELECT current_database()`;
        const dbName = result?.[0]?.current_database;
        if (!dbName?.includes('test')) {
            throw new Error(`❌ Wrong database: ${dbName}`);
        }
    } catch (error) {
        throw new Error(`❌ DB Connection failed: ${error}`);
    }
});

afterAll(async () => {
    // SKIP DB cleanup for unit tests
    if (isUnitTest) return;

    if (process.env.NODE_ENV !== 'test') {
        throw new Error('Tests should only run in test environment!');
    }

    try {
        await prisma.transaction.deleteMany();
        await prisma.wallet.deleteMany();
        // ... rest of deletions
        logger.debug('✅ Database cleaned successfully');
    } catch (error) {
        logger.warn('⚠️ Cleanup issues:', error);
    }

    await prisma.$disconnect();
});
