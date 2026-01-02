/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
}

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

async function main() {
    console.log('Connecting to database...');
    await prisma.$connect();

    console.log('Fetching table names...');
    const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

    const tables = tablenames
        .map(({ tablename }) => tablename)
        .filter(name => name !== '_prisma_migrations')
        .map(name => `"public"."${name}"`)
        .join(', ');

    if (tables.length > 0) {
        console.log(`Truncating tables: ${tables}`);
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
        console.log('✅ All tables truncated successfully.');
    } else {
        console.log('No tables to truncate.');
    }
}

main()
    .catch(e => {
        console.error('❌ Error truncating database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
