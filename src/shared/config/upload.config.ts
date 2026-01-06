export const uploadConfig = {
    // 5MB for KYC (High res IDs/Passports need detail)
    kyc: {
        maxSize: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
        fieldName: 'document',
    },
    // 2MB for Avatars (No need for 4k profile pics)
    avatar: {
        maxSize: 2 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg'],
        fieldName: 'avatar',
    },
    // 5MB for Proof of Payment (No need for 4k profile pics)
    proof: {
        maxSize: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg'],
        fieldName: 'proof',
    },
    // 50MB for Video (Liveness check)
    video: {
        maxSize: 50 * 1024 * 1024,
        allowedMimeTypes: [
            'video/mp4',
            'video/webm',
            'video/quicktime',
            'video/3gpp',
            'image/mp4', // Handle potential client-side mime type confusion
        ],
        fieldName: 'video',
    },
};
