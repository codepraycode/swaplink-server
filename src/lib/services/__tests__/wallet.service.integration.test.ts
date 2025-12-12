import prisma from '../../../lib/utils/database';
import { walletService } from '../wallet.service';
import { TestUtils } from '../../../test/utils';
import { NotFoundError, BadRequestError } from '../../utils/api-error';
import { TransactionType } from '../../../database/generated/prisma';

describe('WalletService - Integration Tests', () => {
    beforeEach(async () => {
        // Clean up database before each test
        await prisma.transaction.deleteMany();
        await prisma.wallet.deleteMany();
        await prisma.user.deleteMany();
    });

    describe('setUpWallet', () => {
        it('should create NGN wallet for new user', async () => {
            const user = await TestUtils.createUser();

            await walletService.setUpWallet(user.id);

            const wallet = await prisma.wallet.findUnique({
                where: { userId: user.id },
            });

            expect(wallet).toBeDefined();
            expect(wallet?.balance).toBe(0);
            expect(wallet?.lockedBalance).toBe(0);
        });

        it('should work within a transaction', async () => {
            const user = await TestUtils.createUser();

            await prisma.$transaction(async tx => {
                await walletService.setUpWallet(user.id, tx);
            });

            const wallet = await prisma.wallet.findUnique({
                where: { userId: user.id },
            });

            expect(wallet).toBeDefined();
        });
    });

    describe('getWalletBalance', () => {
        it('should return wallet balance with available balance calculated', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            const balance = await walletService.getWalletBalance(user.id);

            expect(balance.balance).toBe(100000);
            expect(balance.lockedBalance).toBe(0);
            expect(balance.availableBalance).toBe(100000);
        });

        it('should calculate available balance correctly with locked funds', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            await prisma.wallet.update({
                where: { userId: user.id },
                data: { lockedBalance: 30000 },
            });

            const balance = await walletService.getWalletBalance(user.id);

            expect(balance.balance).toBe(100000);
            expect(balance.lockedBalance).toBe(30000);
            expect(balance.availableBalance).toBe(70000);
        });

        it('should throw NotFoundError if wallet does not exist', async () => {
            const user = await TestUtils.createUser();

            await expect(walletService.getWalletBalance(user.id)).rejects.toThrow(NotFoundError);
        });
    });

    describe('getWallet', () => {
        it('should return wallet details', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            const wallet = await walletService.getWallet(user.id);

            expect(wallet.balance).toBe(100000);
            expect(wallet.availableBalance).toBe(100000);
            expect(wallet.createdAt).toBeDefined();
            expect(wallet.updatedAt).toBeDefined();
        });

        it('should throw NotFoundError if wallet does not exist', async () => {
            const user = await TestUtils.createUser();

            await expect(walletService.getWallet(user.id)).rejects.toThrow(NotFoundError);
        });
    });

    describe('getTransactions', () => {
        it('should return paginated transactions', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            // Create some transactions
            await walletService.creditWallet(user.id, 10000);
            await walletService.creditWallet(user.id, 20000);
            await walletService.debitWallet(user.id, 5000);

            const result = await walletService.getTransactions({ userId: user.id });

            expect(result.transactions).toHaveLength(3);
            expect(result.pagination.total).toBe(3);
            expect(result.pagination.page).toBe(1);
            expect(result.pagination.limit).toBe(20);
        });

        it('should filter by transaction type', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            await walletService.creditWallet(user.id, 10000);
            await walletService.debitWallet(user.id, 5000);

            const result = await walletService.getTransactions({
                userId: user.id,
                type: 'DEPOSIT' as TransactionType,
            });

            expect(result.transactions).toHaveLength(1);
            expect(result.transactions[0].type).toBe('DEPOSIT');
        });

        it('should handle pagination', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            // Create 5 transactions
            for (let i = 0; i < 5; i++) {
                await walletService.creditWallet(user.id, 1000);
            }

            const page1 = await walletService.getTransactions({
                userId: user.id,
                page: 1,
                limit: 2,
            });

            const page2 = await walletService.getTransactions({
                userId: user.id,
                page: 2,
                limit: 2,
            });

            expect(page1.transactions).toHaveLength(2);
            expect(page2.transactions).toHaveLength(2);
            expect(page1.transactions[0].id).not.toBe(page2.transactions[0].id);
            expect(page1.pagination.totalPages).toBe(3);
        });

        it('should order by createdAt desc', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            await walletService.creditWallet(user.id, 10000);
            await new Promise(resolve => setTimeout(resolve, 10));
            await walletService.creditWallet(user.id, 20000);

            const result = await walletService.getTransactions({ userId: user.id });

            expect(result.transactions[0].amount).toBe(20000); // Most recent first
            expect(result.transactions[1].amount).toBe(10000);
        });
    });

    describe('hasSufficientBalance', () => {
        it('should return true when balance is sufficient', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            const result = await walletService.hasSufficientBalance(user.id, 50000);

            expect(result).toBe(true);
        });

        it('should return false when balance is insufficient', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            const result = await walletService.hasSufficientBalance(user.id, 150000);

            expect(result).toBe(false);
        });

        it('should account for locked balance', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            await prisma.wallet.update({
                where: { userId: user.id },
                data: { lockedBalance: 60000 },
            });

            const result = await walletService.hasSufficientBalance(user.id, 50000);

            expect(result).toBe(false); // Available: 100000 - 60000 = 40000
        });

        it('should return false if wallet does not exist', async () => {
            const user = await TestUtils.createUser();

            const result = await walletService.hasSufficientBalance(user.id, 10000);

            expect(result).toBe(false);
        });
    });

    describe('creditWallet', () => {
        it('should credit wallet and create transaction record', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            const transaction = await walletService.creditWallet(user.id, 50000);

            expect(transaction.type).toBe('DEPOSIT');
            expect(transaction.amount).toBe(50000);
            expect(transaction.balanceBefore).toBe(100000);
            expect(transaction.balanceAfter).toBe(150000);
            expect(transaction.status).toBe('COMPLETED');
            expect(transaction.reference).toMatch(/^TX-CR-/);

            // Verify wallet balance updated
            const balance = await walletService.getWalletBalance(user.id);
            expect(balance.balance).toBe(150000);
        });

        it('should include metadata in transaction', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            const metadata = { source: 'bank_transfer', reference: 'BNK-123' };
            const transaction = await walletService.creditWallet(user.id, 50000, metadata);

            expect(transaction.metadata).toEqual(metadata);
        });

        it('should be atomic - rollback on error', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            // Mock an error in transaction creation
            jest.spyOn(prisma.transaction, 'create').mockRejectedValueOnce(new Error('DB Error'));

            await expect(walletService.creditWallet(user.id, 50000)).rejects.toThrow();

            // Balance should not have changed
            const balance = await walletService.getWalletBalance(user.id);
            expect(balance.balance).toBe(100000);

            jest.restoreAllMocks();
        });

        it('should throw NotFoundError if wallet does not exist', async () => {
            const user = await TestUtils.createUser();

            await expect(walletService.creditWallet(user.id, 50000)).rejects.toThrow(NotFoundError);
        });
    });

    describe('debitWallet', () => {
        it('should debit wallet and create transaction record', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            const transaction = await walletService.debitWallet(user.id, 30000);

            expect(transaction.type).toBe('WITHDRAWAL');
            expect(transaction.amount).toBe(30000);
            expect(transaction.balanceBefore).toBe(100000);
            expect(transaction.balanceAfter).toBe(70000);
            expect(transaction.status).toBe('COMPLETED');
            expect(transaction.reference).toMatch(/^TX-DR-/);

            // Verify wallet balance updated
            const balance = await walletService.getWalletBalance(user.id);
            expect(balance.balance).toBe(70000);
        });

        it('should throw BadRequestError if insufficient funds', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            await expect(walletService.debitWallet(user.id, 150000)).rejects.toThrow(
                BadRequestError
            );
            await expect(walletService.debitWallet(user.id, 150000)).rejects.toThrow(
                'Insufficient funds'
            );

            // Balance should not have changed
            const balance = await walletService.getWalletBalance(user.id);
            expect(balance.balance).toBe(100000);
        });

        it('should account for locked balance', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            await prisma.wallet.update({
                where: { userId: user.id },
                data: { lockedBalance: 60000 },
            });

            await expect(walletService.debitWallet(user.id, 50000)).rejects.toThrow(
                BadRequestError
            );
        });

        it('should be atomic - rollback on error', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            jest.spyOn(prisma.transaction, 'create').mockRejectedValueOnce(new Error('DB Error'));

            await expect(walletService.debitWallet(user.id, 30000)).rejects.toThrow();

            // Balance should not have changed
            const balance = await walletService.getWalletBalance(user.id);
            expect(balance.balance).toBe(100000);

            jest.restoreAllMocks();
        });

        it('should throw NotFoundError if wallet does not exist', async () => {
            const user = await TestUtils.createUser();

            await expect(walletService.debitWallet(user.id, 10000)).rejects.toThrow(NotFoundError);
        });
    });

    describe('Complex Scenarios', () => {
        it('should handle multiple concurrent transactions', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            // Perform multiple credits concurrently
            await Promise.all([
                walletService.creditWallet(user.id, 10000),
                walletService.creditWallet(user.id, 20000),
                walletService.creditWallet(user.id, 30000),
            ]);

            const balance = await walletService.getWalletBalance(user.id);
            expect(balance.balance).toBe(160000); // 100000 + 10000 + 20000 + 30000

            const transactions = await walletService.getTransactions({ userId: user.id });
            expect(transactions.transactions).toHaveLength(3);
        });

        it('should maintain transaction history', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            await walletService.creditWallet(user.id, 50000);
            await walletService.debitWallet(user.id, 20000);
            await walletService.creditWallet(user.id, 10000);

            const result = await walletService.getTransactions({ userId: user.id });

            expect(result.transactions).toHaveLength(3);
            expect(result.transactions[0].balanceAfter).toBe(140000); // Most recent
            expect(result.transactions[1].balanceAfter).toBe(130000);
            expect(result.transactions[2].balanceAfter).toBe(150000);
        });
    });
});
