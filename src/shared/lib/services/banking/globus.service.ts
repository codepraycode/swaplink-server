import axios from 'axios';
import { envConfig } from '../../../config/env.config';
import logger from '../../utils/logger';

export class GlobusService {
    private baseUrl = envConfig.GLOBUS_BASE_URL;

    private async getAuthToken() {
        // TODO: Implement caching logic here
        return 'mock_token';
    }

    async createAccount(user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
    }) {
        try {
            // MOCK MODE: If no credentials or in test/dev without explicit keys
            if (
                !envConfig.GLOBUS_CLIENT_ID ||
                envConfig.NODE_ENV === 'test' ||
                envConfig.NODE_ENV === 'development'
            ) {
                logger.warn(`⚠️ [GlobusService] Running in MOCK MODE for user ${user.id}`);

                // Simulate network latency
                await new Promise(resolve => setTimeout(resolve, 2000));

                return {
                    accountNumber: '11' + Math.floor(Math.random() * 100000000),
                    accountName: `SwapLink - ${user.firstName} ${user.lastName}`,
                    bankName: 'Globus Bank (Sandbox)',
                    provider: 'GLOBUS',
                };
            }

            const token = await this.getAuthToken();
            const response = await axios.post(
                `${this.baseUrl}/accounts/virtual`,
                {
                    accountName: `${user.firstName} ${user.lastName}`,
                    email: user.email,
                    phoneNumber: user.phone,
                    reference: user.id, // Idempotency Key
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            return {
                ...response.data,
                provider: 'GLOBUS',
            };
        } catch (error) {
            logger.error('Globus Account Creation Failed', error);
            throw error; // Throw so the worker knows to retry
        }
    }
}

export const globusService = new GlobusService();
