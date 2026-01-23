# Transaction Decoupling - Remaining Tasks

## ✅ Completed

1. **Schema Updated** - Transaction model fully decoupled with sender/receiver fields
2. **Core Service Updated** - `WalletService` (shared) updated with new LedgerEntry interface
3. **Transfer Service Renamed** - `src/api/modules/wallet/wallet.service.ts` → `transfer.service.ts`
4. **Webhook Service Updated** - Now uses helper functions and populates sender/receiver
5. **Helper Utilities Created** - `transaction-helpers.ts` for consistent party details
6. **Migration Script Created** - `flatten-transactions.ts` to migrate existing data
7. **Documentation Created** - Comprehensive docs in `TRANSACTION_DECOUPLING.md`

## 🔧 Remaining Fixes

### 1. Transfer Worker (`src/worker/transfer.worker.ts`)

**Issues**: 16 errors - Missing sender/receiver fields when creating reversal transactions

**Fix Required**:

- Update reversal transaction creation to include sender/receiver details
- Handle nullable `userId` and `walletId` fields properly

### 2. P2P Order Worker (`src/worker/p2p-order.worker.ts`)

**Issues**: 3 errors - Similar to transfer worker

**Fix Required**:

- Update P2P transaction creation to include sender/receiver details

### 3. Reconciliation Job (`src/worker/reconciliation.job.ts`)

**Issues**: 2 errors - Needs sender/receiver fields

**Fix Required**:

- Update reconciliation logic to include sender/receiver details

### 4. Fix Stuck Order Script (`src/scripts/fix-stuck-order.ts`)

**Issues**: 3 errors - Needs sender/receiver fields

**Fix Required**:

- Update script to include sender/receiver details

### 5. Wallet Controller (`src/api/modules/wallet/wallet.controller.ts`)

**Issues**: 1 error - Likely import or type issue

**Fix Required**:

- Verify imports and types

## 📋 Next Steps

1. **Run Migration**:

    ```bash
    npx prisma db push
    npx tsx src/scripts/flatten-transactions.ts
    ```

2. **Fix Workers**: Update all workers to use the new transaction structure

3. **Fix Scripts**: Update utility scripts to use new structure

4. **Test**: Thoroughly test all transaction flows

5. **Deploy**: Deploy to staging for integration testing

## 🎯 Pattern to Follow

For any code creating transactions, use this pattern:

```typescript
import {
    getUserPartyDetails,
    buildExternalPartyDetails,
} from '../../../shared/lib/utils/transaction-helpers';

// Get party details
const senderDetails = await getUserPartyDetails(senderId);
const receiverDetails = await getUserPartyDetails(receiverId);
// OR for external
const receiverDetails = buildExternalPartyDetails(name, account, bankName, bankCode);

// Create transaction with full details
await prisma.transaction.create({
    data: {
        userId,
        walletId,
        type,
        amount,
        // ... other fields

        // Sender
        senderName: senderDetails.name,
        senderAccount: senderDetails.account,
        senderBankName: senderDetails.bankName,
        senderBankCode: senderDetails.bankCode,
        senderAvatarUrl: senderDetails.avatarUrl,

        // Receiver
        receiverName: receiverDetails.name,
        receiverAccount: receiverDetails.account,
        receiverBankName: receiverDetails.bankName,
        receiverBankCode: receiverDetails.bankCode,
        receiverAvatarUrl: receiverDetails.avatarUrl,
    },
});
```

## 📝 Notes

- The `userId` and `walletId` fields are now **optional** in the schema but should still be provided when available
- All transaction creation must go through `WalletService.processLedgerEntry()` or include full sender/receiver details
- The migration script will handle existing data
- No more joins needed for transaction queries - massive performance improvement!
