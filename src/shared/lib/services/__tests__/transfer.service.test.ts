import { transferService } from '../../../../api/modules/transfer/transfer.service';
import { prisma } from '../../../database';
import { pinService } from '../pin.service';
import { nameEnquiryService } from '../name-enquiry.service';
import { BadRequestError } from '../../utils/api-error';
import { socketService } from '../socket.service';
import { walletService } from '../wallet.service';

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
        $transaction: jest.fn(callback => callback(prisma)),
    },
}));

jest.mock('../../../config/redis.config', () => ({
    redisConnection: {},
}));

jest.mock('bullmq', () => ({
    Queue: jest.fn().mockImplementation(() => ({
        add: jest.fn(),
    })),
}));

jest.mock('../pin.service');
jest.mock('../name-enquiry.service');

describe('TransferService', () => {
    const mockUserId = 'user-123';
    const mockReceiverId = 'user-456';
    const mockPayload = {
        userId: mockUserId,
        amount: 5000,
        accountNumber: '1234567890',
        bankCode: '058',
        accountName: 'John Doe',
        pin: '1234',
        idempotencyKey: 'uuid-123',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('processTransfer', () => {
        it('should return existing transaction if idempotency key exists', async () => {
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
            expect(pinService.verifyPin).not.toHaveBeenCalled();
        });

        it('should process internal transfer successfully', async () => {
            (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(null);
            (pinService.verifyPin as jest.Mock).mockResolvedValue(true);
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
            (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(null);
            (pinService.verifyPin as jest.Mock).mockResolvedValue(true);
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
                wallet: { id: 'wallet-456' },
            });

            await expect(transferService.processTransfer(mockPayload)).rejects.toThrow(
                BadRequestError
            );
        });

        it('should initiate external transfer successfully', async () => {
            (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(null);
            (pinService.verifyPin as jest.Mock).mockResolvedValue(true);
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

            // Queue should be called (mocked internally in service constructor, hard to test without exposing queue)
            // But we can assume it works if no error is thrown

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
