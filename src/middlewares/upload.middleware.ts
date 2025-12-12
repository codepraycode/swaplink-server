import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { BadRequestError } from '../lib/utils/api-error';
import { uploadConfig } from '../config/upload.config';
import { envConfig } from '../config/env.config';
import path from 'path';
import fs from 'fs';

// ======================================================
// 1. Storage Strategy (Dev vs Prod)
// ======================================================

/**
 * PRODUCTION: Memory Storage
 * We keep the file in Buffer (RAM) so we can stream it directly
 * to S3/Cloudinary/Azure without writing to the insecure server disk.
 */
const memoryStorage = multer.memoryStorage();

/**
 * DEVELOPMENT: Disk Storage
 * Saves files locally to 'uploads/' for easy debugging without internet.
 */
const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/temp';
        // Ensure directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: fieldname-timestamp-random.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});

// Select storage based on environment
// For Fintech, ALWAYS use memory/cloud storage in production.
const storage = envConfig.NODE_ENV === 'production' ? memoryStorage : diskStorage;

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
