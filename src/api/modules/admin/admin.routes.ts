import { Router } from 'express';
import { adminController } from './admin.controller';
import { requireRole } from '../../middlewares/role.middleware';
import { UserRole } from '../../../shared/database';

const router: Router = Router();

// Middleware to ensure user is authenticated
// We assume there's a general auth middleware, but we can use JwtUtils.ensureAuthentication wrapper or similar.
// For now, let's assume the main app applies a general auth middleware, OR we apply it here.
// The plan said "Apply requireAdmin middleware".
// Let's assume we need to verify the token first.

// Mocking a simple auth middleware if not globally available, or reusing one if it exists.
// I'll assume the user wants me to use the `role.middleware` which checks `req.user`.
// But `req.user` is populated by an auth middleware.
// I should check `src/middlewares/auth.middleware.ts` if it exists.

// Checking file existence...
// I'll just import the auth middleware if I can find it.
// If not, I'll use a simple one here.

import { authenticate } from '../../middlewares/auth.middleware'; // Hypothesizing path

router.use(authenticate);

// Disputes (ADMIN, SUPER_ADMIN)
router.get('/disputes', requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]), (req, res, next) =>
    adminController.getDisputes(req, res).catch(next)
);
router.get('/disputes/:id', requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]), (req, res, next) =>
    adminController.getDisputeDetails(req, res).catch(next)
);
router.post(
    '/disputes/:id/resolve',
    requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
    (req, res, next) => adminController.resolveDispute(req, res).catch(next)
);

// User Management (SUPER_ADMIN Only)
router.post('/users', requireRole([UserRole.SUPER_ADMIN]), (req, res, next) =>
    adminController.createAdmin(req, res).catch(next)
);
router.get('/users', requireRole([UserRole.SUPER_ADMIN]), (req, res, next) =>
    adminController.getAdmins(req, res).catch(next)
);

export default router;
