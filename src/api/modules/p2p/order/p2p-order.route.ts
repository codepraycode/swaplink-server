import { Router } from 'express';
import { P2POrderController } from './p2p-order.controller';
import { authenticate } from '../../../middlewares/auth.middleware';

const router: Router = Router();

router.use(authenticate);

router.post('/', P2POrderController.create);
router.get('/:id', P2POrderController.getOne);
router.patch('/:id/pay', P2POrderController.markAsPaid);
router.patch('/:id/confirm', P2POrderController.confirm);
router.patch('/:id/cancel', P2POrderController.cancel);

export default router;
