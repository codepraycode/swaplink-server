import { Router } from 'express';
import authRoutes from './auth/auth.routes';

const router: Router = Router();

/**
 * Central Route Aggregator
 *
 * This file aggregates all module/feature routes and mounts them
 * under their respective base paths.
 *
 * Pattern: /api/v1/<module>/<endpoint>
 */

// Mount Auth Module Routes
router.use('/auth', authRoutes);

// TODO: Add more module routes as they are created
// Example:
// router.use('/wallet', walletRoutes);
// router.use('/transactions', transactionRoutes);
// router.use('/kyc', kycRoutes);

export default router;
