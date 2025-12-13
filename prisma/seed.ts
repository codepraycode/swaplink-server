import { PrismaClient, UserRole } from '../src/shared/database';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@swaplink.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'SuperSecretAdmin123!';

    const existingAdmin = await prisma.user.findFirst({
        where: { role: UserRole.SUPER_ADMIN },
    });

    if (existingAdmin) {
        console.log('Super Admin already exists.');
        return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.create({
        data: {
            email: adminEmail,
            password: hashedPassword,
            firstName: 'Super',
            lastName: 'Admin',
            phone: '+00000000000',
            role: UserRole.SUPER_ADMIN,
            isVerified: true,
            isActive: true,
            kycLevel: 'FULL',
            kycStatus: 'APPROVED',
            wallet: {
                create: {
                    balance: 0,
                    lockedBalance: 0,
                },
            },
        },
    });

    console.log(`Super Admin created: ${admin.email}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
