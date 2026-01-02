import { envConfig } from '../../../config/env.config';
import logger from '../../utils/logger';
import { IStorageService } from './cloudinary-storage.service';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { S3StorageService } from './s3-storage.service';
import { LocalStorageService } from './local-storage.service';

export class StorageServiceFactory {
    static create(): IStorageService {
        const isProduction = envConfig.NODE_ENV === 'production';
        const isStaging = process.env.STAGING === 'true' || envConfig.NODE_ENV === 'staging';

        // 1. Production/Staging: Use Cloudinary if configured (Primary)
        if ((isProduction || isStaging) && envConfig.CLOUDINARY_CLOUD_NAME) {
            try {
                logger.info('🚀 Initializing Cloudinary Storage Service');
                return new CloudinaryStorageService();
            } catch (error) {
                logger.error('Failed to initialize CloudinaryStorageService, trying S3...', error);
            }
        }

        // 2. Fallback: Use S3-compatible storage if Cloudinary not available
        if ((isProduction || isStaging) && envConfig.AWS_ACCESS_KEY_ID) {
            try {
                logger.info('🔄 Fallback: Initializing S3 Storage Service');
                return new S3StorageService();
            } catch (error) {
                logger.error(
                    'Failed to initialize S3StorageService, falling back to LocalStorage',
                    error
                );
            }
        }

        // 3. Development/Fallback: Use Local Storage
        logger.info('💻 Development mode: Using Local Storage Service');
        return new LocalStorageService();
    }
}

export const storageService = StorageServiceFactory.create();
