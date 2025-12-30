import { Router } from 'express';
import { P2PChatController } from './p2p-chat.controller';
import { authenticate } from '../../../middlewares/auth/auth.middleware';
import { uploadProof } from '../../../middlewares/upload.middleware'; // Using existing upload middleware for now

const router: Router = Router();

router.use(authenticate);

router.post('/upload', uploadProof.single('proof'), P2PChatController.uploadImage);
router.get('/:orderId/messages', P2PChatController.getMessages);

export default router;
