import { bankingQueue } from '../banking.queue';
import { bankingWorker } from '../../../../worker/banking.worker';
import { prisma } from '../../../database';
import { globusService } from '../../integrations/banking/globus.service';
import { redisConnection } from '../../../config/redis.config';

// Mock GlobusService
jest.mock('../../integrations/banking/globus.service');

describe('BankingQueue Integration', () => {
    beforeAll(async () => {
        // Ensure Redis is connected
        if (redisConnection.status === 'close') {
            await redisConnection.connect();
        }
    });

    afterAll(async () => {
        await bankingQueue.close();
        await bankingWorker.close();
        await redisConnection.quit();
    });

    it('should process account creation job and update database', async () => {
        // 1. Setup Data
        const user = await prisma.user.create({
            data: {
                email: `queue-test-${Date.now()}@example.com`,
                phone: `080${Date.now()}`,
                password: 'hashed_password',
                firstName: 'Queue',
                lastName: 'Test',
            },
        });

        const wallet = await prisma.wallet.create({
            data: { userId: user.id },
        });

        // 2. Mock Globus Response
        (globusService.createAccount as jest.Mock).mockResolvedValue({
            accountNumber: '1122334455',
            accountName: 'SwapLink - Queue Test',
            bankName: 'Globus Bank',
            provider: 'GLOBUS',
        });

        // 3. Add Job to Queue
        await bankingQueue.add('create-virtual-account', {
            userId: user.id,
            walletId: wallet.id,
        });

        // 4. Wait for Worker to Process (Poll DB)
        let virtualAccount = null;
        for (let i = 0; i < 10; i++) {
            virtualAccount = await prisma.virtualAccount.findUnique({
                where: { walletId: wallet.id },
            });
            if (virtualAccount) break;
            await new Promise(r => setTimeout(r, 500)); // Wait 500ms
        }

        // 5. Assertions
        expect(virtualAccount).not.toBeNull();
        expect(virtualAccount?.accountNumber).toBe('1122334455');
        expect(globusService.createAccount).toHaveBeenCalledWith(
            expect.objectContaining({ id: user.id })
        );
    });
});
