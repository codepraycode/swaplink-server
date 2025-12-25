import { storageService } from '../../../../shared/lib/services/storage.service';
import { kycProvider } from './kyc.provider';
import { KycDocumentStatus, KycLevel, KycStatus, prisma } from '../../../../shared/database';
import { BadRequestError } from '../../../../shared/lib/utils/api-error';
import { eventBus, EventType } from '../../../../shared/lib/events/event-bus';
import logger from '../../../../shared/lib/utils/logger';

class KycService {
    /**
     * Submit a KYC Document (ID, Passport, Liveness Video/Photo)
     */
    async submitKycDocument(userId: string, file: Express.Multer.File, documentType: string) {
        // 1. Upload file
        const documentUrl = await storageService.uploadFile(file, 'kyc');

        // 2. Create KYC Document record
        await prisma.kycDocument.create({
            data: {
                userId,
                documentType,
                documentUrl,
                status: KycDocumentStatus.PENDING,
            },
        });

        // 3. Trigger Verification (Async)
        // In a real system, this might be a background job.
        // For now, we'll do a simple check or just leave it PENDING for admin/provider.
        if (documentType === 'ID_CARD' || documentType === 'PASSPORT') {
            try {
                const idData = await kycProvider.extractIDData(documentUrl);
                logger.info(`[KYC] Extracted ID Data for ${userId}:`, idData);
                // Auto-approve if data matches user? For now, just log.
            } catch (error) {
                logger.error(`[KYC] Failed to extract ID data:`, error);
            }
        }

        // 4. Check Completeness
        await this.checkCompleteness(userId);

        // 5. Emit Event
        eventBus.publish(EventType.KYC_SUBMITTED, {
            userId,
            documentType,
            timestamp: new Date(),
        });

        return { message: 'Document submitted successfully' };
    }

    /**
     * Verify BVN
     */
    async verifyBvn(userId: string, bvn: string) {
        // 1. Verify BVN with Provider
        let kycData;
        try {
            kycData = await kycProvider.verifyBVN(bvn);
        } catch (error) {
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

        // 3. Update User Name (Optional, but good for consistency)
        await prisma.user.update({
            where: { id: userId },
            data: {
                firstName: kycData.firstName,
                lastName: kycData.lastName,
            },
        });

        // 4. Check Completeness
        await this.checkCompleteness(userId);

        return { message: 'BVN Verified successfully' };
    }

    /**
     * Check if User has completed all KYC requirements
     */
    private async checkCompleteness(userId: string) {
        // Requirements for FULL KYC:
        // 1. BVN Verified (Successful KycAttempt)
        // 2. ID Document Uploaded (KycDocument)
        // 3. Liveness Check (Optional for now, or implied by ID upload in this simple flow)

        const [bvnAttempt, idDoc] = await Promise.all([
            prisma.kycAttempt.findFirst({
                where: { userId, status: 'SUCCESS' }, // Assuming successful attempt means BVN verified
            }),
            prisma.kycDocument.findFirst({
                where: {
                    userId,
                    documentType: { in: ['ID_CARD', 'PASSPORT', 'NIN'] },
                },
            }),
        ]);

        if (bvnAttempt && idDoc) {
            // Upgrade to FULL
            await prisma.user.update({
                where: { id: userId },
                data: {
                    kycLevel: KycLevel.FULL,
                    kycStatus: KycStatus.APPROVED,
                },
            });

            eventBus.publish(EventType.KYC_APPROVED, {
                userId,
                level: KycLevel.FULL,
                timestamp: new Date(),
            });

            logger.info(`[KYC] User ${userId} upgraded to FULL KYC`);
        }
    }
}

export const kycService = new KycService();
