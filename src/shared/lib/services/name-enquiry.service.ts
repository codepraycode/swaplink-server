import { prisma } from '../../database';
import { BadRequestError } from '../utils/api-error';
import logger from '../utils/logger';

export interface NameEnquiryResponse {
    accountName: string;
    bankName: string;
    isInternal: boolean;
    sessionId?: string;
}

export class NameEnquiryService {
    /**
     * Resolve account name (Hybrid: Internal -> External)
     */
    async resolveAccount(accountNumber: string, bankCode: string): Promise<NameEnquiryResponse> {
        // 1. Check Internal (Virtual Accounts)
        // Globus Bank Code is usually '00103' or similar. Assuming '000' for internal/mock for now or checking provider.
        // Actually, we check if the account exists in our VirtualAccount table.

        const internalAccount = await prisma.virtualAccount.findUnique({
            where: { accountNumber },
            include: { wallet: { include: { user: true } } },
        });

        if (internalAccount) {
            // It's a SwapLink user
            return {
                accountName: internalAccount.accountName,
                bankName: 'SwapLink (Globus)',
                isInternal: true,
            };
        }

        // 2. External Lookup (Mocked for now, would call Globus API)
        // TODO: Integrate actual Globus Name Enquiry API
        logger.info(`Performing external name enquiry for ${accountNumber} @ ${bankCode}`);

        // Mock response for external accounts
        // In production, this would throw if not found
        if (accountNumber.length !== 10) {
            throw new BadRequestError('Invalid account number');
        }

        return {
            accountName: 'MOCKED EXTERNAL USER',
            bankName: 'External Bank',
            isInternal: false,
            sessionId: '999999999999', // Mock NIBSS Session ID
        };
    }
}

export const nameEnquiryService = new NameEnquiryService();
