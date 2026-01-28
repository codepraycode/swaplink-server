import path from 'path';

export function isEmpty(data: any) {
    return !data;
}

export function formatUserInfo(user: any) {
    const { password: _, wallet, kycInfo, ...userWithoutPassword } = user;

    // Format KYC information with all details including document URLs
    const kycDetails = kycInfo
        ? {
              dob: kycInfo.dob,
              address: kycInfo.address,
              city: kycInfo.city,
              state: kycInfo.state,
              country: kycInfo.country,
              postalCode: kycInfo.postalCode,
              bvn: kycInfo.bvn,
              nin: kycInfo.nin,
              governmentId: kycInfo.governmentId,
              selfieUrl: kycInfo.selfieUrl,
              videoUrl: kycInfo.videoUrl,
              // Map documents array to include all document details
              documents: kycInfo.documents
                  ? kycInfo.documents.map((doc: any) => ({
                        id: doc.id,
                        documentType: doc.documentType,
                        documentUrl: doc.documentUrl,
                        status: doc.status,
                        rejectionReason: doc.rejectionReason,
                        verifiedAt: doc.verifiedAt,
                        createdAt: doc.createdAt,
                    }))
                  : [],
          }
        : null;

    return {
        ...userWithoutPassword,
        kyc: kycDetails,
        wallet: wallet
            ? {
                  id: wallet.id,
                  balance: Number(wallet.balance),
                  lockedBalance: Number(wallet.lockedBalance),
                  accountNumber: wallet.virtualAccount?.accountNumber,
                  bankName: wallet.virtualAccount?.bankName,
                  accountName: wallet.virtualAccount?.accountName,
              }
            : null,
    };
}

/**
 * Delays the execution of the code for the specified number of seconds.
 * @param seconds The number of seconds to delay.
 * @returns A promise that resolves after the specified number of seconds.
 */
export function delay(seconds: number) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

/**
 * Converts a string into a URL-friendly slug.
 */
export const slugify = (text: string): string => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '') // This line removes the "." in extensions
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

/**
 * Specifically for files: Slugs the name but preserves the extension.
 * Example: "My Photo @2025.JPG" -> "my-photo-2025.jpg"
 */
export const slugifyFilename = (filename: string): string => {
    const extension = path.extname(filename); // .jpg
    const nameOnly = path.basename(filename, extension); // My Photo @2025

    return `${slugify(nameOnly)}${extension.toLowerCase()}`;
};
