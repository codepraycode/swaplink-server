import authService from '../auth.service';
import { prisma } from '../../../../../shared/database';
import { bankingQueue } from '../../../../../shared/lib/queues/banking.queue';
import { redisConnection } from '../../../../../shared/config/redis.config';

// Mock Queue
jest.mock('../../../../../shared/lib/queues/banking.queue', () => ({
    bankingQueue: {
        add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    },
}));

describe('AuthService Integration', () => {
    beforeAll(async () => {
        if (redisConnection.status === 'close') {
            await redisConnection.connect();
        }
    });

    afterAll(async () => {
        await redisConnection.quit();
    });

    it('should register user and trigger banking job', async () => {
        const userData = {
            email: `auth-test-${Date.now()}@example.com`,
            phone: `090${Date.now()}`,
            password: 'password123',
            firstName: 'Auth',
            lastName: 'Test',
        };

        const result = await authService.register(userData);

        expect(result.user).toHaveProperty('id');
        expect(result.user.email).toBe(userData.email);

        // Verify Queue Job was added
        expect(bankingQueue.add).toHaveBeenCalledWith(
            'create-virtual-account',
            expect.objectContaining({
                userId: result.user.id,
                walletId: expect.any(String),
            })
        );
    });
});
