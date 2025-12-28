import { Request, Response, NextFunction } from 'express';
import { pinService } from './pin.service';
import { nameEnquiryService } from './name-enquiry.service';
import { walletService } from './wallet.service';
import { beneficiaryService } from './beneficiary.service';
import { JwtUtils } from '../../../shared/lib/utils/jwt-utils';
import { sendCreated, sendSuccess } from '../../../shared/lib/utils/api-response';
import { BadRequestError } from '../../../shared/lib/utils/api-error';
import sharedWalletService from '../../../shared/lib/services/wallet.service';
import { TransactionType } from '../../../shared/database';
import { logDebug } from '../../../shared/lib/utils/logger';

export class WalletController {
    static async getWalletInfo(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = JwtUtils.ensureAuthentication(req).userId;
            const wallet = await walletService.getWallet(userId);
            sendSuccess(res, wallet);
        } catch (error) {
            next(error);
        }
    }
    /**
     * Get Wallet Transactions
     */
    static async getTransactions(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = JwtUtils.ensureAuthentication(req).userId;
            const { page, limit, type } = req.query;

            const result = await sharedWalletService.getTransactions({
                userId,
                page: page ? Number(page) : 1,
                limit: limit ? Number(limit) : 20,
                type: type as TransactionType,
            });

            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }
    /**
     * Set or Update Transaction PIN
     */
    static async setOrUpdatePin(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = JwtUtils.ensureAuthentication(req).userId;
            const { oldPin, newPin } = req.body;

            if (oldPin) {
                if (!newPin) {
                    throw new BadRequestError('New PIN is required');
                }
                if (newPin === oldPin) {
                    throw new BadRequestError('New PIN cannot be the same as old PIN');
                }
                // Update existing PIN
                const result = await pinService.updatePin(userId, oldPin, newPin);
                sendSuccess(res, result);
            } else {
                // Set new PIN
                const result = await pinService.setPin(userId, newPin);
                sendCreated(res, result);
            }
        } catch (error) {
            next(error);
        }
    }

    /**
     * Verify PIN for Transfer (Step 1)
     * Returns an idempotency key to be used in the transfer request
     */
    static async verifyPin(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = JwtUtils.ensureAuthentication(req).userId;
            const { pin } = req.body;

            if (!pin) {
                throw new BadRequestError('PIN is required');
            }

            const result = await pinService.verifyPinForTransfer(userId, pin);
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Process Transfer
     */
    static async processTransfer(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = JwtUtils.ensureAuthentication(req).userId;
            const idempotencyKey =
                (req.headers['idempotency-key'] as string) || req.body.idempotencyKey;

            if (!idempotencyKey) {
                throw new BadRequestError('Idempotency-Key header is required');
            }

            const payload = { ...req.body, userId, idempotencyKey };

            // TODO: Validate payload (Joi/Zod)

            const result = await walletService.processTransfer(payload);
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Resolve Account Name
     */
    static async nameEnquiry(req: Request, res: Response, next: NextFunction) {
        try {
            const { accountNumber, bankCode } = req.query;
            const result = await nameEnquiryService.resolveAccount(
                accountNumber as string,
                bankCode as string
            );
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get Beneficiaries
     */
    static async getBeneficiaries(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = JwtUtils.ensureAuthentication(req).userId;
            const beneficiaries = await beneficiaryService.getBeneficiaries(userId);
            sendSuccess(res, beneficiaries);
        } catch (error) {
            next(error);
        }
    }
}
