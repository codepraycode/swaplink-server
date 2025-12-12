import prisma from '../lib/utils/database';

// Global test timeout
jest.setTimeout(30000);

// Verify we're using test database
beforeAll(async () => {
    console.log(`🧪 Test Environment: ${process.env.NODE_ENV}`);

    try {
        const result = await prisma.$queryRaw<
            Array<{ current_database: string }>
        >`SELECT current_database()`;
        const dbName = result?.[0]?.current_database;
        console.log(`🔍 Connected to database: ${dbName}`);

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
        console.log('✅ Database cleaned successfully');
    } catch (error) {
        console.warn('⚠️ Database cleanup had issues:', error);
    }

    await prisma.$disconnect();
});
