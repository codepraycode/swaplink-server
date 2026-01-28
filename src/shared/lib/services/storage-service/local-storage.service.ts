import { envConfig } from '../../../config/env.config';
import logger from '../../utils/logger';
import fs from 'fs';
import path from 'path';
import { slugifyFilename } from '../../utils/functions';
import { IStorageService } from './cloudinary-storage.service';

export class LocalStorageService implements IStorageService {
    async uploadFile(file: Express.Multer.File, folder: string = 'uploads'): Promise<string> {
        try {
            const uploadDir = path.join(process.cwd(), 'uploads', folder);
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const timestamp = Date.now();
            const random = Math.round(Math.random() * 1e9);
            const safeName = slugifyFilename(file.originalname);
            const fileName = `${timestamp}-${random}-${safeName}`;

            const filePath = path.join(uploadDir, fileName);
            await fs.promises.writeFile(filePath, file.buffer);

            const fileUrl = `${envConfig.SERVER_URL}/uploads/${folder}/${fileName}`;

            logger.info(`[LocalStorage] ✅ File saved locally: ${fileUrl}`);

            return fileUrl;
        } catch (error) {
            logger.error('[LocalStorage] Upload Error:', error);
            throw new Error('Failed to save file locally');
        }
    }
}
