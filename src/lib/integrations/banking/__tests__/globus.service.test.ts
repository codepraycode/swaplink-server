import { globusService } from '../globus.service';

// Mock env config to force Mock Mode
jest.mock('../../../../config/env.config', () => ({
    envConfig: {
        GLOBUS_CLIENT_ID: undefined, // Force Mock Mode
        NODE_ENV: 'test',
    },
}));

describe('GlobusService', () => {
    it('should return a mock account in test/mock mode', async () => {
        const user = {
            id: 'user-123',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '1234567890',
        };

        const result = await globusService.createAccount(user);

        expect(result).toHaveProperty('accountNumber');
        expect(result.accountName).toBe('SwapLink - John Doe');
        expect(result.provider).toBe('GLOBUS');
        expect(result.accountNumber).toMatch(/^11/); // Starts with 11
    });
});
