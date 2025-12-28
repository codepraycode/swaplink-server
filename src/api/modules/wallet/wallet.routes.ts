import { Router } from 'express';
import { WalletController } from './wallet.controller';
import { authenticate } from '../../middlewares/auth/auth.middleware';

const router: Router = Router();

router.use(authenticate);

router.get('/', WalletController.getWalletInfo);
// PIN Management
router.post('/pin', WalletController.setOrUpdatePin);

// Verify PIN for Transfer (Step 1)
router.post('/verify-pin', WalletController.verifyPin);

// Name Enquiry
router.get('/name-enquiry', WalletController.nameEnquiry);

// Process Transfer (Step 2)
router.post('/process', WalletController.processTransfer);

// Beneficiaries
router.get('/beneficiaries', WalletController.getBeneficiaries);

// Transactions
router.get('/transactions', WalletController.getTransactions);

export default router;
