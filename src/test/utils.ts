// src/test/utils.ts
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/utils/database';
import { PrismaErrorHandler } from '../lib/utils/api-error';
import { Currency } from '../database/generated/prisma';

const operationName = 'TEST UTIL';

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

    static async updateWalletBalance(userId: string, currency: Currency, newBalance: number) {
        const {} = await PrismaErrorHandler.wrap(
            () =>
                prisma.wallet.updateMany({
                    where: {
                        userId,
                        currency,
                    },
                    data: {
                        balance: newBalance,
                        lockedBalance: 0,
                    },
                }),
            {
                operationName,
            }
        );
    }

    static generateOfferData(overrides = {}) {
        return {
            type: 'SELL' as const,
            currency: 'USD' as const,
            amount: faker.datatype.float({ min: 50, max: 1000, precision: 0.01 }),
            rate: faker.datatype.float({ min: 1400, max: 1500, precision: 0.01 }),
            minAmount: faker.datatype.float({ min: 10, max: 50, precision: 0.01 }),
            maxAmount: faker.datatype.float({ min: 500, max: 1000, precision: 0.01 }),
            paymentWindow: 30,
            terms: 'Bank transfer only',
            ...overrides,
        };
    }

    static async createUser(userData?: any) {
        const data = this.generateUserData(userData);
        const hashedPassword = await bcrypt.hash(data.password, 12);

        const { data: user } = await PrismaErrorHandler.wrap(
            () =>
                prisma.user.create({
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
                }),
            {
                operationName,
            }
        );

        return user!;
    }

    static async createUserWithWallets(userData?: any) {
        const user = await this.createUser(userData);

        // Create wallets for user
        await PrismaErrorHandler.wrap(
            () =>
                prisma.wallet.createMany({
                    data: [
                        { userId: user.id, currency: 'USD', balance: 1000 },
                        { userId: user.id, currency: 'NGN', balance: 500000 },
                    ],
                }),
            {
                operationName: 'TEST UTIL',
            }
        );

        const { data: wallets } = await PrismaErrorHandler.wrap(
            () =>
                prisma.wallet.findMany({
                    where: { userId: user.id },
                }),
            {
                operationName: 'TEST UTIL',
            }
        );

        return { user, wallets: wallets! };
    }

    static async createOffer(userId: string, offerData?: any) {
        const data = this.generateOfferData(offerData);

        const { data: offer } = await PrismaErrorHandler.wrap(
            () =>
                prisma.offer.create({
                    data: {
                        ...data,
                        userId,
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                kycLevel: true,
                            },
                        },
                    },
                }),
            {
                operationName,
            }
        );

        return offer!;
    }

    static generateAuthToken(userId: string) {
        return jwt.sign({ userId, email: 'test@example.com' }, process.env.JWT_SECRET!, {
            expiresIn: '1h',
        });
    }

    static async cleanup() {
        const { data: tablenames } = await PrismaErrorHandler.wrap(
            () =>
                prisma.$queryRaw<
                    Array<{ tablename: string }>
                >`SELECT tablename FROM pg_tables WHERE schemaname='public'`
        );

        for (const { tablename } of tablenames || []) {
            if (tablename !== '_prisma_migrations') {
                await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
            }
        }
    }
}
