import { delay } from '../../../../shared/lib/utils/functions';
import logger from '../../../../shared/lib/utils/logger';

export interface KYCData {
    firstName: string;
    lastName: string;
    dob: string;
    phone: string;
    bvn: string;
    photoUrl?: string;
}

export interface IDDetails {
    idNumber: string;
    firstName: string;
    lastName: string;
    expiryDate?: string;
}

export interface IKYCProvider {
    verifyBVN(bvn: string): Promise<KYCData>;
    verifyLiveness(videoUrl: string, photoUrl: string): Promise<boolean>;
    extractIDData(idImageUrl: string): Promise<IDDetails>;
}

export class MockKYCProvider implements IKYCProvider {
    async verifyBVN(bvn: string): Promise<KYCData> {
        logger.info(`[MockKYC] Verifying BVN: ${bvn}`);
        // Simulate API call delay
        await delay(2);

        if (bvn === '00000000000') {
            throw new Error('Invalid BVN');
        }

        return {
            firstName: 'John',
            lastName: 'Doe',
            dob: '1990-01-01',
            phone: '08012345678',
            bvn,
        };
    }

    async verifyLiveness(videoUrl: string, photoUrl: string): Promise<boolean> {
        logger.info(`[MockKYC] Verifying Liveness: Video=${videoUrl}, Photo=${photoUrl}`);

        await delay(2);
        return true;
    }

    async extractIDData(idImageUrl: string): Promise<IDDetails> {
        logger.info(`[MockKYC] Extracting ID Data: ${idImageUrl}`);
        await delay(2);
        return {
            idNumber: 'A00000000',
            firstName: 'John',
            lastName: 'Doe',
            expiryDate: '2030-01-01',
        };
    }
}

export const kycProvider = new MockKYCProvider();
