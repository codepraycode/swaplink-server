// src/services/__tests__/offer.service.test.ts
import { OfferDto, OfferService, offerService } from '../offer.service';

import { TestUtils } from '../../test/utils';
import { ApiError } from '../../utils/error';
import prisma from '../../utils/database';

describe('OfferService', () => {
    let service: OfferService;

    beforeEach(() => {
        service = new OfferService('OfferServiceTest');
    });

    describe('getOffers', () => {
        it('should return active offers with pagination', async () => {
            const { user } = await TestUtils.createUserWithWallets();
            await TestUtils.createOffer(user.id, {
                type: 'SELL',
                currency: 'USD',
                amount: 500,
                rate: 1450,
            });

            const result = await service.getOffers({
                query: { page: '1', limit: '20', type: 'BUY', currency: 'NGN' },
                userId: user.id,
            });

            expect(result.offers).toBeInstanceOf(Array);
            expect(result.total).toBeGreaterThanOrEqual(1);
            expect(result.page).toBe('1');
            expect(result.limit).toBe('20');
        });

        it('should filter offers by type and currency', async () => {
            const { user } = await TestUtils.createUserWithWallets();
            await TestUtils.createOffer(user.id, {
                type: 'SELL',
                currency: 'USD',
                amount: 500,
                rate: 1450,
            });

            await TestUtils.createOffer(user.id, {
                type: 'BUY',
                currency: 'NGN',
                amount: 300,
                rate: 1440,
            });

            const result = await service.getOffers({
                query: { type: 'SELL', currency: 'USD' },
                userId: user.id,
            });

            expect(result.offers).toHaveLength(1);
            expect(result.offers[0].type).toBe('SELL');
            expect(result.offers[0].currency).toBe('USD');
        });

        it('should filter offers by amount range', async () => {
            const { user } = await TestUtils.createUserWithWallets();
            await TestUtils.createOffer(user.id, {
                type: 'SELL',
                currency: 'USD',
                amount: 500,
                rate: 1450,
            });

            await TestUtils.createOffer(user.id, {
                type: 'SELL',
                currency: 'USD',
                amount: 1000,
                rate: 1460,
            });

            const result = await service.getOffers({
                query: {
                    type: 'SELL',
                    currency: 'USD',
                    minAmount: '600',
                    maxAmount: '1200',
                },
                userId: user.id,
            });

            expect(result.offers).toHaveLength(1);
            expect(result.offers[0].amount).toBe(1000);
        });

        it('should order BUY offers by rate descending', async () => {
            const { user } = await TestUtils.createUserWithWallets();
            await TestUtils.createOffer(user.id, {
                type: 'BUY',
                currency: 'USD',
                amount: 100,
                rate: 1440,
            });

            await TestUtils.createOffer(user.id, {
                type: 'BUY',
                currency: 'USD',
                amount: 200,
                rate: 1450,
            });

            const result = await service.getOffers({
                query: { type: 'BUY', currency: 'USD' },
                userId: user.id,
            });

            expect(result.offers[0].rate).toBe(1450);
            expect(result.offers[1].rate).toBe(1440);
        });

        it('should order SELL offers by rate ascending', async () => {
            const { user } = await TestUtils.createUserWithWallets();
            await TestUtils.createOffer(user.id, {
                type: 'SELL',
                currency: 'USD',
                amount: 100,
                rate: 1450,
            });

            await TestUtils.createOffer(user.id, {
                type: 'SELL',
                currency: 'USD',
                amount: 200,
                rate: 1440,
            });

            const result = await service.getOffers({
                query: { type: 'SELL', currency: 'USD' },
                userId: user.id,
            });

            expect(result.offers[0].rate).toBe(1440);
            expect(result.offers[1].rate).toBe(1450);
        });

        // it('should throw ApiError when database fails', async () => {
        //     // Mock prisma to throw an error
        //     jest.spyOn(prisma.offer, 'findMany').mockRejectedValue(new Error('Database error'));

        //     await expect(
        //         service.getOffers({
        //             query: { page: '1', limit: '20', type: 'BUY', currency: 'NGN' },
        //             userId: userInfo.id
        //         })
        //     ).rejects.toThrow(ApiError);
        // });
    });

    describe('createOffer', () => {
        it('should create a SELL offer successfully with sufficient balance', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            const offerData: OfferDto = {
                type: 'SELL' as const,
                currency: 'USD' as const,
                amount: '500',
                rate: '1450',
                minAmount: '50',
                maxAmount: '500',
                paymentWindow: '30',
                terms: 'Bank transfer only',
            };

            const result = await service.createOffer(user.id, offerData);

            expect(result.offer).toHaveProperty('id');
            expect(result.offer.type).toBe('SELL');
            expect(result.offer.currency).toBe('USD');
            expect(result.offer.amount).toBe(500);
            expect(result.offer.rate).toBe(1450);
            expect(result.offer.minAmount).toBe(50);
            expect(result.offer.maxAmount).toBe(500);
            expect(result.offer.status).toBe('ACTIVE');
            expect(result.offer.userId).toBe(user.id);
        });

        it('should create a BUY offer without balance check', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            // Set zero balance
            await prisma.wallet.updateMany({
                where: { userId: user.id, currency: 'NGN' },
                data: { balance: 0 },
            });

            const offerData: OfferDto = {
                type: 'BUY' as const,
                currency: 'USD' as const,
                amount: '100',
                rate: '1440',
                paymentWindow: '30',
                terms: 'Bank transfer',
            };

            const result = await service.createOffer(user.id, offerData);

            expect(result.offer.type).toBe('BUY');
            expect(result.offer.currency).toBe('USD');
            expect(result.offer.amount).toBe(100);
        });

        it('should throw ApiError for insufficient balance on SELL offer', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            // Set insufficient balance
            await prisma.wallet.updateMany({
                where: { userId: user.id, currency: 'USD' },
                data: { balance: 100 },
            });

            const offerData: OfferDto = {
                type: 'SELL' as const,
                currency: 'USD' as const,
                amount: '500', // More than available balance
                rate: '1450',
                paymentWindow: '30',
                terms: 'Bank transfer',
            };

            await expect(service.createOffer(user.id, offerData)).rejects.toThrow(ApiError);

            await expect(service.createOffer(user.id, offerData)).rejects.toThrow(
                'Insufficient USD balance for sell offer'
            );
        });

        it('should handle optional minAmount and maxAmount', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            const offerData: OfferDto = {
                type: 'SELL' as const,
                currency: 'USD' as const,
                amount: '500',
                rate: '1450',
                paymentWindow: '30',
                terms: 'No limits',
            };

            const result = await service.createOffer(user.id, offerData);

            expect(result.offer.minAmount).toBeNull();
            expect(result.offer.maxAmount).toBeNull();
        });

        it('should set default paymentWindow if not provided', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            const offerData: OfferDto = {
                type: 'SELL' as const,
                currency: 'USD' as const,
                amount: '500',
                rate: '1450',
                terms: 'Test',
                // paymentWindow not provided
            };

            const result = await service.createOffer(user.id, offerData);

            expect(result.offer.paymentWindow).toBe(30); // Default value
        });

        it('should set expiration date 24 hours from creation', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            const offerData: OfferDto = {
                type: 'SELL' as const,
                currency: 'USD' as const,
                amount: '500',
                rate: '1450',
                paymentWindow: '30',
                terms: 'Test',
            };

            const result = await service.createOffer(user.id, offerData);

            expect(result.offer.expiresAt).toBeInstanceOf(Date);

            const now = new Date();
            const expiresAt = new Date(result.offer.expiresAt!);
            const timeDiff = expiresAt.getTime() - now.getTime();

            expect(timeDiff).toBeGreaterThan(23 * 60 * 60 * 1000); // More than 23 hours
            expect(timeDiff).toBeLessThan(25 * 60 * 60 * 1000); // Less than 25 hours
        });

        it('should throw ApiError when wallet fetch fails', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            // Mock prisma to throw an error
            jest.spyOn(prisma.wallet, 'findFirst').mockRejectedValue(new Error('Database error'));

            const offerData: OfferDto = {
                type: 'SELL' as const,
                currency: 'USD' as const,
                amount: '500',
                rate: '1450',
                paymentWindow: '30',
                terms: 'Test',
            };

            await expect(service.createOffer(user.id, offerData)).rejects.toThrow(ApiError);
        });

        it('should throw ApiError when offer creation fails', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            // Mock prisma to throw an error after wallet check
            jest.spyOn(prisma.offer, 'create').mockRejectedValue(new Error('Database error'));

            const offerData: OfferDto = {
                type: 'SELL' as const,
                currency: 'USD' as const,
                amount: '500',
                rate: '1450',
                paymentWindow: '30',
                terms: 'Test',
            };

            await expect(service.createOffer(user.id, offerData)).rejects.toThrow(ApiError);
        });
    });

    describe('exported offerService instance', () => {
        it('should use the correct context name', () => {
            expect(offerService['context']).toBe('OfferService');
        });

        it('should have getOffers method', () => {
            expect(typeof offerService.getOffers).toBe('function');
        });

        it('should have createOffer method', () => {
            expect(typeof offerService.createOffer).toBe('function');
        });
    });
});
