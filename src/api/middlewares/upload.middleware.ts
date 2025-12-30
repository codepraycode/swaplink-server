import multer, { FileFilterCallback } from 'multer';
import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../../shared/lib/utils/api-error';
import { uploadConfig } from '../../shared/config/upload.config';

// ======================================================
// 1. Storage Strategy
// ======================================================

/**
 * We ALWAYS use Memory Storage here.
 * The decision to save to Disk (Dev) or Cloud (Prod) is handled
 * by the StorageService, not Multer.
 * This gives us a unified interface (Buffer) to work with.
 */
const storage = multer.memoryStorage();

// ======================================================
// 2. Filter Logic
// ======================================================

const createFilter = (allowedMimeTypes: string[]) => {
    return (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            // Reject file
            cb(
                new BadRequestError(
                    `Invalid file type. Allowed: ${allowedMimeTypes
                        .map(t => t.split('/')[1])
                        .join(', ')}`
                ) as any
            );
        }
    };
};

// ======================================================
// 3. Exported Uploaders
// ======================================================

/**
 * Profile Picture Uploader
 * - Allows JPG, PNG (No PDF)
 * - Max 2MB
 */
export const uploadAvatar = multer({
    storage: storage,
    limits: {
        fileSize: uploadConfig.avatar.maxSize,
        files: 1,
    },
    fileFilter: createFilter(uploadConfig.avatar.allowedMimeTypes),
});

/**
 * Chat proof of payment uploader
 * - Allows JPG, PNG, (No PDF)
 * - Max 2MB
 */
export const uploadProof = multer({
    storage: storage,
    limits: {
        fileSize: uploadConfig.proof.maxSize,
        files: 1,
    },
    fileFilter: createFilter(uploadConfig.proof.allowedMimeTypes),
});

/**
 * Unified KYC Uploader
 * - Handles ID Documents (Front/Back), Proof of Address, and Selfie
 */
export const uploadKycUnified: any = multer({
    storage: storage,
    limits: {
        fileSize: uploadConfig.kyc.maxSize, // Using KYC max size for all
    },
    fileFilter: (req, file, cb) => {
        if (['idDocumentFront', 'idDocumentBack', 'proofOfAddress'].includes(file.fieldname)) {
            createFilter(uploadConfig.kyc.allowedMimeTypes)(req, file, cb);
        } else if (file.fieldname === 'selfie') {
            createFilter(uploadConfig.avatar.allowedMimeTypes)(req, file, cb);
        } else {
            cb(new BadRequestError(`Unexpected field: ${file.fieldname}`) as any);
        }
    },
}).fields([
    { name: 'idDocumentFront', maxCount: 1 },
    { name: 'idDocumentBack', maxCount: 1 },
    { name: 'proofOfAddress', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
]);

// ======================================================
// 4. Error Handler Wrapper (Optional but Recommended)
// ======================================================
// Multer throws generic errors (like "File too large").
// This wraps them into your nice API Error format.

export const handleUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new BadRequestError('File is too large. Please upload a smaller file.'));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(
                new BadRequestError(
                    `Too many files or invalid field name${err.field ? ` (${err.field})` : ''}.`
                )
            );
        }
    }
    next(err);
};
