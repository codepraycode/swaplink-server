import { PrismaClient, P2PPaymentMethod } from '../../../../shared/database/generated/prisma';
import { prisma } from '../../../../shared/database';
import { BadRequestError, NotFoundError } from '../../../../shared/lib/utils/api-error';

export class P2PPaymentMethodService {
    static async createPaymentMethod(userId: string, data: any) {
        const { currency, bankName, accountNumber, accountName, details, isPrimary } = data;

        // Validate Currency Specific Fields
        this.validateCurrencyDetails(currency, details);

        // If isPrimary is true, unset other primaries for this currency
        if (isPrimary) {
            await prisma.p2PPaymentMethod.updateMany({
                where: { userId, currency, isPrimary: true },
                data: { isPrimary: false },
            });
        }

        return await prisma.p2PPaymentMethod.create({
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

    static async getPaymentMethods(userId: string) {
        return await prisma.p2PPaymentMethod.findMany({
            where: { userId, isActive: true },
            orderBy: { isPrimary: 'desc' },
        });
    }

    static async deletePaymentMethod(userId: string, methodId: string) {
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

    private static validateCurrencyDetails(currency: string, details: any) {
        if (!details) throw new BadRequestError('Bank details are required');

        switch (currency) {
            case 'USD':
                if (!details.routingNumber)
                    throw new BadRequestError('Routing Number is required for USD');
                break;
            case 'EUR':
                if (!details.iban) throw new BadRequestError('IBAN is required for EUR');
                // BIC/SWIFT optional or required? Plan says BIC/SWIFT.
                if (!details.bic) throw new BadRequestError('BIC/SWIFT is required for EUR');
                break;
            case 'GBP':
                if (!details.sortCode) throw new BadRequestError('Sort Code is required for GBP');
                break;
            case 'CAD':
                if (!details.institutionNumber)
                    throw new BadRequestError('Institution Number is required for CAD');
                if (!details.transitNumber)
                    throw new BadRequestError('Transit Number is required for CAD');
                break;
            default:
                // No specific validation for others or throw error?
                // Let's allow others but maybe warn?
                // For now, strict on supported currencies.
                if (!['USD', 'EUR', 'GBP', 'CAD'].includes(currency)) {
                    throw new BadRequestError(`Currency ${currency} is not supported for P2P`);
                }
        }
    }
}
