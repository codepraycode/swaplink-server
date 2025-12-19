import { Router } from 'express';
import { TransferController } from './transfer.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router: Router = Router();

router.use(authenticate);

// PIN Management
router.post('/pin', TransferController.setOrUpdatePin);

// Verify PIN for Transfer (Step 1)
router.post('/verify-pin', TransferController.verifyPin);

// Name Enquiry
router.post('/name-enquiry', TransferController.nameEnquiry);

// Process Transfer (Step 2)
router.post('/process', TransferController.processTransfer);

// Beneficiaries
router.get('/beneficiaries', TransferController.getBeneficiaries);

// Transactions
router.get('/transactions', TransferController.getTransactions);

export default router;
