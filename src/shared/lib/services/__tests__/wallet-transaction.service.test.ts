import { walletService as transferService } from '../../../../api/modules/wallet/wallet.service';
import { prisma } from '../../../database';
import { nameEnquiryService } from '../../../../api/modules/wallet/name-enquiry.service';
import { BadRequestError, ForbiddenError } from '../../utils/api-error';
import { socketService } from '../socket.service';
import { walletService } from '../wallet.service';
import { redisConnection } from '../../../config/redis.config';

jest.mock('../socket.service');
jest.mock('../wallet.service');

// Mock dependencies
jest.mock('../../../database', () => ({
    prisma: {
        transaction: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        wallet: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        virtualAccount: {
            findUnique: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
        $transaction: jest.fn(callback => callback(prisma)),
    },
}));

jest.mock('../../../config/redis.config', () => ({
    redisConnection: {
        get: jest.fn(),
        del: jest.fn(),
        setex: jest.fn(),
    },
}));

jest.mock('bullmq', () => ({
    Queue: jest.fn().mockImplementation(() => ({
        add: jest.fn(),
    })),
}));

jest.mock('../../../../api/modules/wallet/name-enquiry.service');

describe('TransferService', () => {
    const mockUserId = 'user-123';
    const mockReceiverId = 'user-456';
    const mockIdempotencyKey = 'uuid-123';
    const mockPayload = {
        userId: mockUserId,
        amount: 5000,
        accountNumber: '1234567890',
        bankCode: '058',
        accountName: 'John Doe',
        idempotencyKey: mockIdempotencyKey,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('processTransfer', () => {
        it('should throw ForbiddenError if idempotency key is not found in Redis', async () => {
            (redisConnection.get as jest.Mock).mockResolvedValue(null);

            await expect(transferService.processTransfer(mockPayload)).rejects.toThrow(
                ForbiddenError
            );
            await expect(transferService.processTransfer(mockPayload)).rejects.toThrow(
                'Invalid or expired idempotency key. Please verify your PIN again.'
            );
        });

        it('should throw ForbiddenError if idempotency key belongs to different user', async () => {
            (redisConnection.get as jest.Mock).mockResolvedValue('different-user-id');

            await expect(transferService.processTransfer(mockPayload)).rejects.toThrow(
                ForbiddenError
            );
            await expect(transferService.processTransfer(mockPayload)).rejects.toThrow(
                'Idempotency key does not belong to this user.'
            );
        });

        it('should return existing transaction if idempotency key exists in database', async () => {
            (redisConnection.get as jest.Mock).mockResolvedValue(mockUserId);
            (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
                id: 'tx-123',
                status: 'COMPLETED',
            });

            const result = await transferService.processTransfer(mockPayload);

            expect(result).toEqual({
                message: 'Transaction already processed',
                transactionId: 'tx-123',
                status: 'COMPLETED',
            });
        });

        it('should process internal transfer successfully', async () => {
            (redisConnection.get as jest.Mock).mockResolvedValue(mockUserId);
            (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(null);
            (nameEnquiryService.resolveAccount as jest.Mock).mockResolvedValue({
                isInternal: true,
                accountName: 'John Doe',
            });

            // Mock Wallets
            (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({
                id: 'wallet-123',
                userId: mockUserId,
                balance: 10000,
            });
            (prisma.virtualAccount.findUnique as jest.Mock).mockResolvedValue({
                wallet: {
                    id: 'wallet-456',
                    userId: mockReceiverId,
                    balance: 5000,
                },
            });
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                firstName: 'Test',
                lastName: 'User',
            });

            // Mock Transaction Creation
            (prisma.transaction.create as jest.Mock).mockResolvedValue({ id: 'tx-new' });

            const result = await transferService.processTransfer(mockPayload);

            expect(result).toEqual({
                message: 'Transfer successful',
                transactionId: 'tx-new',
                status: 'COMPLETED',
                amount: 5000,
                recipient: 'John Doe',
            });

            expect(prisma.wallet.update).toHaveBeenCalledWith({
                where: { id: 'wallet-456' },
                data: { balance: { increment: 5000 } },
            });

            // Verify idempotency key was deleted
            expect(redisConnection.del).toHaveBeenCalledWith(`idempotency:${mockIdempotencyKey}`);

            // Verify Socket Emissions
            expect(walletService.getWalletBalance).toHaveBeenCalledWith(mockUserId);
            expect(walletService.getWalletBalance).toHaveBeenCalledWith(mockReceiverId);

            expect(socketService.emitToUser).toHaveBeenCalledWith(
                mockUserId,
                'WALLET_UPDATED',
                expect.objectContaining({
                    message: expect.stringContaining('Debit Alert'),
                })
            );
            expect(socketService.emitToUser).toHaveBeenCalledWith(
                mockReceiverId,
                'WALLET_UPDATED',
                expect.objectContaining({
                    message: expect.stringContaining('Credit Alert'),
                })
            );
        });

        it('should throw BadRequestError for insufficient funds (Internal)', async () => {
            (redisConnection.get as jest.Mock).mockResolvedValue(mockUserId);
            (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(null);
            (nameEnquiryService.resolveAccount as jest.Mock).mockResolvedValue({
                isInternal: true,
                accountName: 'John Doe',
            });

            (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({
                id: 'wallet-123',
                userId: mockUserId,
                balance: 1000, // Less than 5000
            });
            (prisma.virtualAccount.findUnique as jest.Mock).mockResolvedValue({
                wallet: { id: 'wallet-456', userId: mockReceiverId },
            });

            await expect(transferService.processTransfer(mockPayload)).rejects.toThrow(
                BadRequestError
            );
        });

        it('should initiate external transfer successfully', async () => {
            (redisConnection.get as jest.Mock).mockResolvedValue(mockUserId);
            (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(null);
            (nameEnquiryService.resolveAccount as jest.Mock).mockResolvedValue({
                isInternal: false,
                accountName: 'External User',
            });

            (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({
                id: 'wallet-123',
                userId: mockUserId,
                balance: 10000,
            });

            (prisma.transaction.create as jest.Mock).mockResolvedValue({ id: 'tx-external' });

            const result = await transferService.processTransfer(mockPayload);

            expect(result).toEqual({
                message: 'Transfer processing',
                transactionId: 'tx-external',
                status: 'PENDING',
                amount: 5000,
                recipient: 'External User',
            });

            // Verify Debit only
            expect(prisma.wallet.update).toHaveBeenCalledWith({
                where: { id: 'wallet-123' },
                data: { balance: { decrement: 5000 } },
            });

            // Verify idempotency key was deleted
            expect(redisConnection.del).toHaveBeenCalledWith(`idempotency:${mockIdempotencyKey}`);

            // Verify Socket Emission (Sender only)
            expect(walletService.getWalletBalance).toHaveBeenCalledWith(mockUserId);
            expect(socketService.emitToUser).toHaveBeenCalledWith(
                mockUserId,
                'WALLET_UPDATED',
                expect.objectContaining({
                    message: expect.stringContaining('Debit Alert'),
                })
            );
        });
    });
});
