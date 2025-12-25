import { storageService } from '../../../../shared/lib/services/storage.service';
import { kycProvider } from './kyc.provider';
import { KycDocumentStatus, KycLevel, KycStatus, prisma } from '../../../../shared/database';
import { BadRequestError } from '../../../../shared/lib/utils/api-error';
import { eventBus, EventType } from '../../../../shared/lib/events/event-bus';
import logger from '../../../../shared/lib/utils/logger';
import { SubmitKycInfoDto } from './kyc.dto';
import { getBankingQueue } from '../../../../shared/lib/init/service-initializer';

class KycService {
    /**
     * Submit a KYC Document (ID, Passport, Liveness Video/Photo)
     */
    async submitKycDocument(userId: string, file: Express.Multer.File, documentType: string) {
        // 1. Upload file
        const documentUrl = await storageService.uploadFile(file, 'kyc');

        // 2. Ensure KycInfo exists
        const kycInfo = await prisma.kycInfo.upsert({
            where: { userId },
            create: { userId },
            update: {},
        });

        // 3. Create KYC Document record
        await prisma.kycDocument.create({
            data: {
                kycInfoId: kycInfo.id,
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

        // 3. Update User Name & Upgrade to INTERMEDIATE
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                firstName: kycData.firstName,
                lastName: kycData.lastName,
                kycLevel: KycLevel.INTERMEDIATE, // Upgrade to Intermediate
            },
            include: { wallet: true },
        });

        // 4. Dispatch Account Provisioning Job
        if (updatedUser.wallet) {
            try {
                await getBankingQueue().add('create-virtual-account', {
                    userId: updatedUser.id,
                    walletId: updatedUser.wallet.id,
                });
                logger.info(`[KYC] Dispatched account provisioning for ${userId}`);
            } catch (error) {
                logger.error(`[KYC] Failed to dispatch account provisioning for ${userId}`, error);
            }
        } else {
            logger.warn(`[KYC] User ${userId} has no wallet, skipping account provisioning`);
        }

        // 5. Check Completeness (for FULL upgrade)
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

        const [bvnAttempt, kycInfo] = await Promise.all([
            prisma.kycAttempt.findFirst({
                where: { userId, status: 'SUCCESS' }, // Assuming successful attempt means BVN verified
            }),
            prisma.kycInfo.findUnique({
                where: { userId },
                include: {
                    documents: {
                        where: {
                            documentType: { in: ['ID_CARD', 'PASSPORT', 'NIN'] },
                        },
                    },
                },
            }),
        ]);

        const idDoc = kycInfo?.documents?.[0];

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

    async submitKycInfo(userId: string, dto: SubmitKycInfoDto) {
        const { dob, address, city, state, country, postalCode, bvn, nin } = dto;

        // Create or Update KycInfo
        const kycInfo = await prisma.kycInfo.upsert({
            where: { userId },
            create: {
                userId,
                dob: new Date(dob),
                address,
                city,
                state,
                country,
                postalCode,
                bvn,
                nin,
            },
            update: {
                dob: new Date(dob),
                address,
                city,
                state,
                country,
                postalCode,
                bvn,
                nin,
            },
        });

        return kycInfo;
    }

    async updateBiometrics(userId: string, selfieUrl?: string, videoUrl?: string) {
        const data: any = {};
        if (selfieUrl) data.selfieUrl = selfieUrl;
        if (videoUrl) data.videoUrl = videoUrl;

        const kycInfo = await prisma.kycInfo.upsert({
            where: { userId },
            create: {
                userId,
                ...data,
            },
            update: data,
        });

        return kycInfo;
    }
}

export const kycService = new KycService();
