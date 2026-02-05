import { prisma } from '../../database';

/**
 * Helper to build sender/receiver details for transactions
 * This ensures consistency across all transaction creation points
 */

export interface PartyDetails {
    name: string;
    account: string;
    bankName: string;
    bankCode?: string;
    avatarUrl?: string;
}

/**
 * Get user's account details for transaction logging
 * Returns INTERNAL type for users within the system
 */
export async function getUserPartyDetails(userId: string): Promise<PartyDetails> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            firstName: true,
            lastName: true,
            avatarUrl: true,
            wallet: {
                select: {
                    virtualAccount: {
                        select: {
                            accountNumber: true,
                            bankName: true,
                        },
                    },
                },
            },
        },
    });

    if (!user) {
        throw new Error(`User ${userId} not found`);
    }

    return {
        name: `${user.firstName} ${user.lastName}`,
        account: user.wallet?.virtualAccount?.accountNumber || '0000000000',
        bankName: user.wallet?.virtualAccount?.bankName || 'BCDees Wallet',
        avatarUrl: user.avatarUrl || undefined,
    };
}

/**
 * Build external party details from provided data
 * Returns EXTERNAL type for parties outside the system
 */
export function buildExternalPartyDetails(
    name?: string,
    account?: string,
    bankName?: string,
    bankCode?: string
): PartyDetails {
    return {
        name: name || 'External Party',
        account: account || '0000000000',
        bankName: bankName || 'External Bank',
        bankCode: bankCode || undefined,
    };
}

/**
 * Build system party details (for webhook deposits, fees, etc.)
 */
export function buildSystemPartyDetails(): PartyDetails {
    return {
        name: 'BCDees System',
        account: '0000000000',
        bankName: 'BCDees Wallet',
    };
}
