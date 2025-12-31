import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../../middlewares/auth/auth.middleware';
import { handleUploadError, uploadAvatar } from '../../../middlewares/upload.middleware';

const router: Router = Router();

router.use(authenticate);

router.put('/push-token', UserController.updatePushToken);
router.post('/change-password', UserController.changePassword);
router.put('/profile', UserController.updateProfile);
router.post(
    '/profile/avatar',
    uploadAvatar.single('avatar'),
    handleUploadError as any,
    UserController.updateAvatar
);

export default router;
