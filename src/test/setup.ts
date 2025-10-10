import prisma from '../utils/database';
import { PrismaErrorHandler } from '../utils/error';

// Global test timeout
jest.setTimeout(30000);

// Verify we're using test database
beforeAll(async () => {
    console.log(`🧪 Test Environment: ${process.env.NODE_ENV}`);

    const result = await PrismaErrorHandler.wrap(
        () => prisma.$queryRaw<Array<{ current_database: string }>>`SELECT current_database()`,
        {
            operationName: 'TEST SETUP',
            customErrorMessage: 'Failed to check database connection',
        }
    );

    if (!result.success) {
        throw new Error(`❌ Database connection failed: ${result.error}`);
    }

    const dbName = result.data?.[0]?.current_database;
    console.log(`🔍 Connected to database: ${dbName}`);

    if (!dbName?.includes('test')) {
        throw new Error(
            `❌ Tests are running on wrong database: ${dbName}. Expected test database.`
        );
    }
});

beforeEach(async () => {
    if (process.env.NODE_ENV !== 'test') {
        throw new Error('Tests should only run in test environment!');
    }

    // Use individual delete operations instead of TRUNCATE to avoid table existence issues
    const cleanupResult = await PrismaErrorHandler.wrap(
        async () => {
            await prisma.escrow.deleteMany();
            await prisma.trade.deleteMany();
            await prisma.offer.deleteMany();
            await prisma.transaction.deleteMany();
            await prisma.wallet.deleteMany();
            await prisma.kycDocument.deleteMany();
            await prisma.bankAccount.deleteMany();
            await prisma.user.deleteMany();
            return 'Database cleaned successfully';
        },
        {
            operationName: ' TEST SETUP',
            customErrorMessage: 'Failed to clean database',
        }
    );

    if (!cleanupResult.success) {
        console.warn('⚠️ Database cleanup had issues:', cleanupResult.error);
    }
});

// Disconnect from database after all tests
afterAll(async () => {
    await prisma.$disconnect();
});
