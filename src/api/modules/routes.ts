import { Router } from 'express';
import accountRoutes from './account/account.routes';
import walletRoutes from './wallet/wallet.routes';
import webhookRoutes from './webhook/webhook.route';
import p2pRoutes from './p2p/p2p.routes';
import adminRoutes from './admin/admin.routes';
import systemRoutes from './system/system.routes';
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

router.use('/account', accountRoutes);
router.use('/wallet', walletRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/p2p', p2pRoutes);
router.use('/admin', adminRoutes);
router.use('/system', systemRoutes);
router.use('/notifications', notificationRoutes);

export default router;
