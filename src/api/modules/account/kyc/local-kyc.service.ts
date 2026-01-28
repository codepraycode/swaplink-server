import {
    KYCVerificationInterface,
    KYCVerificationResult,
} from '../../../../shared/lib/interfaces/kyc-verification.interface';
import logger from '../../../../shared/lib/utils/logger';

export class LocalKYCService implements KYCVerificationInterface {
    async verifyDocument(
        userId: string,
        documentType: string,
        documentUrl: string
    ): Promise<KYCVerificationResult> {
        logger.info(
            `[LocalKYCService] Simulating document verification for user ${userId}, type: ${documentType}`
        );

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Simulate success (you can add logic to fail based on specific userIds if needed)
        return {
            success: true,
            data: {
                verified: true,
                documentType,
                extractedName: 'Simulated User',
            },
            providerRef: `SIM-${Date.now()}`,
        };
    }

    async verifyIdentity(userId: string, data: any): Promise<KYCVerificationResult> {
        logger.info(`[LocalKYCService] Simulating identity verification for user ${userId}`);

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        return {
            success: true,
            data: {
                verified: true,
                riskScore: 0,
            },
            providerRef: `SIM-ID-${Date.now()}`,
        };
    }
    async verifyUnified(
        userId: string,
        data: {
            frontUrl: string;
            backUrl?: string;
            selfieUrl: string;
            documentType: string;
        }
    ): Promise<KYCVerificationResult> {
        logger.info(`[LocalKYCService] Simulating unified verification for user ${userId}`);

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 3000));

        // In a real scenario, we would verify all documents here.
        // For simulation, we assume success if all required fields are present.

        if (!data.frontUrl || !data.selfieUrl) {
            return {
                success: false,
                error: 'Missing required documents (Front ID or Selfie)',
                providerRef: `SIM-UNIFIED-${Date.now()}`,
            };
        }

        return {
            success: true,
            data: {
                verified: true,
                documentType: data.documentType,
                faceMatch: true,
                liveness: true,
            },
            providerRef: `SIM-UNIFIED-${Date.now()}`,
        };
    }
}
