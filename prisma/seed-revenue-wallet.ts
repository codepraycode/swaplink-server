import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const systemEmail = 'revenue@swaplink.com';
    const systemPhone = '+2340000000000';

    console.log('🌱 Seeding System Revenue Wallet...');

    // 1. Check if System User exists
    let systemUser = await prisma.user.findUnique({
        where: { email: systemEmail },
    });

    if (!systemUser) {
        console.log('Creating System User...');
        const hashedPassword = await hash('SystemRevenue@123', 10);

        systemUser = await prisma.user.create({
            data: {
                email: systemEmail,
                phone: systemPhone,
                password: hashedPassword,
                firstName: 'System',
                lastName: 'Revenue',
                role: UserRole.SUPER_ADMIN,
                isVerified: true,
                emailVerified: true,
                phoneVerified: true,
                kycLevel: 'FULL',
                kycStatus: 'APPROVED',
            },
        });
        console.log(`✅ System User created: ${systemUser.id}`);
    } else {
        console.log(`ℹ️ System User already exists: ${systemUser.id}`);
    }

    // 2. Check if Wallet exists
    const wallet = await prisma.wallet.findUnique({
        where: { userId: systemUser.id },
    });

    if (!wallet) {
        console.log('Creating System Wallet...');
        await prisma.wallet.create({
            data: {
                userId: systemUser.id,
                balance: 0,
                lockedBalance: 0,
            },
        });
        console.log('✅ System Wallet created.');
    } else {
        console.log('ℹ️ System Wallet already exists.');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
