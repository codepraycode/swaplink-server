import request from 'supertest';
import app from '../../../../api/app';
import { prisma, UserRole } from '../../../database';
import { JwtUtils } from '../../utils/jwt-utils';
import bcrypt from 'bcrypt';

describe('Wallet Module Integration Tests', () => {
    let senderToken: string;
    let receiverToken: string;
    let senderId: string;
    let receiverId: string;

    beforeAll(async () => {
        // Clean DB
        await prisma.transaction.deleteMany();
        await prisma.wallet.deleteMany();
        await prisma.user.deleteMany();

        // Create Sender
        const sender = await prisma.user.create({
            data: {
                email: 'sender@test.com',
                phone: '08011111111',
                password: 'password',
                firstName: 'Sender',
                lastName: 'User',
                transactionPin: await bcrypt.hash('1234', 10),
                wallet: {
                    create: {
                        balance: 50000,
                    },
                },
            },
            include: { wallet: true },
        });
        senderId = sender.id;
        senderToken = JwtUtils.signAccessToken({
            userId: sender.id,
            email: sender.email,
            role: UserRole.USER,
        });

        // Create Receiver (Internal)
        const receiver = await prisma.user.create({
            data: {
                email: 'receiver@test.com',
                phone: '08022222222',
                password: 'password',
                firstName: 'Receiver',
                lastName: 'User',
                wallet: {
                    create: {
                        balance: 0,
                        virtualAccount: {
                            create: {
                                accountNumber: '2222222222',
                                accountName: 'Receiver User',
                            },
                        },
                    },
                },
            },
            include: { wallet: true },
        });
        receiverId = receiver.id;
        receiverToken = JwtUtils.signAccessToken({
            userId: receiver.id,
            email: receiver.email,
            role: UserRole.USER,
        });
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe('POST /api/v1/wallet/name-enquiry', () => {
        it('should resolve internal account', async () => {
            const res = await request(app)
                .post('/api/v1/wallet/name-enquiry')
                .set('Authorization', `Bearer ${senderToken}`)
                .send({
                    accountNumber: '2222222222',
                    bankCode: '058', // Assuming 058 or whatever logic
                });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                accountName: 'Receiver User',
                bankName: 'SwapLink (Globus)',
                isInternal: true,
            });
        });

        it('should resolve external account (mocked)', async () => {
            const res = await request(app)
                .post('/api/v1/wallet/name-enquiry')
                .set('Authorization', `Bearer ${senderToken}`)
                .send({
                    accountNumber: '1234567890',
                    bankCode: '057',
                });

            expect(res.status).toBe(200);
            expect(res.body.isInternal).toBe(false);
            expect(res.body.accountName).toBe('MOCKED EXTERNAL USER');
        });
    });

    describe('POST /api/v1/wallet/process', () => {
        it('should process internal transfer successfully', async () => {
            const res = await request(app)
                .post('/api/v1/wallet/process')
                .set('Authorization', `Bearer ${senderToken}`)
                .send({
                    amount: 5000,
                    accountNumber: '2222222222',
                    bankCode: '058',
                    accountName: 'Receiver User',
                    pin: '1234',
                    idempotencyKey: 'uuid-1',
                    saveBeneficiary: true,
                });

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('COMPLETED');
            expect(res.body.message).toBe('Transfer successful');

            // Verify Balances
            const updatedSender = await prisma.wallet.findUnique({ where: { userId: senderId } });
            const updatedReceiver = await prisma.wallet.findUnique({
                where: { userId: receiverId },
            });

            expect(updatedSender?.balance).toBe(45000);
            expect(updatedReceiver?.balance).toBe(5000);

            // Verify Beneficiary Saved
            const beneficiary = await prisma.beneficiary.findFirst({ where: { userId: senderId } });
            expect(beneficiary).toBeTruthy();
            expect(beneficiary?.accountNumber).toBe('2222222222');
        });

        it('should fail with incorrect PIN', async () => {
            const res = await request(app)
                .post('/api/v1/wallet/process')
                .set('Authorization', `Bearer ${senderToken}`)
                .send({
                    amount: 1000,
                    accountNumber: '2222222222',
                    bankCode: '058',
                    accountName: 'Receiver User',
                    pin: '0000',
                    idempotencyKey: 'uuid-2',
                });

            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Invalid Transaction PIN');
        });

        it('should fail with insufficient funds', async () => {
            const res = await request(app)
                .post('/api/v1/wallet/process')
                .set('Authorization', `Bearer ${senderToken}`)
                .send({
                    amount: 1000000,
                    accountNumber: '2222222222',
                    bankCode: '058',
                    accountName: 'Receiver User',
                    pin: '1234',
                    idempotencyKey: 'uuid-3',
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Insufficient funds');
        });

        it('should be idempotent', async () => {
            // Re-send the first successful request
            const res = await request(app)
                .post('/api/v1/wallet/process')
                .set('Authorization', `Bearer ${senderToken}`)
                .send({
                    amount: 5000,
                    accountNumber: '2222222222',
                    bankCode: '058',
                    accountName: 'Receiver User',
                    pin: '1234',
                    idempotencyKey: 'uuid-1', // Same key
                });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Transaction already processed');

            // Balance should NOT change again
            const updatedSender = await prisma.wallet.findUnique({ where: { userId: senderId } });
            expect(updatedSender?.balance).toBe(45000);
        });
    });

    describe('GET /api/v1/wallet/beneficiaries', () => {
        it('should return saved beneficiaries', async () => {
            const res = await request(app)
                .get('/api/v1/wallet/beneficiaries')
                .set('Authorization', `Bearer ${senderToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0].accountNumber).toBe('2222222222');
        });
    });
});
