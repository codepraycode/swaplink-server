import { Router } from 'express';
import { systemController } from './system.controller';
import { requireRole } from '../../middlewares/role.middleware';
import { UserRole } from '../../../shared/database';
import { authenticate } from '../../middlewares/auth.middleware';

const router: Router = Router();

// Public Health Check
router.get('/health', (req, res, next) => systemController.checkHealth(req, res, next));

// Protected System Info (Admin Only)
router.get(
    '/info',
    authenticate,
    requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
    (req, res, next) => systemController.getSystemInfo(req, res, next)
);

export default router;
