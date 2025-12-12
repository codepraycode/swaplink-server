// src/test/utils.ts
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/utils/database';

export class TestUtils {
    static generateUserData(overrides = {}) {
        return {
            email: faker.internet.email().toLowerCase(),
            phone: faker.phone.number('+234##########'),
            password: 'Password123!',
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            ...overrides,
        };
    }

    static async updateWalletBalance(userId: string, newBalance: number) {
        await prisma.wallet.updateMany({
            where: { userId },
            data: {
                balance: newBalance,
                lockedBalance: 0,
            },
        });
    }

    static async createUser(userData?: any) {
        const data = this.generateUserData(userData);
        const hashedPassword = await bcrypt.hash(data.password, 12);

        const user = await prisma.user.create({
            data: {
                ...data,
                password: hashedPassword,
            },
            select: {
                id: true,
                email: true,
                phone: true,
                firstName: true,
                lastName: true,
                kycLevel: true,
                isVerified: true,
                createdAt: true,
            },
        });

        return user;
    }

    static async createUserWithWallets(userData?: any) {
        const user = await this.createUser(userData);

        // Create wallet for user (single NGN wallet)
        const wallet = await prisma.wallet.create({
            data: {
                userId: user.id,
                balance: 100000, // 100,000 NGN
                lockedBalance: 0,
            },
        });

        return { user, wallets: [wallet] };
    }

    static generateAuthToken(userId: string) {
        return jwt.sign({ userId, email: 'test@example.com' }, process.env.JWT_SECRET!, {
            expiresIn: '1h',
        });
    }

    static async cleanup() {
        const tablenames = await prisma.$queryRaw<
            Array<{ tablename: string }>
        >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

        for (const { tablename } of tablenames || []) {
            if (tablename !== '_prisma_migrations') {
                await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
            }
        }
    }
}
