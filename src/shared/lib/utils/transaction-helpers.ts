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
 * Generate a unique transaction reference with proper format
 */
export function generateTransactionReference(type: string = 'TX'): string {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${type}-${timestamp}-${randomPart}`;
}

/**
 * Validate that all required transaction details are present
 */
export function validateTransactionDetails(
    amount: number,
    senderDetails: PartyDetails,
    receiverDetails: PartyDetails,
    reference: string
): void {
    if (!amount || amount <= 0) {
        throw new Error('Transaction amount must be positive');
    }
    if (!senderDetails.name || !senderDetails.account || !senderDetails.bankName) {
        throw new Error('Complete sender details are required');
    }
    if (!receiverDetails.name || !receiverDetails.account || !receiverDetails.bankName) {
        throw new Error('Complete receiver details are required');
    }
    if (!reference || reference.trim().length === 0) {
        throw new Error('Transaction reference is required');
    }
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
                    id: true,
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

    // Use wallet ID as fallback if no virtual account exists
    const accountNumber =
        user.wallet?.virtualAccount?.accountNumber || user.wallet?.id || userId.substring(0, 10);
    const bankName = user.wallet?.virtualAccount?.bankName || 'BCDees Wallet';

    return {
        name: `${user.firstName} ${user.lastName}`,
        account: accountNumber,
        bankName: bankName,
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
    if (!name || !account || !bankName) {
        throw new Error('External party details (name, account, bankName) are required');
    }

    return {
        name: name,
        account: account,
        bankName: bankName,
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
