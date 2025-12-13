import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import transferRoutes from './transfer/transfer.routes';
import webhookRoutes from './webhook/webhook.route';

const router: Router = Router();

/**
 * Central Route Aggregator
 *
 * This file aggregates all module/feature routes and mounts them
 * under their respective base paths.
 *
 * Pattern: /api/v1/<module>/<endpoint>
 */

router.use('/auth', authRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/transfers', transferRoutes);

export default router;
