import { Router } from 'express';
import paymentMethodRoutes from './payment-method/p2p-payment-method.route';
import adRoutes from './ad/p2p-ad.route';
import orderRoutes from './order/p2p-order.route';
import chatRoutes from './chat/p2p-chat.route';
// import { authenticate } from '../../middlewares/auth.middleware';

const router: Router = Router();

router.use('/payment-methods', paymentMethodRoutes);
router.use('/ads', adRoutes);
router.use('/orders', orderRoutes);
router.use('/chat', chatRoutes);

export default router;
