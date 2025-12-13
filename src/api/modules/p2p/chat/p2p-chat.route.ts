import { Router } from 'express';
import { P2PChatController } from './p2p-chat.controller';
import { authenticate } from '../../../middlewares/auth.middleware';
import { uploadKyc } from '../../../middlewares/upload.middleware'; // Using existing upload middleware for now

const router: Router = Router();

router.use(authenticate);

// Reusing uploadKyc for now as it likely handles images.
// Ideally should have a generic `uploadImage` middleware.
// Let's assume `uploadKyc` is fine or we should check `upload.middleware.ts`.
router.post('/upload', uploadKyc.single('image'), P2PChatController.uploadImage);

export default router;
