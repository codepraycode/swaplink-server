import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../../middlewares/auth.middleware';

const router: Router = Router();

router.use(authenticate);

router.put('/push-token', UserController.updatePushToken);
router.post('/change-password', UserController.changePassword);
router.put('/profile', UserController.updateProfile);

export default router;
