import { envConfig } from '../../../config/env.config';
import { GlobusError } from '../../utils/api-error';
import logger from '../../utils/logger';

type AccountDetails = {
    accountNumber: string;
    accountName: string;
    bankName: string;
    bankCode: string;
    status: string;
    sessionId: string;
    createdAt: Date;
    updatedAt: Date;
};

type BankDetails = {
    accountNumber: string;
    accountName: string;
    bankName: string;
    provider: string;
};

type TransferResponse = {
    sessionId: string;
    status: string;
    reference: string;
};

type TransactionStatusResponse = {
    status: string;
    sessionId: string;
    reference: string;
};

type StatementEntry = {
    amount: number;
    reference: string;
    description: string;
    date: Date;
};

export class GlobusService {
    private baseUrl = envConfig.GLOBUS_BASE_URL;

    private async getAuthToken() {
        // TODO: Implement caching logic here
        return 'mock_token';
    }

    async verifyAccount(_accountNumber: string, _bankCode: string): Promise<AccountDetails> {
        // TODO: Implement live Globus call
        // For now, since external API is not yet integrated, we return an error.
        throw new GlobusError(
            'Name Enquiry Service is currently unavailable. Please try again later.'
        );

        /*
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
        */
    }

    async generateNuban(user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
    }): Promise<BankDetails> {
        try {
            // Auto-generate virtual account details
            // Generate a 10-digit account number using timestamp and random digits
            const timestamp = Date.now().toString();
            const randomSuffix = Math.floor(Math.random() * 1000)
                .toString()
                .padStart(3, '0');
            const accountNumber = (timestamp + randomSuffix).slice(-10);

            const bankDetails: BankDetails = {
                accountNumber: accountNumber,
                accountName: `${user.firstName} ${user.lastName}`,
                bankName: 'Globus Bank',
                provider: 'GLOBUS',
            };

            logger.info(
                `✅ [GlobusService] Auto-generated virtual account: ${accountNumber} for ${user.email}`
            );

            return bankDetails;

            /*
            // TODO: When ready to integrate with actual Globus API, replace above with:
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
            */
        } catch (error) {
            logger.error('Globus Account Creation Failed', error);
            throw error; // Throw so the worker knows to retry
        }
    }

    // Alias for backward compatibility if needed, or just use generateNuban
    async createAccount(user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
    }): Promise<BankDetails> {
        return this.generateNuban(user);
    }

    async transferFunds(_payload: {
        amount: number;
        destinationAccount: string;
        destinationBankCode: string;
        destinationName: string;
        narration: string;
        reference: string;
    }): Promise<TransferResponse> {
        try {
            // TODO: Implement live Globus call
            // Throw error to prevent fake success
            throw new GlobusError(
                'Transfer service is currently unavailable. Please try again later.'
            );

            /* if (this.isMockMode()) { ... } */ // Mock removed

            /*
            const token = await this.getAuthToken();
            const response = await axios.post(`${this.baseUrl}/transfers`, payload, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;
            */
        } catch (error) {
            logger.error('Globus Transfer Failed', error);
            throw error;
        }
    }

    async getTransactionStatus(_reference: string): Promise<TransactionStatusResponse> {
        try {
            // TODO: Implement live Globus call
            throw new GlobusError('Transaction status service is currently unavailable.');

            /* if (this.isMockMode()) { ... } */ // Mock removed

            /*
            const token = await this.getAuthToken();
            const response = await axios.get(`${this.baseUrl}/transactions/${reference}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;
            */
        } catch (error) {
            logger.error('Globus Get Transaction Status Failed', error);
            throw error;
        }
    }

    async getStatement(_startDate: Date, _endDate: Date): Promise<StatementEntry[]> {
        try {
            // TODO: Implement live Globus call
            throw new GlobusError('Statement service is currently unavailable.');

            /* if (this.isMockMode()) { ... } */ // Mock removed

            /*
            const token = await this.getAuthToken();
            const response = await axios.get(`${this.baseUrl}/accounts/statement`, {
                params: { startDate, endDate },
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;
            */
        } catch (error) {
            logger.error('Globus Get Statement Failed', error);
            throw error;
        }
    }

    private isMockMode() {
        return false;
        /*
        return (
            !envConfig.GLOBUS_CLIENT_ID ||
            envConfig.NODE_ENV === 'test' ||
            envConfig.NODE_ENV === 'development'
        );
        */
    }

    private async simulateLatency() {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

export const globusService = new GlobusService();
