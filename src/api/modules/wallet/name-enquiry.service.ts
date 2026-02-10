import { prisma } from '../../../shared/database';
import { globusService } from '../../../shared/lib/services/banking/globus.service';

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
            return {
                accountName: internalAccount.accountName,
                bankName: internalAccount.bankName || 'BCDees (Globus)',
                isInternal: true,
            };
        }

        // 2. External Lookup (via Globus Service)
        // This will throw InternalError until implemented live
        const externalAccount = await globusService.verifyAccount(accountNumber, bankCode);

        return {
            accountName: externalAccount.accountName,
            bankName: externalAccount.bankName || 'External Bank',
            isInternal: false,
            sessionId: externalAccount.sessionId,
        };
    }
}

export const nameEnquiryService = new NameEnquiryService();
