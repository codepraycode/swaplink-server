import express from 'express';

import { authenticate } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { authService } from '../services/auth.service';
import { handlerEror } from '../utils/error';
import { validateBody } from '../middleware/validation.middleware';
import { AuthSchema } from '../validators/auth.validator';

const router: express.Router = express.Router();

// Register
router.post('/register', validateBody(AuthSchema), async (req, res) => {
    try {
        const { user, token, refreshToken, expiresIn } = await authService.register(req.body);

        sendSuccess(
            res,
            {
                user,
                tokens: {
                    accessToken: token,
                    refreshToken,
                    expiresIn,
                },
            },
            'User registered successfully',
            201
        );
    } catch (error: any) {
        console.error('Registration error:', error);
        sendError(res, handlerEror(error, 'Registration error'));
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { refreshToken, token, user, expiresIn } = await authService.login(req.body);

        sendSuccess(
            res,
            {
                user,
                tokens: {
                    accessToken: token,
                    refreshToken,
                    expiresIn,
                },
            },
            'Login successful'
        );
    } catch (error: any) {
        console.error('Login error:', error);
        sendError(res, handlerEror(error, 'Login Error'));
    }
});

// Get current user
router.get('/me', authenticate, async (req: any, res) => {
    try {
        const user = await authService.getUser(req.user.userId);

        sendSuccess(res, { user }, 'User profile retrieved successfully');
    } catch (error) {
        console.error('Get user error:', error);
        sendError(res, handlerEror('Failed to get user profile'));
    }
});

export default router;
