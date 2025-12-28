import { prisma, P2PPaymentMethod } from '../../../shared/database';
import { BadRequestError, NotFoundError } from '../../../shared/lib/utils/api-error';

export class P2PPaymentMethodService {
    /**
     * Create a new payment method.
     * Validates the details JSON based on the currency.
     */
    async createPaymentMethod(
        userId: string,
        data: {
            currency: string;
            bankName: string;
            accountNumber: string;
            accountName: string;
            details: any;
            isPrimary?: boolean;
        }
    ): Promise<P2PPaymentMethod> {
        const { currency, bankName, accountNumber, accountName, details, isPrimary } = data;

        // Validate details based on currency
        this.validatePaymentDetails(currency, details);

        // If primary, unset other primary methods for this currency
        if (isPrimary) {
            await prisma.p2PPaymentMethod.updateMany({
                where: { userId, currency, isPrimary: true },
                data: { isPrimary: false },
            });
        }

        return prisma.p2PPaymentMethod.create({
            data: {
                userId,
                currency,
                bankName,
                accountNumber,
                accountName,
                details,
                isPrimary: isPrimary || false,
            },
        });
    }

    /**
     * Get all payment methods for a user.
     */
    async getUserPaymentMethods(userId: string): Promise<P2PPaymentMethod[]> {
        return prisma.p2PPaymentMethod.findMany({
            where: { userId, isActive: true },
            orderBy: { isPrimary: 'desc' },
        });
    }

    /**
     * Get a specific payment method.
     */
    async getPaymentMethod(id: string, userId: string): Promise<P2PPaymentMethod> {
        const method = await prisma.p2PPaymentMethod.findUnique({
            where: { id },
        });

        if (!method || method.userId !== userId) {
            throw new NotFoundError('Payment method not found');
        }

        return method;
    }

    /**
     * Delete (soft delete) a payment method.
     */
    async deletePaymentMethod(id: string, userId: string): Promise<void> {
        const method = await this.getPaymentMethod(id, userId);

        await prisma.p2PPaymentMethod.update({
            where: { id: method.id },
            data: { isActive: false },
        });
    }

    /**
     * Validate dynamic payment details.
     */
    private validatePaymentDetails(currency: string, details: any) {
        if (!details) throw new BadRequestError('Payment details are required');

        switch (currency.toUpperCase()) {
            case 'USD':
                if (!details.routingNumber && !details.swiftCode) {
                    throw new BadRequestError('USD requires Routing Number or SWIFT Code');
                }
                break;
            case 'GBP':
                if (!details.sortCode) {
                    throw new BadRequestError('GBP requires Sort Code');
                }
                break;
            case 'EUR':
                if (!details.iban) {
                    throw new BadRequestError('EUR requires IBAN');
                }
                break;
            case 'CAD':
                if (!details.transitNumber || !details.institutionNumber) {
                    throw new BadRequestError('CAD requires Transit and Institution Number');
                }
                break;
            default:
                // Generic validation or allow any for unknown currencies
                break;
        }
    }
}

export const p2pPaymentMethodService = new P2PPaymentMethodService();
