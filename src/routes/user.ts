import express from 'express';

import { authenticate } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { authService } from '../services/auth.service';
import { handlerEror } from '../utils/error';

const router: express.Router = express.Router();

// Get current user
router.get('/me', authenticate, async (req: any, res) => {
    try {
        const user = await authService.getUserMini(req.user.userId);

        sendSuccess(res, { user }, 'User profile retrieved successfully');
    } catch (error) {
        console.error('Get user error:', error);
        sendError(res, handlerEror('Failed to get user profile'));
    }
});

export default router;
