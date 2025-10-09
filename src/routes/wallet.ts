import express from 'express';
import { authenticate } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { walletService } from '../services/wallet.service';
import { handlerEror } from '../utils/error';

const router: express.Router = express.Router();

// Get user wallets
router.get('/', authenticate, async (req: any, res) => {
    try {
        const wallets = await walletService.getWallets(req.user.userId);

        sendSuccess(res, { wallets }, 'Wallets retrieved successfully');
    } catch (error) {
        console.error('Get wallets error:', error);
        sendError(res, handlerEror('Failed to retrieve wallets'));
    }
});

// Get wallet transactions
router.get('/transactions', authenticate, async (req: any, res) => {
    try {
        const { total, transactions, limit, page } = await walletService.getTransactions({
            query: req.query,
            userId: req.user.userId,
        });

        sendSuccess(
            res,
            {
                transactions,
                pagination: {
                    page: parseInt(page as string),
                    limit: parseInt(limit as string),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit as string)),
                },
            },
            'Transactions retrieved successfully'
        );
    } catch (error) {
        console.error('Get transactions error:', error);
        sendError(res, handlerEror('Failed to retrieve transactions'));
    }
});

export default router;
