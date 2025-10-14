// src/routes/offers.ts
import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { offerService } from '../services/offer.service';
import { handlerEror } from '../utils/error';

const router: express.Router = express.Router();

// Get all offers
router.get('/', async (req, res) => {
    try {
        const { offers, total, limit, page } = await offerService.getOffers({
            query: req.query as any,
            userId: '',
        });

        sendSuccess(
            res,
            {
                offers,
                pagination: {
                    page: parseInt(page as string),
                    limit: parseInt(limit as string),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit as string)),
                },
            },
            'Offers retrieved successfully'
        );
    } catch (error) {
        console.error('Get offers error:', error);
        sendError(res, handlerEror(error, 'Failed to retrieve offers'));
    }
});

// Create offer
router.post('/', authenticate, async (req: any, res) => {
    try {
        const { offer } = await offerService.createOffer(req.user.userId, req.body);

        sendSuccess(res, { offer }, 'Offer created successfully', 201);
    } catch (error) {
        console.error('Create offer error:', error);
        sendError(res, handlerEror(error, 'Failed to create offer'));
    }
});

export default router;
