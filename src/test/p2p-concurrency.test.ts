import { P2PAdService } from '../api/modules/p2p/ad/p2p-ad.service';
import { P2POrderService } from '../api/modules/p2p/order/p2p-order.service';
import { walletService } from '../shared/lib/services/wallet.service';
import { prisma, AdType } from '../shared/database';
import { P2PPaymentMethodService } from '../api/modules/p2p/payment-method/p2p-payment-method.service';

describe('P2P Concurrency Tests', () => {
    let maker: any;
    let taker1: any;
    let taker2: any;
    let paymentMethod: any;

    beforeAll(async () => {
        // Create Users
        maker = await prisma.user.create({
            data: {
                email: 'maker@test.com',
                firstName: 'Maker',
                lastName: 'User',
                password: 'hash',
                phone: '111',
            },
        });
        taker1 = await prisma.user.create({
            data: {
                email: 'taker1@test.com',
                firstName: 'Taker1',
                lastName: 'User',
                password: 'hash',
                phone: '222',
            },
        });
        taker2 = await prisma.user.create({
            data: {
                email: 'taker2@test.com',
                firstName: 'Taker2',
                lastName: 'User',
                password: 'hash',
                phone: '333',
            },
        });

        // Setup Wallets
        await walletService.setUpWallet(maker.id, prisma);
        await walletService.setUpWallet(taker1.id, prisma);
        await walletService.setUpWallet(taker2.id, prisma);

        // Fund Maker (100,000 NGN)
        await walletService.creditWallet(maker.id, 100000);

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

    it('should prevent overselling via concurrent orders', async () => {
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

        expect(ad.remainingAmount).toBe(100);

        // 2. Concurrent Orders: Taker1 wants 60, Taker2 wants 60. Total 120 > 100.
        const orderPromise1 = P2POrderService.createOrder(taker1.id, {
            adId: ad.id,
            amount: 60,
            paymentMethodId: null, // Taker gives FX, Maker gives NGN. Taker doesn't need PM here? Wait, logic says Taker gives FX.
            // If BUY_FX, Maker WANTS FX. Taker GIVES FX.
            // Taker needs Maker's details (in Ad).
            // Taker does NOT need to provide PM in request (unless receiving NGN? No NGN to wallet).
            // So paymentMethodId: null is fine.
        });

        const orderPromise2 = P2POrderService.createOrder(taker2.id, {
            adId: ad.id,
            amount: 60,
            paymentMethodId: null,
        });

        // 3. Execute
        const results = await Promise.allSettled([orderPromise1, orderPromise2]);

        // 4. Verify
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failCount = results.filter(r => r.status === 'rejected').length;

        console.log('Results:', results);

        expect(successCount).toBe(1);
        expect(failCount).toBe(1);

        // 5. Check Ad Remaining Amount
        const updatedAd = await prisma.p2PAd.findUnique({ where: { id: ad.id } });
        expect(updatedAd?.remainingAmount).toBe(40); // 100 - 60
    });
});
