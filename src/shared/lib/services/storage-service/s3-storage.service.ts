import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { envConfig } from '../../../config/env.config';
import logger from '../../utils/logger';
import { slugifyFilename } from '../../utils/functions';
import { IStorageService } from './cloudinary-storage.service';

export class S3StorageService implements IStorageService {
    private s3Client: S3Client;
    private bucketName: string;

    constructor() {
        this.s3Client = new S3Client({
            region: envConfig.AWS_REGION,
            endpoint: envConfig.AWS_ENDPOINT,
            credentials: {
                accessKeyId: envConfig.AWS_ACCESS_KEY_ID,
                secretAccessKey: envConfig.AWS_SECRET_ACCESS_KEY,
            },
            forcePathStyle: true,
        });
        this.bucketName = envConfig.AWS_BUCKET_NAME;

        logger.info('✅ Using S3-Compatible Storage Service');
        logger.info(`🪣 Bucket: ${this.bucketName}`);
    }

    async uploadFile(file: Express.Multer.File, folder: string = 'uploads'): Promise<string> {
        try {
            const safeName = slugifyFilename(file.originalname);
            const fileName = `${folder}/${Date.now()}-${Math.round(
                Math.random() * 1e9
            )}-${safeName}`;

            logger.info(`[S3] Uploading file: ${fileName}`);

            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: fileName,
                Body: file.buffer,
                ContentType: file.mimetype,
                ContentDisposition: 'inline',
                ACL: 'public-read',
            });

            await this.s3Client.send(command);

            const fileUrl = `${envConfig.AWS_ENDPOINT}/${this.bucketName}/${fileName}`;

            logger.info(`[S3] ✅ File uploaded successfully: ${fileUrl}`);

            return fileUrl;
        } catch (error) {
            logger.error('[S3] Upload Error:', error);
            throw new Error('Failed to upload file to S3');
        }
    }
}
