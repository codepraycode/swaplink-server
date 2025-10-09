import { WalletService } from '../wallet.service';
import { TestUtils } from '../../test/utils';

describe('WalletService', () => {
    let walletService: WalletService;

    beforeEach(() => {
        walletService = new WalletService('WALLETSERVICE TEST');
    });

    describe('getUserWallets', () => {
        it('should return user wallets with available balance', async () => {
            const { user, wallets } = await TestUtils.createUserWithWallets();

            const result = await walletService.getWallets(user.id);

            expect(result).toHaveLength(2);
            expect(result.find(w => w.currency === 'USD')).toBeTruthy();
            expect(result.find(w => w.currency === 'NGN')).toBeTruthy();

            const usdWallet = result.find(w => w.currency === 'USD');
            expect(usdWallet).toHaveProperty('availableBalance');
            expect(usdWallet?.availableBalance).toBe(1000); // 1000 - 0 locked
        });
    });

    describe('getWalletBalance', () => {
        it('should return specific wallet balance', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            const result = await walletService.getWalletBalance(user.id, 'USD');

            expect(result.currency).toBe('USD');
            expect(result.balance).toBe(1000);
            expect(result.availableBalance).toBe(1000);
        });

        it('should throw error for non-existent wallet', async () => {
            const { user } = await TestUtils.createUserWithWallets();

            await expect(walletService.getWalletBalance(user.id, 'EUR')).rejects.toThrow(
                'Wallet not found'
            );
        });
    });
});
