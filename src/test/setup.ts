import prisma from '../utils/database';

// Global test timeout
jest.setTimeout(30000);

// Clean database before each test
beforeEach(async () => {
    // Clean up all data
    const tablenames = await prisma.$queryRaw<
        Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    for (const { tablename } of tablenames) {
        if (tablename !== '_prisma_migrations') {
            try {
                await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
            } catch (error) {
                console.log({ error });
            }
        }
    }
});

// Disconnect from database after all tests
afterAll(async () => {
    await prisma.$disconnect();
});
