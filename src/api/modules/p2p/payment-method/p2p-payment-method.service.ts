import { prisma, P2PPaymentMethod } from '../../../../shared/database';
import { BadRequestError, NotFoundError } from '../../../../shared/lib/utils/api-error';

export class P2PPaymentMethodService {
    static async createPaymentMethod(userId: string, data: any): Promise<P2PPaymentMethod> {
        const { currency, bankName, accountNumber, accountName, email, isPrimary } = data;

        // Validate Currency Specific Fields
        this.validateCurrencyDetails(currency, { bankName, accountNumber, accountName, email });

        // Set default bank names if not provided
        const finalBankName = bankName || this.getDefaultBank(currency);

        // If isPrimary is true, unset other primaries for this currency
        if (isPrimary) {
            await prisma.p2PPaymentMethod.updateMany({
                where: { userId, currency, isPrimary: true },
                data: { isPrimary: false },
            });
        }

        // Store additional details in JSON field
        const details: any = {};
        if (email) details.email = email;

        return await prisma.p2PPaymentMethod.create({
            data: {
                userId,
                currency,
                bankName: finalBankName,
                accountNumber: accountNumber || '', // Empty for email-based systems
                accountName,
                details,
                isPrimary: isPrimary || false,
            },
        });
    }

    static async getPaymentMethods(userId: string): Promise<P2PPaymentMethod[]> {
        return await prisma.p2PPaymentMethod.findMany({
            where: { userId, isActive: true },
            orderBy: { isPrimary: 'desc' },
        });
    }

    static async deletePaymentMethod(userId: string, methodId: string): Promise<P2PPaymentMethod> {
        const method = await prisma.p2PPaymentMethod.findFirst({
            where: { id: methodId, userId },
        });

        if (!method) {
            throw new NotFoundError('Payment method not found');
        }

        // Check if linked to active Ads
        const activeAds = await prisma.p2PAd.count({
            where: {
                paymentMethodId: methodId,
                status: { in: ['ACTIVE', 'PAUSED'] },
            },
        });

        if (activeAds > 0) {
            // Soft delete or block
            // For now, let's just deactivate it
            return await prisma.p2PPaymentMethod.update({
                where: { id: methodId },
                data: { isActive: false },
            });
        }

        return await prisma.p2PPaymentMethod.delete({
            where: { id: methodId },
        });
    }

    /**
     * Get default bank/payment system for currency
     */
    private static getDefaultBank(currency: string): string {
        switch (currency) {
            case 'CAD':
                return 'Interac';
            case 'USD':
                return 'Zelle';
            case 'GBP':
                return 'UK Bank Transfer';
            default:
                return 'Bank Transfer';
        }
    }

    /**
     * Validate currency-specific payment method details
     */
    private static validateCurrencyDetails(
        currency: string,
        data: { bankName?: string; accountNumber?: string; accountName?: string; email?: string }
    ) {
        const { accountName, accountNumber, email } = data;

        // Account name is always required
        if (!accountName || accountName.trim() === '') {
            throw new BadRequestError('Account name is required');
        }

        switch (currency) {
            case 'CAD':
                // CAD: Bank (default Interac), Account Name, Email
                if (!email || !this.isValidEmail(email)) {
                    throw new BadRequestError(
                        'Valid email is required for CAD (Interac) transfers'
                    );
                }
                break;

            case 'USD':
                // USD: Bank (default Zelle), Account Name, Email
                if (!email || !this.isValidEmail(email)) {
                    throw new BadRequestError('Valid email is required for USD (Zelle) transfers');
                }
                break;

            case 'GBP':
                // GBP: Bank, Account Name, Account Number
                if (!accountNumber || accountNumber.trim() === '') {
                    throw new BadRequestError('Account number is required for GBP transfers');
                }
                // Basic UK account number validation (8 digits)
                if (!/^\d{8}$/.test(accountNumber.replace(/\s/g, ''))) {
                    throw new BadRequestError(
                        'Invalid UK account number format (must be 8 digits)'
                    );
                }
                break;

            default:
                throw new BadRequestError(
                    `Currency ${currency} is not supported for P2P. Supported currencies: CAD, USD, GBP`
                );
        }
    }

    /**
     * Simple email validation
     */
    private static isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}
