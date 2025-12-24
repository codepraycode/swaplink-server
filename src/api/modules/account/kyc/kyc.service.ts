import { storageService } from '../../../../shared/lib/services/storage.service';
import { kycProvider } from './kyc.provider';
import { KycDocumentStatus, KycLevel, KycStatus, prisma } from '../../../../shared/database';
import { BadRequestError } from '../../../../shared/lib/utils/api-error';
import { eventBus, EventType } from '../../../../shared/lib/events/event-bus';
import logger from '../../../../shared/lib/utils/logger';

class KycService {
    /**
     * Tier 1: Basic Verification (File Upload)
     */
    async submitTier1(userId: string, file: Express.Multer.File, documentType: string) {
        // 1. Upload file
        const documentUrl = await storageService.uploadFile(file, 'kyc');

        // 2. Create KYC Document record & 3. Update User Status (Atomic Transaction)
        await prisma.$transaction(async tx => {
            await tx.kycDocument.create({
                data: {
                    userId,
                    documentType,
                    documentUrl,
                    status: KycDocumentStatus.PENDING,
                },
            });

            await tx.user.update({
                where: { id: userId },
                data: { kycStatus: KycStatus.PENDING },
            });
        });

        // 4. Emit Event (Listener handles Notification & Admin Alert)
        eventBus.publish(EventType.KYC_SUBMITTED, {
            userId,
            documentType,
            timestamp: new Date(),
        });

        return { message: 'Documents submitted successfully' };
    }

    /**
     * Tier 2: Full Verification (BVN)
     */
    async verifyTier2(userId: string, bvn: string) {
        // 1. Verify BVN with Provider
        let kycData;
        try {
            kycData = await kycProvider.verifyBVN(bvn);
        } catch (error) {
            // Log attempt failure
            await prisma.kycAttempt.create({
                data: {
                    userId,
                    providerRef: 'MOCK_REF',
                    rawResponse: { error: (error as Error).message },
                    status: 'FAILED',
                },
            });
            throw new BadRequestError('BVN Verification Failed');
        }

        // 2. Log Successful Attempt
        await prisma.kycAttempt.create({
            data: {
                userId,
                providerRef: 'MOCK_REF',
                rawResponse: kycData as any,
                status: 'SUCCESS',
            },
        });

        // 3. Upgrade User to Tier 2 (FULL)
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                kycLevel: KycLevel.FULL,
                kycStatus: KycStatus.APPROVED,
                firstName: kycData.firstName, // Sync name from BVN (optional, but good practice)
                lastName: kycData.lastName,
            },
        });

        // 4. Emit Event
        eventBus.publish(EventType.KYC_APPROVED, {
            userId,
            level: KycLevel.FULL,
            timestamp: new Date(),
        });

        logger.info(`[KYC] User ${userId} upgraded to Tier 2`);

        return { message: 'BVN Verified. Account Upgraded.', user: updatedUser };
    }
}

export const kycService = new KycService();
