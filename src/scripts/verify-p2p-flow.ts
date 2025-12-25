import { prisma, AdType } from '../shared/database';
import { p2pAdService } from '../api/modules/p2p/p2p-ad.service';
import { p2pOrderService } from '../api/modules/p2p/p2p-order.service';
import { p2pChatService } from '../api/modules/p2p/p2p-chat.service';
import logger from '../shared/lib/utils/logger';

async function verifyP2PFlow() {
    logger.info('🚀 Starting P2P Verification Flow...');

    try {
        // 1. Setup Users
        const makerEmail = `maker-${Date.now()}@test.com`;
        const takerEmail = `taker-${Date.now()}@test.com`;

        const maker = await prisma.user.create({
            data: {
                email: makerEmail,
                password: 'password',
                firstName: 'Maker',
                lastName: 'Test',
                wallet: { create: { balance: 500000, lockedBalance: 0 } }, // 500k NGN
            },
            include: { wallet: true },
        });

        const taker = await prisma.user.create({
            data: {
                email: takerEmail,
                password: 'password',
                firstName: 'Taker',
                lastName: 'Test',
                wallet: { create: { balance: 0, lockedBalance: 0 } },
            },
            include: { wallet: true },
        });

        logger.info(`✅ Users Created: Maker (${maker.id}), Taker (${taker.id})`);

        // 2. Create Payment Method
        const pm = await prisma.p2PPaymentMethod.create({
            data: {
                userId: maker.id,
                currency: 'USD',
                bankName: 'Chase',
                accountNumber: '1234567890',
                accountName: 'Maker Test',
                details: { routingNumber: '021000021' },
                isPrimary: true,
            },
        });
        logger.info(`✅ Payment Method Created: ${pm.id}`);

        // 3. Create Ad (BUY_FX)
        // Maker wants to Buy 100 USD at 1500 NGN/USD. Total NGN needed = 150,000.
        const ad = await p2pAdService.createAd(maker.id, {
            type: AdType.BUY_FX,
            currency: 'USD',
            totalAmount: 100,
            price: 1500,
            minLimit: 10,
            maxLimit: 100,
            paymentMethodId: pm.id,
        });

        logger.info(`✅ Ad Created: ${ad.id}`);

        // Verify Maker Lock
        const makerWalletAfterAd = await prisma.wallet.findUnique({ where: { userId: maker.id } });
        logger.info(
            `   Maker Locked Balance: ${makerWalletAfterAd?.lockedBalance} (Expected: 150000)`
        );

        // 4. Create Order
        // Taker sells 50 USD. Total NGN = 75,000.
        const order = await p2pOrderService.createOrder(taker.id, {
            adId: ad.id,
            amount: 50,
        });

        logger.info(`✅ Order Created: ${order.id}`);
        logger.info(`   Order Total NGN: ${order.totalNgn}`);
        logger.info(`   Order Fee: ${order.fee}`);
        logger.info(`   Receive Amount: ${order.receiveAmount}`);

        // Verify Ad Balance
        const adAfterOrder = await prisma.p2PAd.findUnique({ where: { id: ad.id } });
        logger.info(`   Ad Remaining: ${adAfterOrder?.remainingAmount} (Expected: 50)`);

        // 5. Chat
        await p2pChatService.sendMessage(taker.id, {
            orderId: order.id,
            message: 'Hello, I have sent the FX.',
        });
        logger.info('✅ Chat Message Sent');

        // 6. Mark as Paid
        await p2pOrderService.markAsPaid(taker.id, order.id, 'http://proof.url');
        logger.info('✅ Order Marked as Paid');

        // 7. Release Funds
        await p2pOrderService.releaseFunds(maker.id, order.id);
        logger.info('✅ Funds Released');

        // 8. Verify Final Balances
        const makerWalletFinal = await prisma.wallet.findUnique({ where: { userId: maker.id } });
        const takerWalletFinal = await prisma.wallet.findUnique({ where: { userId: taker.id } });

        // Maker: 500k - 150k (Locked) -> Released 75k. Remaining Locked 75k. Balance 350k.
        // Taker: 0 + (75k - Fee).
        // Fee = 1% of 75k = 750.
        // Taker gets 74250.

        logger.info(`   Maker Final Locked: ${makerWalletFinal?.lockedBalance} (Expected: 75000)`);
        logger.info(`   Taker Final Balance: ${takerWalletFinal?.balance} (Expected: 74250)`);

        logger.info('🎉 Verification Complete!');
    } catch (error) {
        logger.error('❌ Verification Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyP2PFlow();
