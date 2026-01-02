import { P2PAdService } from '../api/modules/p2p/ad/p2p-ad.service';
import { P2POrderService } from '../api/modules/p2p/order/p2p-order.service';
import { walletService } from '../shared/lib/services/wallet.service';
import { prisma, AdType, AdStatus, OrderStatus } from '../shared/database';
import { P2PPaymentMethodService } from '../api/modules/p2p/payment-method/p2p-payment-method.service';
import { BadRequestError } from '../shared/lib/utils/api-error';

// Mock Redis before other imports that might use it
jest.mock('../shared/config/redis.config', () => ({
    redisConnection: {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        publish: jest.fn().mockResolvedValue(1),
    },
}));

// Mock Queue
jest.mock('../shared/lib/queues/p2p-order.queue', () => ({
    getQueue: jest.fn().mockReturnValue({
        add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    }),
}));

describe('P2P Ad Cancellation Tests', () => {
    let maker: any;
    let taker: any;
    let paymentMethod: any;

    beforeAll(async () => {
        // Create Users
        maker = await prisma.user.create({
            data: {
                email: 'maker_cancel@test.com',
                firstName: 'Maker',
                lastName: 'User',
                password: 'hash',
                phone: '111222',
            },
        });
        taker = await prisma.user.create({
            data: {
                email: 'taker_cancel@test.com',
                firstName: 'Taker',
                lastName: 'User',
                password: 'hash',
                phone: '222333',
            },
        });

        // Setup Wallets
        await walletService.setUpWallet(maker.id, prisma);
        await walletService.setUpWallet(taker.id, prisma);

        // Fund Maker (1,000,000 NGN)
        await walletService.creditWallet(maker.id, 1000000);

        // Create Payment Method for Maker (Required for BUY_FX)
        paymentMethod = await P2PPaymentMethodService.createPaymentMethod(maker.id, {
            currency: 'USD',
            bankName: 'Test Bank',
            accountNumber: '1234567890',
            accountName: 'Maker User',
            details: { routingNumber: '123' },
        });
    });

    afterAll(async () => {
        await prisma.p2PChat.deleteMany();
        await prisma.p2POrder.deleteMany();
        await prisma.p2PAd.deleteMany();
        await prisma.p2PPaymentMethod.deleteMany();
        await prisma.transaction.deleteMany();
        await prisma.wallet.deleteMany();
        await prisma.user.deleteMany();
        await prisma.$disconnect();
    });

    it('should prevent closing ad with active orders', async () => {
        // 1. Create Ad (Buy 100 USD @ 1000 NGN). Total NGN Locked: 100,000.
        const ad = await P2PAdService.createAd(maker.id, {
            type: AdType.BUY_FX,
            currency: 'USD',
            totalAmount: 100,
            price: 1000,
            minLimit: 10,
            maxLimit: 100,
            paymentMethodId: paymentMethod.id,
            terms: 'Test terms',
        });

        // 2. Create Order (50 USD)
        const order = await P2POrderService.createOrder(taker.id, {
            adId: ad.id,
            amount: 50,
            paymentMethodId: null,
        });

        // 3. Try to Close Ad -> Should Fail
        await expect(P2PAdService.closeAd(maker.id, ad.id)).rejects.toThrow(
            'Cannot close ad with active orders'
        );

        // 4. Cancel Order
        await P2POrderService.cancelOrder(taker.id, order.id);

        // 5. Close Ad -> Should Succeed
        const closedAd = await P2PAdService.closeAd(maker.id, ad.id);
        expect(closedAd.status).toBe(AdStatus.CLOSED);

        // 6. Verify Refund
        // Maker started with 100,000.
        // Ad locked 100,000.
        // Order reserved 50,000.
        // Cancel Order -> 50,000 returned to Ad (remainingAmount = 100).
        // Close Ad -> 100 * 1000 = 100,000 refunded to Wallet.
        // Wallet should be 100,000.
        const makerWallet = await prisma.wallet.findUnique({ where: { userId: maker.id } });
        expect(Number(makerWallet?.balance)).toBe(1000000);
        expect(Number(makerWallet?.lockedBalance)).toBe(0);
    });

    it('should enrich ad details with orders for the owner', async () => {
        // 1. Create Ad
        const ad = await P2PAdService.createAd(maker.id, {
            type: AdType.BUY_FX,
            currency: 'USD',
            totalAmount: 100,
            price: 1000,
            minLimit: 10,
            maxLimit: 100,
            paymentMethodId: paymentMethod.id,
            terms: 'Test terms',
        });

        // 2. Create Order
        const order = await P2POrderService.createOrder(taker.id, {
            adId: ad.id,
            amount: 50,
            paymentMethodId: null,
        });

        // 3. Get Ads as Maker (Owner)
        const makerAds = await P2PAdService.getAds({}, maker.id);
        const enrichedAd = makerAds.find(a => a.id === ad.id);

        expect(enrichedAd).toBeDefined();
        expect(enrichedAd.orders).toBeDefined();
        expect(enrichedAd.orders.length).toBe(1);
        expect(enrichedAd.orders[0].id).toBe(order.id);

        // 4. Get Ads as Taker (Not Owner)
        const takerAds = await P2PAdService.getAds({}, taker.id);
        const publicAd = takerAds.find(a => a.id === ad.id);

        expect(publicAd).toBeDefined();
        expect(publicAd.orders).toBeUndefined();

        // Cleanup
        await P2POrderService.cancelOrder(taker.id, order.id);
        await P2PAdService.closeAd(maker.id, ad.id);
    });

    it('should handle refund if ad is somehow closed (safety net)', async () => {
        // This test simulates the race condition where ad is closed but order exists.
        // We have to manually force this state because the service prevents it.

        // 1. Create Ad
        const ad = await P2PAdService.createAd(maker.id, {
            type: AdType.BUY_FX,
            currency: 'USD',
            totalAmount: 50,
            price: 1000,
            minLimit: 10,
            maxLimit: 50,
            paymentMethodId: paymentMethod.id,
            terms: 'Test terms',
        });

        // 2. Create Order
        const order = await P2POrderService.createOrder(taker.id, {
            adId: ad.id,
            amount: 20,
            paymentMethodId: null,
        });

        // 3. Manually Close Ad (Bypass Service Check)
        await prisma.p2PAd.update({
            where: { id: ad.id },
            data: { status: AdStatus.CLOSED, remainingAmount: 0 }, // Simulate refund of remaining
        });
        // Note: createOrder locked 50,000 total.
        // Order took 20,000. Remaining 30,000.
        // We manually closed ad, but we didn't refund the remaining 30,000 via service.
        // So let's manually refund the remaining 30,000 to be realistic.
        await walletService.unlockFunds(maker.id, 30000);

        // Current State:
        // Maker Wallet: 100,000 - 50,000 (locked) + 30,000 (refunded) = 80,000 available.
        // Locked Balance: 50,000? No, unlockFunds decrements lockedBalance.
        // Initial: 100k. Lock 50k. Bal 100k, Locked 50k. Avail 50k.
        // Refund 30k: Locked 20k. Bal 100k? No.
        // Wait, lockFunds does NOT deduct balance. It increases lockedBalance.
        // Available = Balance - LockedBalance.
        // So: Bal 100k. Locked 50k. Avail 50k.
        // Refund 30k: Locked 20k. Bal 100k. Avail 80k.
        // The 20k is locked for the Order.

        // 4. Cancel Order
        // Should detect Ad is CLOSED and refund the 20k directly to wallet (unlock).
        await P2POrderService.cancelOrder(taker.id, order.id);

        // 5. Verify
        const makerWallet = await prisma.wallet.findUnique({ where: { userId: maker.id } });
        expect(Number(makerWallet?.balance)).toBe(1000000);
        expect(Number(makerWallet?.lockedBalance)).toBe(0);
    });
});
