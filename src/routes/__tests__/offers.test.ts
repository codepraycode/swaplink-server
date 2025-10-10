// src/routes/__tests__/offers.test.ts
import request from 'supertest';
import app from '../../server';
import { TestUtils } from '../../test/utils';

describe('Offer Routes', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
        const { user } = await TestUtils.createUserWithWallets();
        userId = user.id;
        authToken = TestUtils.generateAuthToken(user.id);
    });

    describe('GET /api/v1/offers', () => {
        it('should return offers with pagination', async () => {
            const { user: seller } = await TestUtils.createUserWithWallets();
            await TestUtils.createOffer(seller.id, {
                type: 'SELL',
                currency: 'USD',
                amount: 500,
                rate: 1450,
            });

            const response = await request(app).get('/api/v1/offers').expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.offers).toBeInstanceOf(Array);
            expect(response.body.data.pagination).toEqual({
                page: 1,
                limit: 20,
                total: expect.any(Number),
                totalPages: expect.any(Number),
            });
        });

        it('should filter offers by query parameters', async () => {
            const { user: seller } = await TestUtils.createUserWithWallets();
            await TestUtils.createOffer(seller.id, {
                type: 'SELL',
                currency: 'USD',
                amount: 500,
                rate: 1450,
            });

            const response = await request(app)
                .get('/api/v1/offers?type=SELL&currency=USD&minAmount=100&maxAmount=1000')
                .expect(200);

            expect(response.body.success).toBe(true);

            if (response.body.data.offers.length > 0) {
                const offer = response.body.data.offers[0];
                expect(offer.type).toBe('SELL');
                expect(offer.currency).toBe('USD');
                expect(offer.amount).toBeGreaterThanOrEqual(100);
                expect(offer.amount).toBeLessThanOrEqual(1000);
            }
        });

        it('should handle pagination parameters', async () => {
            const response = await request(app).get('/api/v1/offers?page=2&limit=5').expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.pagination.page).toBe(2);
            expect(response.body.data.pagination.limit).toBe(5);
        });

        it('should return empty array when no offers match filters', async () => {
            const response = await request(app)
                .get('/api/v1/offers?type=SELL&currency=USD&minAmount=10000')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.offers).toEqual([]);
        });
    });

    describe('POST /api/v1/offers', () => {
        it('should create a new offer with valid data', async () => {
            const offerData = {
                type: 'SELL',
                currency: 'USD',
                amount: '500',
                rate: '1450.50',
                minAmount: '50',
                maxAmount: '500',
                paymentWindow: '30',
                terms: 'Bank transfer only',
            };

            const response = await request(app)
                .post('/api/v1/offers')
                .set('Authorization', `Bearer ${authToken}`)
                .send(offerData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.offer).toMatchObject({
                type: 'SELL',
                currency: 'USD',
                amount: 500,
                rate: 1450.5,
                minAmount: 50,
                maxAmount: 500,
                paymentWindow: 30,
                status: 'ACTIVE',
                user: {
                    id: userId,
                    firstName: expect.any(String),
                    lastName: expect.any(String),
                    kycLevel: expect.any(String),
                },
            });
        });

        it('should create BUY offer without balance check', async () => {
            const offerData = {
                type: 'BUY',
                currency: 'USD',
                amount: '100',
                rate: '1440.75',
                paymentWindow: '45',
                terms: 'Quick transfer',
            };

            const response = await request(app)
                .post('/api/v1/offers')
                .set('Authorization', `Bearer ${authToken}`)
                .send(offerData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.offer.type).toBe('BUY');
            expect(response.body.data.offer.currency).toBe('USD');
        });

        it('should return 401 without authentication token', async () => {
            const offerData = {
                type: 'SELL',
                currency: 'USD',
                amount: '500',
                rate: '1450',
                paymentWindow: '30',
                terms: 'Test',
            };

            const response = await request(app).post('/api/v1/offers').send(offerData).expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Access denied');
        });

        it('should return 400 for insufficient balance on SELL offer', async () => {
            // Create user with low balance
            const { user: lowBalanceUser } = await TestUtils.createUserWithWallets({
                email: 'lowbalance@test.com',
            });

            // Update to have insufficient balance
            await TestUtils.updateWalletBalance(lowBalanceUser.id, 'USD', 100);

            const lowBalanceToken = TestUtils.generateAuthToken(lowBalanceUser.id);

            const offerData = {
                type: 'SELL',
                currency: 'USD',
                amount: '500', // More than available balance
                rate: '1450',
                paymentWindow: '30',
                terms: 'Test',
            };

            const response = await request(app)
                .post('/api/v1/offers')
                .set('Authorization', `Bearer ${lowBalanceToken}`)
                .send(offerData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Insufficient USD balance');
        });

        it('should return 400 for invalid offer data', async () => {
            const invalidOfferData = {
                type: 'INVALID_TYPE',
                currency: 'USD',
                amount: '-100', // Invalid negative amount
                rate: '0', // Invalid rate
                paymentWindow: 'invalid', // Invalid payment window
            };

            const response = await request(app)
                .post('/api/v1/offers')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidOfferData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should return 400 for missing required fields', async () => {
            const incompleteOfferData = {
                type: 'SELL',
                currency: 'USD',
                // Missing amount, rate, etc.
            };

            const response = await request(app)
                .post('/api/v1/offers')
                .set('Authorization', `Bearer ${authToken}`)
                .send(incompleteOfferData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should handle optional minAmount and maxAmount', async () => {
            const offerData = {
                type: 'SELL',
                currency: 'USD',
                amount: '500',
                rate: '1450',
                paymentWindow: '30',
                terms: 'No limits',
                // minAmount and maxAmount not provided
            };

            const response = await request(app)
                .post('/api/v1/offers')
                .set('Authorization', `Bearer ${authToken}`)
                .send(offerData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.offer.minAmount).toBeNull();
            expect(response.body.data.offer.maxAmount).toBeNull();
        });

        it('should use default paymentWindow when not provided', async () => {
            const offerData = {
                type: 'SELL',
                currency: 'USD',
                amount: '500',
                rate: '1450',
                terms: 'Test',
                // paymentWindow not provided
            };

            const response = await request(app)
                .post('/api/v1/offers')
                .set('Authorization', `Bearer ${authToken}`)
                .send(offerData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.offer.paymentWindow).toBe(30); // Default value
        });
    });

    describe('Error handling', () => {
        it('should return 500 for internal server errors', async () => {
            // This test would require mocking the service to throw an unexpected error
            // For now, we test with invalid data that causes processing errors

            const response = await request(app)
                .get('/api/v1/offers?page=invalid&limit=invalid')
                .expect(500);

            expect(response.body.success).toBe(false);
        });
    });
});
