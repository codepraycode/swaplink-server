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
            video: Express.Multer.File;
        }
    ) {
        // 1. Upload Files in Parallel
        // 1. Upload Images (Critical for initial DB record)
        const imageUploadPromises = [
            storageService.uploadFile(files.idDocumentFront, 'kyc/documents'),
            storageService.uploadFile(files.proofOfAddress, 'kyc/documents'),
            storageService.uploadFile(files.selfie, 'kyc/biometrics'),
        ];

        if (files.idDocumentBack) {
            imageUploadPromises.push(
                storageService.uploadFile(files.idDocumentBack, 'kyc/documents')
            );
        }

        const imageResults = await Promise.all(imageUploadPromises);
        const frontUrl = imageResults[0];
        const proofUrl = imageResults[1];
        const selfieUrl = imageResults[2];
        const backUrl = files.idDocumentBack ? imageResults[3] : null;

        // 2. Background Video Upload (To prevent client timeout)
        const videoUploadPromise = storageService.uploadFile(files.video, 'kyc/biometrics');
        const placeholderVideoUrl = 'PENDING_UPLOAD';

        // 2. Database Transaction
        const { idDocFront } = await prisma.$transaction(async tx => {
            // Update User Profile (Name) - Uncomment if needed
            await tx.user.update({
                where: { id: userId },
                data: {
                    kycStatus: 'PENDING', // Set status to PENDING on submission
                    avatarUrl: selfieUrl, // Update avatar with selfie
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
                    videoUrl: placeholderVideoUrl,
                    governmentId: data.governmentId.number,
                    bvn: data.bvn,
                    nin: data.nin,
                },
                update: {
                    dob: new Date(data.dateOfBirth),
                    address: data.address.street,
                    city: data.address.city,
                    state: data.address.state,
                    country: data.address.country,
                    postalCode: data.address.postalCode,
                    selfieUrl,
                    videoUrl: placeholderVideoUrl,
                    governmentId: data.governmentId.number,
                    bvn: data.bvn,
                    nin: data.nin,
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
        // 5. Handle Background Video Upload & Verification
        videoUploadPromise
            .then(async videoUrl => {
                try {
                    // Update DB with real video URL
                    await prisma.kycInfo.update({
                        where: { userId },
                        data: { videoUrl },
                    });

                    // Trigger Verification
                    await getKycQueue().add('verify-unified', {
                        userId,
                        kycDocumentId: idDocFront.id,
                        documentType: data.governmentId.type,
                        frontUrl,
                        backUrl,
                        selfieUrl,
                        videoUrl,
                        data,
                    });
                    logger.info(
                        `[KYC] Background video upload and verification queueing complete for user ${userId}`
                    );
                } catch (error) {
                    logger.error(`[KYC] Background processing failed for user ${userId}`, error);
                }
            })
            .catch(error => {
                logger.error(`[KYC] Video upload failed for user ${userId}`, error);
            });

        // 6. Emit Event
        eventBus.publish(EventType.KYC_SUBMITTED, {
            userId,
            timestamp: new Date(),
        });

        return { message: 'KYC application submitted successfully' };
    }
}

export const kycService = new KycService();
