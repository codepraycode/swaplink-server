import { Router } from 'express';
console.log('🔄 [DEBUG] routes/index.ts loading...');
import authRoutes from './auth/auth.routes';
import transferRoutes from './transfer/transfer.routes';
import webhookRoutes from './webhook/webhook.route';
import p2pRoutes from './p2p/p2p.routes';
import adminRoutes from './admin/admin.routes';
import systemRoutes from './system/system.routes';
import userRoutes from './user/user.routes';
import notificationRoutes from './notification/notification.route';

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
router.use('/p2p', p2pRoutes);
router.use('/admin', adminRoutes);
router.use('/system', systemRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationRoutes);

export default router;
