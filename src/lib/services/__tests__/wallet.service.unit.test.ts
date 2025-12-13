import { prisma, Prisma } from '../../../database';
import { walletService } from '../wallet.service';
import { NotFoundError, BadRequestError, InternalError } from '../../utils/api-error';
import { TransactionType } from '../../../database/generated/prisma';

// Mock dependencies
jest.mock('../../../database', () => ({
    prisma: {
        wallet: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        transaction: {
            findMany: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
        },
        $transaction: jest.fn(),
    },
    Prisma: {},
}));

describe('WalletService - Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('setUpWallet', () => {
        it('should create wallet for a new user', async () => {
            const userId = 'user-123';
            const mockTx = {
                wallet: {
                    create: jest.fn().mockResolvedValue({ id: 'wallet-123' }),
                },
            } as any;

            await walletService.setUpWallet(userId, mockTx);

            expect(mockTx.wallet.create).toHaveBeenCalledWith({
                data: {
                    userId,
                    balance: 0,
                    lockedBalance: 0,
                },
            });
        });

        it('should use transaction client if provided', async () => {
            const userId = 'user-123';
            const mockTx = {
                wallet: {
                    create: jest.fn().mockResolvedValue({ id: 'wallet-123' }),
                },
            } as any;

            await walletService.setUpWallet(userId, mockTx);

            expect(mockTx.wallet.create).toHaveBeenCalled();
            expect(prisma.wallet.create).not.toHaveBeenCalled();
        });

        it('should throw InternalError on failure', async () => {
            const userId = 'user-123';
            const mockTx = {
                wallet: {
                    create: jest.fn().mockRejectedValue(new Error('DB Error')),
                },
            } as any;

            await expect(walletService.setUpWallet(userId, mockTx)).rejects.toThrow(InternalError);
        });
    });

    describe('getWalletBalance', () => {
        it('should return wallet balance with calculated available balance', async () => {
            const userId = 'user-123';
            const mockWallet = {
                id: 'wallet-123',
                userId,
                balance: 100000,
                lockedBalance: 20000,
            };

            (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(mockWallet);

            const result = await walletService.getWalletBalance(userId);

            expect(prisma.wallet.findUnique).toHaveBeenCalledWith({
                where: { userId },
            });

            expect(result).toEqual({
                id: 'wallet-123',
                balance: 100000,
                lockedBalance: 20000,
                availableBalance: 80000,
            });
        });

        it('should throw NotFoundError if wallet not found', async () => {
            const userId = 'user-123';

            (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(walletService.getWalletBalance(userId)).rejects.toThrow(NotFoundError);
            await expect(walletService.getWalletBalance(userId)).rejects.toThrow(
                'Wallet not found'
            );
        });
    });

    describe('getWallet', () => {
        it('should return wallet details', async () => {
            const userId = 'user-123';
            const mockWallet = {
                id: 'wallet-123',
                userId,
                balance: 100000,
                lockedBalance: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(mockWallet);

            const result = await walletService.getWallet(userId);

            expect(result.balance).toBe(100000);
            expect(result.availableBalance).toBe(100000);
            expect(result.createdAt).toBeDefined();
        });

        it('should throw NotFoundError if wallet not found', async () => {
            const userId = 'user-123';
            (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(walletService.getWallet(userId)).rejects.toThrow(NotFoundError);
        });
    });

    describe('getTransactions', () => {
        it('should return paginated transactions', async () => {
            const userId = 'user-123';
            const mockTransactions = [
                {
                    id: 'tx-1',
                    userId,
                    type: 'DEPOSIT',
                    amount: 10000,
                    status: 'COMPLETED',
                    reference: 'REF-001',
                    balanceBefore: 0,
                    balanceAfter: 10000,
                    createdAt: new Date(),
                    metadata: {},
                    description: null,
                },
            ];

            (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);
            (prisma.transaction.count as jest.Mock).mockResolvedValue(1);

            const result = await walletService.getTransactions({ userId });

            expect(result.transactions).toEqual(mockTransactions);
            expect(result.pagination).toEqual({
                total: 1,
                page: 1,
                limit: 20,
                totalPages: 1,
            });
        });

        it('should filter by type', async () => {
            const userId = 'user-123';
            const type: TransactionType = 'DEPOSIT';

            (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.transaction.count as jest.Mock).mockResolvedValue(0);

            await walletService.getTransactions({ userId, type });

            expect(prisma.transaction.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { userId, type },
                })
            );
        });

        it('should handle pagination correctly', async () => {
            const userId = 'user-123';
            const page = 2;
            const limit = 10;

            (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.transaction.count as jest.Mock).mockResolvedValue(25);

            const result = await walletService.getTransactions({ userId, page, limit });

            expect(prisma.transaction.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip: 10, // (page - 1) * limit
                    take: 10,
                })
            );

            expect(result.pagination.totalPages).toBe(3); // Math.ceil(25 / 10)
        });
    });

    describe('hasSufficientBalance', () => {
        it('should return true if balance is sufficient', async () => {
            const userId = 'user-123';
            const amount = 50000;

            const mockWallet = {
                balance: 100000,
                lockedBalance: 20000,
            };

            (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(mockWallet);

            const result = await walletService.hasSufficientBalance(userId, amount);

            expect(result).toBe(true);
        });

        it('should return false if balance is insufficient', async () => {
            const userId = 'user-123';
            const amount = 90000;

            const mockWallet = {
                balance: 100000,
                lockedBalance: 20000,
            };

            (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(mockWallet);

            const result = await walletService.hasSufficientBalance(userId, amount);

            expect(result).toBe(false);
        });

        it('should return false if wallet not found', async () => {
            const userId = 'user-123';
            const amount = 10000;

            (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await walletService.hasSufficientBalance(userId, amount);

            expect(result).toBe(false);
        });
    });

    describe('creditWallet', () => {
        it('should credit wallet and create transaction record', async () => {
            const userId = 'user-123';
            const amount = 50000;
            const metadata = { source: 'bank_transfer' };

            const mockWallet = {
                id: 'wallet-123',
                userId,
                balance: 50000,
            };

            const mockTransaction = {
                id: 'tx-123',
                userId,
                walletId: 'wallet-123',
                type: 'DEPOSIT',
                amount,
                balanceBefore: 50000,
                balanceAfter: 100000,
                status: 'COMPLETED',
                reference: expect.stringMatching(/^TX-CR-/),
                metadata,
            };

            (prisma.$transaction as jest.Mock).mockImplementation(async callback => {
                const tx = {
                    wallet: {
                        findUnique: jest.fn().mockResolvedValue(mockWallet),
                        update: jest.fn().mockResolvedValue({ ...mockWallet, balance: 100000 }),
                    },
                    transaction: {
                        create: jest.fn().mockResolvedValue(mockTransaction),
                    },
                };
                return callback(tx);
            });

            const result = await walletService.creditWallet(userId, amount, metadata);

            expect(result.type).toBe('DEPOSIT');
            expect(result.amount).toBe(amount);
            expect(result.balanceBefore).toBe(50000);
            expect(result.balanceAfter).toBe(100000);
        });

        it('should throw NotFoundError if wallet not found', async () => {
            const userId = 'user-123';
            const amount = 10000;

            (prisma.$transaction as jest.Mock).mockImplementation(async callback => {
                const tx = {
                    wallet: {
                        findUnique: jest.fn().mockResolvedValue(null),
                    },
                };
                return callback(tx);
            });

            await expect(walletService.creditWallet(userId, amount)).rejects.toThrow(NotFoundError);
        });
    });

    describe('debitWallet', () => {
        it('should debit wallet and create transaction record', async () => {
            const userId = 'user-123';
            const amount = 30000;
            const metadata = { purpose: 'withdrawal' };

            const mockWallet = {
                id: 'wallet-123',
                userId,
                balance: 50000,
                lockedBalance: 0,
            };

            const mockTransaction = {
                id: 'tx-123',
                userId,
                walletId: 'wallet-123',
                type: 'WITHDRAWAL',
                amount,
                balanceBefore: 50000,
                balanceAfter: 20000,
                status: 'COMPLETED',
                reference: expect.stringMatching(/^TX-DR-/),
                metadata,
            };

            (prisma.$transaction as jest.Mock).mockImplementation(async callback => {
                const tx = {
                    wallet: {
                        findUnique: jest.fn().mockResolvedValue(mockWallet),
                        update: jest.fn().mockResolvedValue({ ...mockWallet, balance: 20000 }),
                    },
                    transaction: {
                        create: jest.fn().mockResolvedValue(mockTransaction),
                    },
                };
                return callback(tx);
            });

            const result = await walletService.debitWallet(userId, amount, metadata);

            expect(result.type).toBe('WITHDRAWAL');
            expect(result.amount).toBe(amount);
            expect(result.balanceBefore).toBe(50000);
            expect(result.balanceAfter).toBe(20000);
        });

        it('should throw BadRequestError if insufficient funds', async () => {
            const userId = 'user-123';
            const amount = 60000;

            const mockWallet = {
                id: 'wallet-123',
                balance: 50000,
                lockedBalance: 0,
            };

            (prisma.$transaction as jest.Mock).mockImplementation(async callback => {
                const tx = {
                    wallet: {
                        findUnique: jest.fn().mockResolvedValue(mockWallet),
                    },
                };
                return callback(tx);
            });

            await expect(walletService.debitWallet(userId, amount)).rejects.toThrow(
                BadRequestError
            );
            await expect(walletService.debitWallet(userId, amount)).rejects.toThrow(
                'Insufficient funds'
            );
        });

        it('should account for locked balance', async () => {
            const userId = 'user-123';
            const amount = 40000;

            const mockWallet = {
                id: 'wallet-123',
                balance: 50000,
                lockedBalance: 20000, // Available: 30000
            };

            (prisma.$transaction as jest.Mock).mockImplementation(async callback => {
                const tx = {
                    wallet: {
                        findUnique: jest.fn().mockResolvedValue(mockWallet),
                    },
                };
                return callback(tx);
            });

            await expect(walletService.debitWallet(userId, amount)).rejects.toThrow(
                BadRequestError
            );
        });

        it('should throw NotFoundError if wallet not found', async () => {
            const userId = 'user-123';
            const amount = 10000;

            (prisma.$transaction as jest.Mock).mockImplementation(async callback => {
                const tx = {
                    wallet: {
                        findUnique: jest.fn().mockResolvedValue(null),
                    },
                };
                return callback(tx);
            });

            await expect(walletService.debitWallet(userId, amount)).rejects.toThrow(NotFoundError);
        });
    });
});
