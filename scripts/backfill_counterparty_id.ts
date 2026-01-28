import { prisma } from '../src/shared/database';
import { envConfig } from '../src/shared/config/env.config';

async function backfillCounterpartyId() {
    console.log('Starting backfill of counterpartyId...');

    const transactions = await prisma.transaction.findMany({
        where: { counterpartyId: null },
    });

    console.log(`Found ${transactions.length} transactions to backfill.`);

    // Ensure System User exists
    const systemUserId = envConfig.SYSTEM_USER_ID;
    const systemUser = await prisma.user.findUnique({ where: { id: systemUserId } });
    if (!systemUser) {
        console.log(`System user ${systemUserId} not found. Creating...`);
        await prisma.user.create({
            data: {
                id: systemUserId,
                email: 'system@swaplink.com',
                phone: '+00000000000',
                password: 'system_password_placeholder',
                firstName: 'System',
                lastName: 'User',
                role: 'ADMIN',
                isVerified: true,
                emailVerified: true,
                phoneVerified: true,
            },
        });
        console.log('System user created.');
    }

    let updatedCount = 0;

    for (const tx of transactions) {
        let counterpartyId: string | null = null;

        if (tx.type === 'TRANSFER') {
            // Debit: Counterparty is the Receiver
            if (tx.destinationAccount) {
                const virtualAccount = await prisma.virtualAccount.findUnique({
                    where: { accountNumber: tx.destinationAccount },
                    include: { wallet: true },
                });
                if (virtualAccount && virtualAccount.wallet) {
                    counterpartyId = virtualAccount.wallet.userId;
                }
            }
        } else if (tx.type === 'DEPOSIT') {
            // Credit: Counterparty is the Sender
            const metadata = tx.metadata as any;
            if (metadata && metadata.senderId) {
                counterpartyId = metadata.senderId;
            } else {
                counterpartyId = systemUserId;
            }
        } else if (tx.type === 'WITHDRAWAL') {
            counterpartyId = systemUserId;
        } else if (tx.type === 'BILL_PAYMENT') {
            counterpartyId = systemUserId;
        } else {
            counterpartyId = systemUserId;
        }

        if (counterpartyId) {
            try {
                await prisma.transaction.update({
                    where: { id: tx.id },
                    data: { counterpartyId },
                });
                updatedCount++;
            } catch (error) {
                console.error(
                    `Failed to update transaction ${tx.id} with counterpartyId ${counterpartyId}:`,
                    error
                );
            }
        }
    }

    console.log(`Backfill complete. Updated ${updatedCount} transactions.`);
}

backfillCounterpartyId()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
