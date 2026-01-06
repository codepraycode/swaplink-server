export interface KYCVerificationResult {
    success: boolean;
    data?: any;
    error?: string;
    providerRef?: string;
}

export interface KYCVerificationInterface {
    verifyDocument(
        userId: string,
        documentType: string,
        documentUrl: string
    ): Promise<KYCVerificationResult>;
    verifyIdentity(
        userId: string,
        data: {
            bvn?: string;
            nin?: string;
            videoUrl?: string;
            [key: string]: any;
        }
    ): Promise<KYCVerificationResult>;
}
