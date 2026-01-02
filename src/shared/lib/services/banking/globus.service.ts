import axios from 'axios';
import { envConfig } from '../../../config/env.config';
import logger from '../../utils/logger';

export class GlobusService {
    private baseUrl = envConfig.GLOBUS_BASE_URL;

    private async getAuthToken() {
        // TODO: Implement caching logic here
        return 'mock_token';
    }

    async verifyAccount(accountNumber: string, bankCode: string) {
        if (this.isMockMode()) {
            await this.simulateLatency();
            return {
                accountNumber,
                accountName: 'MOCK USER NAME',
                bankCode,
                bankName: 'MOCK BANK',
            };
        }

        const token = await this.getAuthToken();
        try {
            const response = await axios.post(
                `${this.baseUrl}/accounts/name-enquiry`,
                { accountNumber, bankCode },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return response.data;
        } catch (error) {
            logger.error('Globus Name Enquiry Failed', error);
            throw error;
        }
    }

    async generateNuban(user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
    }) {
        try {
            if (this.isMockMode()) {
                logger.warn(`⚠️ [GlobusService] Running in MOCK MODE for user ${user.id}`);
                await this.simulateLatency();

                return {
                    accountNumber: '11' + Math.floor(Math.random() * 100000000),
                    accountName: `BCDees - ${user.firstName} ${user.lastName}`,
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

    // Alias for backward compatibility if needed, or just use generateNuban
    async createAccount(user: any) {
        return this.generateNuban(user);
    }

    async transferFunds(payload: {
        amount: number;
        destinationAccount: string;
        destinationBankCode: string;
        destinationName: string;
        narration: string;
        reference: string;
    }) {
        if (this.isMockMode()) {
            await this.simulateLatency();
            // Simulate 90% success
            if (Math.random() > 0.1) {
                return {
                    status: 'SUCCESS',
                    reference: payload.reference,
                    sessionId: `MOCK-SESSION-${Date.now()}`,
                };
            } else {
                throw new Error('Mock Transfer Failed');
            }
        }

        const token = await this.getAuthToken();
        try {
            const response = await axios.post(`${this.baseUrl}/transfers`, payload, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;
        } catch (error) {
            logger.error('Globus Transfer Failed', error);
            throw error;
        }
    }

    async getTransactionStatus(reference: string) {
        if (this.isMockMode()) {
            await this.simulateLatency();
            return {
                status: 'COMPLETED',
                reference,
                amount: 1000,
                date: new Date(),
            };
        }

        const token = await this.getAuthToken();
        try {
            const response = await axios.get(`${this.baseUrl}/transactions/${reference}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;
        } catch (error) {
            logger.error('Globus Get Transaction Status Failed', error);
            throw error;
        }
    }

    async getStatement(startDate: Date, endDate: Date) {
        if (this.isMockMode()) {
            await this.simulateLatency();
            return []; // Return empty list for mock
        }

        const token = await this.getAuthToken();
        try {
            const response = await axios.get(`${this.baseUrl}/accounts/statement`, {
                params: { startDate, endDate },
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;
        } catch (error) {
            logger.error('Globus Get Statement Failed', error);
            throw error;
        }
    }

    private isMockMode() {
        return (
            !envConfig.GLOBUS_CLIENT_ID ||
            envConfig.NODE_ENV === 'test' ||
            envConfig.NODE_ENV === 'development'
        );
    }

    private async simulateLatency() {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

export const globusService = new GlobusService();
