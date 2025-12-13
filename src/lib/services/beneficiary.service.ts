import { prisma } from '../../database';

export interface CreateBeneficiaryDto {
    userId: string;
    accountNumber: string;
    accountName: string;
    bankCode: string;
    bankName: string;
    isInternal: boolean;
    avatarUrl?: string;
}

export class BeneficiaryService {
    /**
     * Save a new beneficiary
     */
    async createBeneficiary(data: CreateBeneficiaryDto) {
        const { userId, accountNumber, bankCode } = data;

        // Check if already exists
        const existing = await prisma.beneficiary.findUnique({
            where: {
                userId_accountNumber_bankCode: {
                    userId,
                    accountNumber,
                    bankCode,
                },
            },
        });

        if (existing) {
            // Update last used (updatedAt)
            return await prisma.beneficiary.update({
                where: { id: existing.id },
                data: { updatedAt: new Date() },
            });
        }

        return await prisma.beneficiary.create({
            data,
        });
    }

    /**
     * Get user beneficiaries (Recent first)
     */
    async getBeneficiaries(userId: string) {
        return await prisma.beneficiary.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            take: 20, // Limit to recent 20
        });
    }
}

export const beneficiaryService = new BeneficiaryService();
