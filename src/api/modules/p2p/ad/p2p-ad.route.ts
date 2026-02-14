import { Router } from 'express';
import { P2PAdController } from './p2p-ad.controller';
import { authenticate } from '../../../middlewares/auth/auth.middleware';

const router: Router = Router();

router.use(authenticate);

// Public-ish (requires auth but shows all ads)
router.get('/', P2PAdController.getAll);

// Protected Routes
router.post('/', P2PAdController.create);
router.patch('/:id/close', P2PAdController.close);
router.patch('/:id/reactivate', P2PAdController.reactivate);
router.patch('/:id/engage', P2PAdController.engage);
router.patch('/:id/disengage', P2PAdController.disengage);

export default router;
