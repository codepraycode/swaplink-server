import { Request, Response, NextFunction } from 'express';
import { pinService } from '../../shared/lib/services/pin.service';
import { nameEnquiryService } from '../../shared/lib/services/name-enquiry.service';
import { transferService } from '../../shared/lib/services/transfer.service';
import { beneficiaryService } from '../../shared/lib/services/beneficiary.service';
import { JwtUtils } from '../../shared/lib/utils/jwt-utils';

export class TransferController {
    /**
     * Set or Update Transaction PIN
     */
    static async setOrUpdatePin(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = JwtUtils.ensureAuthentication(req).userId;
            const { oldPin, newPin, confirmPin } = req.body;

            if (newPin !== confirmPin) {
                res.status(400).json({ error: 'New PIN and confirmation do not match' });
                return;
            }

            if (oldPin) {
                // Update existing PIN
                const result = await pinService.updatePin(userId, oldPin, newPin);
                res.status(200).json(result);
            } else {
                // Set new PIN
                const result = await pinService.setPin(userId, newPin);
                res.status(201).json(result);
            }
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
            const payload = { ...req.body, userId };

            // TODO: Validate payload (Joi/Zod)

            const result = await transferService.processTransfer(payload);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Resolve Account Name
     */
    static async nameEnquiry(req: Request, res: Response, next: NextFunction) {
        try {
            const { accountNumber, bankCode } = req.body;
            const result = await nameEnquiryService.resolveAccount(accountNumber, bankCode);
            res.status(200).json(result);
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
            res.status(200).json(beneficiaries);
        } catch (error) {
            next(error);
        }
    }
}
