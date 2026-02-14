import { Router } from 'express';
import { P2POrderController } from './p2p-order.controller';
import { authenticate } from '../../../middlewares/auth/auth.middleware';
import { uploadProof } from '../../../middlewares/upload.middleware';

const router: Router = Router();

router.use(authenticate);

router.post('/', uploadProof.single('proof'), P2POrderController.create);
router.get('/', P2POrderController.getAll);
router.get('/:id', P2POrderController.getOne);
router.patch('/:id/confirm', P2POrderController.confirm);

export default router;
