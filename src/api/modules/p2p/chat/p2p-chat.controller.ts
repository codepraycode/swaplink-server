import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../../../shared/lib/utils/api-response';

export class P2PChatController {
    static async uploadImage(req: Request, res: Response, next: NextFunction) {
        try {
            // Assuming upload middleware puts file in req.file
            // and returns a URL or path.
            // If using local upload, we might need to construct URL.
            // For now, let's assume req.file.path or req.file.location (S3)

            if (!req.file) {
                throw new Error('No file uploaded');
            }

            // Return the file URL/Path so client can send it via socket
            // In a real app, we'd return the full URL.
            // Let's assume we return `req.file.path` for now.

            return sendSuccess(res, { url: req.file.path }, 'Image uploaded successfully');
        } catch (error) {
            next(error);
        }
    }
}
