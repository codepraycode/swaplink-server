import { prisma, OrderStatus, AdType, TransactionType, NotificationType } from '../shared/database';
import { serviceRevenueService } from '../api/modules/revenue/service-revenue.service';
import logger from '../shared/lib/utils/logger';

const fixStuckOrder = async (orderId: string) => {
    console.log(`Fixing stuck order ${orderId}...`);

    const order = await prisma.p2POrder.findUnique({
        where: { id: orderId },
        include: { ad: true },
    });

    if (!order) {
        console.error('Order not found');
        return;
    }

    console.log(`Order status: ${order.status}`);

    // Check if funds already moved
    const existingTx = await prisma.transaction.findFirst({
        where: { reference: `P2P-DEBIT-${orderId}` },
    });

    if (existingTx) {
        console.log('Funds already released (Transaction exists).');
        return;
    }

    console.log('Funds NOT released. Processing manual release...');

    try {
        await prisma.$transaction(async tx => {
            // 1. Identify NGN Payer and Receiver
            const isBuyFx = order.ad.type === AdType.BUY_FX;
            const payerId = isBuyFx ? order.makerId : order.takerId;
            const receiverId = isBuyFx ? order.takerId : order.makerId;

            console.log(`Payer: ${payerId}, Receiver: ${receiverId}`);

            // 2. Get Revenue Wallet
            const revenueWallet = await serviceRevenueService.getRevenueWallet();

            // 3. Debit Payer (From Locked Balance)
            await tx.wallet.update({
                where: { userId: payerId },
                data: {
                    lockedBalance: { decrement: order.totalNgn },
                },
            });
            console.log(`Debited payer locked balance: ${order.totalNgn}`);

            // 4. Credit Receiver (Total - Fee)
            await tx.wallet.update({
                where: { userId: receiverId },
                data: {
                    balance: { increment: Number(order.receiveAmount) },
                },
            });
            console.log(`Credited receiver balance: ${order.receiveAmount}`);

            // Update User Cumulative Inflow
            await tx.user.update({
                where: { id: receiverId },
                data: {
                    cumulativeInflow: { increment: Number(order.receiveAmount) },
                },
            });

            // 5. Credit Revenue (Fee)
            await tx.wallet.update({
                where: { id: revenueWallet.id },
                data: {
                    balance: { increment: order.fee },
                },
            });

            // 6. Create Transaction Records
            // Fetch wallets with current balances
            const payerWallet = await tx.wallet.findUniqueOrThrow({
                where: { userId: payerId },
            });
            const receiverWallet = await tx.wallet.findUniqueOrThrow({
                where: { userId: receiverId },
            });

            // Calculate balances (after the updates above)
            const payerBalanceBefore =
                Number(payerWallet.balance) + Number(payerWallet.lockedBalance);
            const payerBalanceAfter = Number(payerWallet.balance);
            const receiverBalanceBefore =
                Number(receiverWallet.balance) - Number(order.receiveAmount);
            const receiverBalanceAfter = Number(receiverWallet.balance);

            // Payer Debit Transaction
            await tx.transaction.create({
                data: {
                    userId: payerId,
                    walletId: payerWallet.id,
                    type: TransactionType.TRANSFER,
                    amount: -order.totalNgn,
                    balanceBefore: payerBalanceBefore,
                    balanceAfter: payerBalanceAfter,
                    status: 'COMPLETED',
                    reference: `P2P-DEBIT-${order.id}`,
                    description: `P2P ${isBuyFx ? 'Purchase' : 'Sale'}: ${order.amount} ${
                        order.ad.currency
                    } @ ₦${order.price}/${order.ad.currency}`,
                    metadata: {
                        orderId: order.id,
                        type: isBuyFx ? 'BUY_FX' : 'SELL_FX',
                        currency: order.ad.currency,
                        fxAmount: order.amount,
                        rate: order.price,
                        fee: order.fee,
                        counterpartyId: receiverId,
                    },
                },
            });

            // Receiver Credit Transaction
            await tx.transaction.create({
                data: {
                    userId: receiverId,
                    walletId: receiverWallet.id,
                    type: TransactionType.DEPOSIT,
                    amount: Number(order.receiveAmount),
                    balanceBefore: receiverBalanceBefore,
                    balanceAfter: receiverBalanceAfter,
                    status: 'COMPLETED',
                    reference: `P2P-CREDIT-${order.id}`,
                    description: `P2P ${isBuyFx ? 'Sale' : 'Purchase'}: ${order.amount} ${
                        order.ad.currency
                    } @ ₦${order.price}/${order.ad.currency} (Fee: ₦${order.fee})`,
                    metadata: {
                        orderId: order.id,
                        type: isBuyFx ? 'SELL_FX' : 'BUY_FX',
                        currency: order.ad.currency,
                        fxAmount: order.amount,
                        rate: order.price,
                        grossAmount: order.totalNgn,
                        fee: order.fee,
                        netAmount: Number(order.receiveAmount),
                        counterpartyId: payerId,
                    },
                },
            });

            // Fee Credit (Revenue)
            await tx.transaction.create({
                data: {
                    userId: revenueWallet.userId,
                    walletId: revenueWallet.id,
                    type: TransactionType.FEE,
                    amount: order.fee,
                    balanceBefore: 0,
                    balanceAfter: 0,
                    status: 'COMPLETED',
                    reference: `P2P-FEE-${order.id}`,
                    description: `P2P Transaction Fee: Order #${order.id.slice(0, 8)}`,
                    metadata: {
                        orderId: order.id,
                        currency: order.ad.currency,
                        fxAmount: order.amount,
                    },
                },
            });

            // Ensure order is COMPLETED
            await tx.p2POrder.update({
                where: { id: orderId },
                data: { status: OrderStatus.COMPLETED, completedAt: new Date() },
            });
        });

        console.log('✅ Order fixed successfully!');
    } catch (error) {
        console.error('Error fixing order:', error);
    }
};

// Run
fixStuckOrder('8e05edc7-1665-42a7-b5a9-c181c1d572e9')
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
