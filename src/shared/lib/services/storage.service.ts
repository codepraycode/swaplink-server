import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { envConfig } from '../../config/env.config';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { slugify } from '../utils/functions';

export class StorageService {
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
    }

    async uploadFile(file: Express.Multer.File, folder: string = 'uploads'): Promise<string> {
        if (envConfig.NODE_ENV === 'development' || envConfig.NODE_ENV === 'test') {
            return this.uploadLocal(file, folder);
        }
        return this.uploadS3(file, folder);
    }

    private async uploadLocal(file: Express.Multer.File, folder: string): Promise<string> {
        try {
            const uploadDir = path.join(process.cwd(), 'uploads', folder);

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const fileName = slugify(
                `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`
            );
            const filePath = path.join(uploadDir, fileName);

            await fs.promises.writeFile(filePath, file.buffer);

            // Return Local URL
            return `${envConfig.SERVER_URL}/uploads/${folder}/${fileName}`;
        } catch (error) {
            logger.error('Local Upload Error:', error);
            throw new Error('Failed to save file locally');
        }
    }

    private async uploadS3(file: Express.Multer.File, folder: string): Promise<string> {
        try {
            const fileName = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}-${
                file.originalname
            }`;

            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: fileName,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: 'public-read',
            });

            await this.s3Client.send(command);

            // Return Cloud URL
            // If using Cloudflare R2 with custom domain, use that.
            // Otherwise construct standard S3 URL or use Endpoint.
            // For R2, AWS_ENDPOINT is usually the API endpoint, not the public access URL.
            // User should ideally provide a PUBLIC_URL_BASE.
            // For now, we'll try to construct a usable URL.

            return `${envConfig.AWS_ENDPOINT}/${this.bucketName}/${fileName}`;
        } catch (error) {
            logger.error('S3 Upload Error:', error);
            throw new Error('Failed to upload file to cloud');
        }
    }
}

export const storageService = new StorageService();
