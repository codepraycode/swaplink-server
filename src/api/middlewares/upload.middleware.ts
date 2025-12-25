import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { BadRequestError } from '../../shared/lib/utils/api-error';
import { uploadConfig } from '../../shared/config/upload.config';
import { envConfig } from '../../shared/config/env.config';
import path from 'path';
import fs from 'fs';

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
 * KYC Document Uploader
 * - Allows PDF, JPG, PNG
 * - Max 5MB
 */
export const uploadKyc = multer({
    storage: storage,
    limits: {
        fileSize: uploadConfig.kyc.maxSize,
        files: 1, // Max 1 file per field
    },
    fileFilter: createFilter(uploadConfig.kyc.allowedMimeTypes),
});

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
 * Biometrics Uploader
 * - Selfie (Image)
 * - Video (Video)
 */
export const uploadBiometrics = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB for video? Adjust as needed.
        files: 2,
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'selfie') {
            createFilter(uploadConfig.avatar.allowedMimeTypes)(req, file, cb);
        } else if (file.fieldname === 'video') {
            createFilter(['video/mp4', 'video/webm', 'video/quicktime'])(req, file, cb);
        } else {
            cb(new BadRequestError('Invalid field name') as any);
        }
    },
});

// ======================================================
// 4. Error Handler Wrapper (Optional but Recommended)
// ======================================================
// Multer throws generic errors (like "File too large").
// This wraps them into your nice API Error format.

export const handleUploadError = (err: any, next: any) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new BadRequestError('File is too large. Please upload a smaller file.'));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new BadRequestError('Too many files or invalid field name.'));
        }
    }
    next(err);
};
