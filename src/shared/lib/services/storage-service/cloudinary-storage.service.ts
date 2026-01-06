import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { envConfig } from '../../../config/env.config';
import logger from '../../utils/logger';
import { slugifyFilename } from '../../utils/functions';

export interface IStorageService {
    uploadFile(file: Express.Multer.File, folder?: string): Promise<string>;
}

export class CloudinaryStorageService implements IStorageService {
    constructor() {
        if (!envConfig.CLOUDINARY_CLOUD_NAME) {
            throw new Error('CLOUDINARY_CLOUD_NAME is required');
        }
        if (!envConfig.CLOUDINARY_API_KEY) {
            throw new Error('CLOUDINARY_API_KEY is required');
        }
        if (!envConfig.CLOUDINARY_API_SECRET) {
            throw new Error('CLOUDINARY_API_SECRET is required');
        }

        cloudinary.config({
            cloud_name: envConfig.CLOUDINARY_CLOUD_NAME,
            api_key: envConfig.CLOUDINARY_API_KEY,
            api_secret: envConfig.CLOUDINARY_API_SECRET,
            secure: true,
        });

        logger.info('✅ Using Cloudinary Storage Service');
        logger.info(`☁️  Cloud Name: ${envConfig.CLOUDINARY_CLOUD_NAME}`);
    }

    async uploadFile(file: Express.Multer.File, folder: string = 'uploads'): Promise<string> {
        try {
            const safeName = slugifyFilename(file.originalname);
            const timestamp = Date.now();
            const random = Math.round(Math.random() * 1e9);
            const publicId = `${folder}/${timestamp}-${random}-${safeName.replace(
                /\.[^/.]+$/,
                ''
            )}`;

            logger.info(`[Cloudinary] Uploading file: ${publicId}`);

            // Determine resource type
            const isVideo = file.mimetype.startsWith('video/') || file.mimetype === 'image/mp4';
            const resourceType = isVideo ? 'video' : 'image';

            // Upload to Cloudinary
            const result: UploadApiResponse = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: folder,
                        public_id: publicId,
                        resource_type: resourceType,
                        use_filename: true,
                        unique_filename: false,
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result as UploadApiResponse);
                    }
                );

                uploadStream.end(file.buffer);
            });

            logger.info(`[Cloudinary] ✅ File uploaded successfully. URL: ${result.secure_url}`);

            return result.secure_url;
        } catch (error: unknown) {
            logger.error('[Cloudinary] Upload Error:', error);

            const errorMessage =
                error && typeof error === 'object' && 'message' in error
                    ? (error as { message: string }).message
                    : 'Unknown error';

            throw new Error(`Cloudinary upload failed: ${errorMessage}`);
        }
    }
}
