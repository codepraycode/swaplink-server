import { storageService } from '../../../../shared/lib/services/storage.service';
import { KycDocumentStatus, prisma } from '../../../../shared/database';
import { eventBus, EventType } from '../../../../shared/lib/events/event-bus';
import logger from '../../../../shared/lib/utils/logger';
import { SubmitKycUnifiedDto } from './kyc.dto';
import { getKycQueue } from '../../../../shared/lib/init/service-initializer';

class KycService {
    /**
     * Unified KYC Submission
     */
    async submitKycUnified(
        userId: string,
        data: SubmitKycUnifiedDto,
        files: {
            idDocumentFront: Express.Multer.File;
            idDocumentBack?: Express.Multer.File;
            proofOfAddress: Express.Multer.File;
            selfie: Express.Multer.File;
        }
    ) {
        // 1. Upload Files in Parallel
        const uploadPromises = [
            storageService.uploadFile(files.idDocumentFront, 'kyc/documents'),
            storageService.uploadFile(files.proofOfAddress, 'kyc/documents'),
            storageService.uploadFile(files.selfie, 'kyc/biometrics'),
        ];

        if (files.idDocumentBack) {
            uploadPromises.push(storageService.uploadFile(files.idDocumentBack, 'kyc/documents'));
        }

        const results = await Promise.all(uploadPromises);
        const frontUrl = results[0];
        const proofUrl = results[1];
        const selfieUrl = results[2];
        const backUrl = files.idDocumentBack ? results[3] : null;

        // 2. Database Transaction
        const { idDocFront } = await prisma.$transaction(async tx => {
            // Update User Profile (Name) - Uncomment if needed
            await tx.user.update({
                where: { id: userId },
                data: {
                    kycStatus: 'PENDING', // Set status to PENDING on submission
                },
            });

            // Create/Update KYC Info
            const kycInfo = await tx.kycInfo.upsert({
                where: { userId },
                create: {
                    userId,
                    dob: new Date(data.dateOfBirth),
                    address: data.address.street,
                    city: data.address.city,
                    state: data.address.state,
                    country: data.address.country,
                    postalCode: data.address.postalCode,
                    selfieUrl,
                    governmentId: data.governmentId.number,
                },
                update: {
                    dob: new Date(data.dateOfBirth),
                    address: data.address.street,
                    city: data.address.city,
                    state: data.address.state,
                    country: data.address.country,
                    postalCode: data.address.postalCode,
                    selfieUrl,
                    governmentId: data.governmentId.number,
                },
            });

            // Create KYC Documents
            // ID Document Front
            const idDocFront = await tx.kycDocument.create({
                data: {
                    kycInfoId: kycInfo.id,
                    documentType: data.governmentId.type,
                    documentUrl: frontUrl,
                    status: KycDocumentStatus.PENDING,
                },
            });

            // ID Document Back (if exists)
            if (backUrl) {
                await tx.kycDocument.create({
                    data: {
                        kycInfoId: kycInfo.id,
                        documentType: `${data.governmentId.type}_BACK`,
                        documentUrl: backUrl,
                        status: KycDocumentStatus.PENDING,
                    },
                });
            }

            // Proof of Address
            await tx.kycDocument.create({
                data: {
                    kycInfoId: kycInfo.id,
                    documentType: 'PROOF_OF_ADDRESS',
                    documentUrl: proofUrl,
                    status: KycDocumentStatus.PENDING,
                },
            });

            return { kycInfo, idDocFront };
        });

        // 5. Trigger Verification
        try {
            await getKycQueue().add('verify-unified', {
                userId,
                kycDocumentId: idDocFront.id,
                documentType: data.governmentId.type,
                frontUrl,
                backUrl,
                selfieUrl,
                data,
            });
            logger.info(`[KYC] Queued unified verification job for user ${userId}`);
        } catch (error) {
            logger.error(`[KYC] Failed to queue verification job:`, error);
        }

        // 6. Emit Event
        eventBus.publish(EventType.KYC_SUBMITTED, {
            userId,
            timestamp: new Date(),
        });

        return { message: 'KYC application submitted successfully' };
    }
}

export const kycService = new KycService();
