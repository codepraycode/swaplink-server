import { Router } from 'express';
console.log('🔄 [DEBUG] routes/index.ts loading...');
import authRoutes from './auth/auth.routes';
console.log('🔄 [DEBUG] auth.routes loaded');
import transferRoutes from './transfer/transfer.routes';
console.log('🔄 [DEBUG] transfer.routes loaded');
import webhookRoutes from './webhook/webhook.route';
console.log('🔄 [DEBUG] webhook.route loaded');
import p2pRoutes from './p2p/p2p.routes';
console.log('🔄 [DEBUG] p2p.routes loaded');
import adminRoutes from './admin/admin.routes';
console.log('🔄 [DEBUG] admin.routes loaded');
import systemRoutes from './system/system.routes';
console.log('🔄 [DEBUG] system.routes loaded');
import userRoutes from './user/user.routes';
console.log('🔄 [DEBUG] user.routes loaded');
import notificationRoutes from './notification/notification.route';
console.log('🔄 [DEBUG] notification.route loaded');

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
