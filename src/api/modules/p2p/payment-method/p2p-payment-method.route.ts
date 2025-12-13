import { Router } from 'express';
import { P2PPaymentMethodController } from './p2p-payment-method.controller';
import { authenticate } from '../../../middlewares/auth.middleware';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/', P2PPaymentMethodController.create);
router.get('/', P2PPaymentMethodController.getAll);
router.delete('/:id', P2PPaymentMethodController.delete);

export default router;
