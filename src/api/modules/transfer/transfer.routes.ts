import { Router } from 'express';
import { TransferController } from './transfer.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router: Router = Router();

router.use(authenticate);

// PIN Management
router.post('/pin', TransferController.setOrUpdatePin);

// Name Enquiry
router.post('/name-enquiry', TransferController.nameEnquiry);

// Process Transfer
router.post('/process', TransferController.processTransfer);

// Beneficiaries
router.get('/beneficiaries', TransferController.getBeneficiaries);

// Transactions
router.get('/transactions', TransferController.getTransactions);

export default router;
