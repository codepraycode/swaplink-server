import { Router } from 'express';
import { webhookController } from './webhook.controller';

const router: Router = Router();

// POST /api/v1/webhooks/globus
router.post('/globus', (req, res) => webhookController.handleGlobusWebhook(req, res));

export default router;
