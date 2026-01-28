import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../../shared/database';
import { envConfig } from '../../../../shared/config/env.config';
import crypto from 'crypto';
import { redisConnection } from '../../../../shared/config/redis.config';

describe('Webhook Integration', () => {
    let userId: string;
    let walletId: string;
    let accountNumber: string;

    beforeAll(async () => {
        // Clean DB
        await prisma.transaction.deleteMany();
        await prisma.virtualAccount.deleteMany();
        await prisma.wallet.deleteMany();
        await prisma.user.deleteMany();

        // Create User & Wallet
        const user = await prisma.user.create({
            data: {
                email: 'webhook-test@example.com',
                password: 'password123',
                firstName: 'Webhook',
                lastName: 'Test',
                phone: '+2348000000002',
            },
        });
        userId = user.id;

        const wallet = await prisma.wallet.create({
            data: {
                userId: user.id,
                balance: 0,
            },
        });
        walletId = wallet.id;

        // Create Virtual Account
        accountNumber = '9999999999';
        await prisma.virtualAccount.create({
            data: {
                walletId: wallet.id,
                accountNumber,
                accountName: 'Webhook Test User',
                bankName: 'Globus Bank',
                provider: 'GLOBUS',
            },
        });
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await redisConnection.quit();
    });

    it('should fund wallet on valid credit notification', async () => {
        const payload = {
            type: 'credit_notification',
            data: {
                accountNumber,
                amount: 5000,
                reference: 'ref_' + Date.now(),
            },
        };

        // Generate Signature
        const signature = crypto
            .createHmac('sha256', envConfig.GLOBUS_WEBHOOK_SECRET || '')
            .update(JSON.stringify(payload))
            .digest('hex');

        const res = await request(app)
            .post('/api/v1/webhooks/globus')
            .set('x-globus-signature', signature)
            .send(payload);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Webhook received');

        // Verify Wallet Balance
        const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
        expect(Number(wallet?.balance)).toBe(5000);

        // Verify Transaction Record
        const tx = await prisma.transaction.findFirst({
            where: { walletId },
        });
        expect(tx).toBeTruthy();
        expect(tx?.type).toBe('DEPOSIT');
        expect(Number(tx?.amount)).toBe(5000);
    });

    it('should reject request with invalid signature', async () => {
        const payload = { foo: 'bar' };
        const res = await request(app)
            .post('/api/v1/webhooks/globus')
            .set('x-globus-signature', 'invalid_signature')
            .send(payload);

        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Invalid signature');
    });
});
