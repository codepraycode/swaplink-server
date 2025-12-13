import { Router } from 'express';
import { TransferController } from '../../controllers/transfer.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router: Router = Router();

// PIN Management
router.post('/pin', authenticate, TransferController.setOrUpdatePin);

// Name Enquiry
router.post('/name-enquiry', authenticate, TransferController.nameEnquiry);

// Process Transfer
router.post('/process', authenticate, TransferController.processTransfer);

// Beneficiaries
router.get('/beneficiaries', authenticate, TransferController.getBeneficiaries);

export default router;
