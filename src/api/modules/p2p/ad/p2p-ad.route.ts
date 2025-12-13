import { Router } from 'express';
import { P2PAdController } from './p2p-ad.controller';
import { authenticate, optionalAuth } from '../../../middlewares/auth.middleware';

const router: Router = Router();

// Public Feed (Optional Auth to see my ads?)
// Plan says "Taker browses the P2P Feed". Usually public.
// But we might want to show "My Ads" differently.
// For now, let's make feed public but authenticated for creation.
// Wait, `optionalAuth` is good for feed if we want to flag "isMyAd".

router.get('/', optionalAuth, P2PAdController.getAll);

// Protected Routes
router.use(authenticate);
router.post('/', P2PAdController.create);
router.patch('/:id/close', P2PAdController.close);

export default router;
