import prisma from '../utils/database';

// Global test timeout
jest.setTimeout(30000);

// Verify we're using test database
beforeAll(async () => {
    console.log(`🧪 Test Environment: ${process.env.NODE_ENV}`);

    const result = await prisma.$queryRaw<
        Array<{ current_database: string }>
    >`SELECT current_database()`;
    const dbName = result[0]?.current_database;
    console.log(`🔍 Connected to database: ${dbName}`);

    if (!dbName?.includes('test')) {
        throw new Error(
            `❌ Tests are running on wrong database: ${dbName}. Expected test database.`
        );
    }
});

// Clean database before each test
beforeEach(async () => {
    if (process.env.NODE_ENV !== 'test') {
        throw new Error('Tests should only run in test environment!');
    }

    // Clean up all data
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE 
    "escrow", "trades", "offers", "transactions", 
    "wallets", "kyc_documents", "bank_accounts", "users" 
    CASCADE;`);
});

// Disconnect from database after all tests
afterAll(async () => {
    await prisma.$disconnect();
});
