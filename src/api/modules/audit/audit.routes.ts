import { Router } from 'express';
import { AuditController } from './audit.controller';
import { authenticate, requireRole } from '../../middlewares/auth/auth.middleware';

const router: Router = Router();

router.use(authenticate);
router.use(requireRole(['ADMIN', 'SUPER_ADMIN']));

router.get('/', AuditController.getLogs);

export default router;
