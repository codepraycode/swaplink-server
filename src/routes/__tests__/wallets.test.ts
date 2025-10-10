// src/routes/__tests__/wallets.test.ts
import request from 'supertest';
import app from '../../server';
import { TestUtils } from '../../test/utils';
import prisma from '../../utils/database';

describe('Wallet Routes', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
        // Create a test user and get auth token
        const { user } = await TestUtils.createUserWithWallets();
        userId = user.id;
        authToken = TestUtils.generateAuthToken(user.id);
    });

    describe('GET /api/v1/wallets', () => {
        it('should return user wallets with valid token', async () => {
            const response = await request(app)
                .get('/api/v1/wallets')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.wallets).toHaveLength(2);

            const usdWallet = response.body.data.wallets.find((w: any) => w.currency === 'USD');
            const ngnWallet = response.body.data.wallets.find((w: any) => w.currency === 'NGN');

            expect(usdWallet).toBeTruthy();
            expect(ngnWallet).toBeTruthy();
            expect(usdWallet).toHaveProperty('availableBalance');
            expect(ngnWallet).toHaveProperty('availableBalance');
        });

        it('should return 401 without token', async () => {
            const response = await request(app).get('/api/v1/wallets').expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Access denied');
        });

        it('should return 401 with invalid token', async () => {
            const response = await request(app)
                .get('/api/v1/wallets')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/v1/wallets/transactions', () => {
        it('should return user transactions with valid token', async () => {
            // Create a test transaction
            const wallet = await prisma.wallet.findFirst({
                where: { userId, currency: 'USD' },
            });

            await prisma.transaction.create({
                data: {
                    userId,
                    walletId: wallet!.id,
                    type: 'DEPOSIT',
                    currency: 'USD',
                    amount: 100,
                    balanceBefore: 0,
                    balanceAfter: 100,
                    status: 'COMPLETED',
                    reference: 'TEST-REF-123',
                },
            });

            const response = await request(app)
                .get('/api/v1/wallets/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.transactions).toHaveLength(1);
            expect(response.body.data.transactions[0].type).toBe('DEPOSIT');
            expect(response.body.data.transactions[0].amount).toBe(100);
            expect(response.body.data.pagination).toBeTruthy();
        });

        it('should filter transactions by currency', async () => {
            const response = await request(app)
                .get('/api/v1/wallets/transactions?currency=USD')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should paginate transactions correctly', async () => {
            const response = await request(app)
                .get('/api/v1/wallets/transactions?page=1&limit=10')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.pagination.page).toBe(1);
            expect(response.body.data.pagination.limit).toBe(10);
        });
    });

    describe('GET /api/v1/wallets/:currency/balance', () => {
        it('should return specific wallet balance', async () => {
            const response = await request(app)
                .get('/api/v1/wallets/USD/balance')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.currency).toBe('USD');
            expect(response.body.data).toHaveProperty('balance');
            expect(response.body.data).toHaveProperty('lockedBalance');
            expect(response.body.data).toHaveProperty('availableBalance');
        });

        it('should return 404 for non-existent wallet currency', async () => {
            const response = await request(app)
                .get('/api/v1/wallets/EUR/balance')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Wallet not found');
        });
    });
});
