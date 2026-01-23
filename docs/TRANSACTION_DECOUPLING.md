# Transaction Table Decoupling - Complete Implementation

## Overview

The Transaction table has been fully decoupled from User and Wallet relations, making it a standalone, self-contained ledger that conforms to fintech industry standards. Every transaction record now contains complete sender and receiver details without requiring database joins.

## Schema Changes

### Transaction Model (Fully Decoupled)

```prisma
model Transaction {
  id             String            @id @default(uuid())
  userId         String?           // Optional - for internal reference only
  walletId       String?           // Optional - for internal reference only

  // Transaction Details
  type           TransactionType
  amount         Decimal           @db.Decimal(20, 2)
  balanceBefore  Decimal           @db.Decimal(20, 2)
  balanceAfter   Decimal           @db.Decimal(20, 2)
  status         TransactionStatus @default(PENDING)
  reference      String            @unique
  sessionId      String?
  description    String?
  metadata       Json?
  fee            Decimal           @default(0) @db.Decimal(20, 2)

  // Sender Details (Required - Fully Detached)
  senderName          String
  senderAccount       String
  senderBankName      String
  senderBankCode      String?
  senderAvatarUrl     String?

  // Receiver Details (Required - Fully Detached)
  receiverName        String
  receiverAccount     String
  receiverBankName    String
  receiverBankCode    String?
  receiverAvatarUrl   String?

  // Idempotency
  idempotencyKey      String?  @unique

  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  @@map("transactions")
}
```

**Key Changes:**

- ❌ Removed all foreign key relations (`user`, `wallet`, `counterparty`)
- ✅ Made `userId` and `walletId` optional (for reference only)
- ✅ Added required `senderName`, `senderAccount`, `senderBankName` fields
- ✅ Added required `receiverName`, `receiverAccount`, `receiverBankName` fields
- ✅ Added optional `senderAvatarUrl` and `receiverAvatarUrl` for UI
- ✅ Added optional `senderBankCode` and `receiverBankCode` for routing

## Migration Script

A migration script has been created at `src/scripts/flatten-transactions.ts` to:

1. **Fetch all existing transactions** with their user/wallet/counterparty relations
2. **Resolve all references** to get complete sender/receiver details
3. **Populate the new fields** with flattened data
4. **Handle edge cases** like missing users, external transfers, etc.

### Running the Migration

```bash
# Run the migration script
npx tsx src/scripts/flatten-transactions.ts
```

The script will:

- Process all transactions in batches
- Log progress every 100 records
- Report success/error counts
- Handle both internal and external transactions

## Code Changes

### 1. LedgerEntry Interface

Updated to require sender/receiver details:

```typescript
interface LedgerEntry {
    userId: string;
    amount: Decimal | number;
    type: TransactionType;
    reference: string;
    description: string;
    metadata?: any;
    fee?: Decimal | number;

    // Sender Details (Required)
    senderName: string;
    senderAccount: string;
    senderBankName: string;
    senderBankCode?: string;
    senderAvatarUrl?: string;

    // Receiver Details (Required)
    receiverName: string;
    receiverAccount: string;
    receiverBankName: string;
    receiverBankCode?: string;
    receiverAvatarUrl?: string;
}
```

### 2. WalletService.processLedgerEntry

Now directly persists sender/receiver details:

```typescript
const transaction = await tx.transaction.create({
    data: {
        userId,
        walletId: wallet.id,
        type,
        amount: decimalAmount,
        // ... other fields

        // Sender Details (Required)
        senderName: entry.senderName,
        senderAccount: entry.senderAccount,
        senderBankName: entry.senderBankName,
        senderBankCode: entry.senderBankCode,
        senderAvatarUrl: entry.senderAvatarUrl,

        // Receiver Details (Required)
        receiverName: entry.receiverName,
        receiverAccount: entry.receiverAccount,
        receiverBankName: entry.receiverBankName,
        receiverBankCode: entry.receiverBankCode,
        receiverAvatarUrl: entry.receiverAvatarUrl,
    },
});
```

### 3. WalletService.getTransactions

**Massively Simplified** - no more joins or complex logic:

```typescript
async getTransactions(params: FetchTransactionOptions): Promise<any> {
    const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
            where,
            select: {
                id: true,
                type: true,
                amount: true,
                // ... other fields

                // Sender Details
                senderName: true,
                senderAccount: true,
                senderBankName: true,
                senderBankCode: true,
                senderAvatarUrl: true,

                // Receiver Details
                receiverName: true,
                receiverAccount: true,
                receiverBankName: true,
                receiverBankCode: true,
                receiverAvatarUrl: true,
            },
        }),
        prisma.transaction.count({ where }),
    ]);

    // Simple mapping - no complex logic needed
    return transactions.map(tx => ({
        ...tx,
        sender: {
            name: tx.senderName,
            accountNumber: tx.senderAccount,
            bankName: tx.senderBankName,
            // ...
        },
        receiver: {
            name: tx.receiverName,
            accountNumber: tx.receiverAccount,
            bankName: tx.receiverBankName,
            // ...
        },
    }));
}
```

### 4. Helper Utilities

Created `src/shared/lib/utils/transaction-helpers.ts` with:

- `getUserPartyDetails(userId)` - Fetch user's account details
- `buildExternalPartyDetails(...)` - Build external party details
- `buildSystemPartyDetails()` - Build system party details

### 5. Webhook Service

Updated to use helper functions and populate full sender/receiver details:

```typescript
const receiverDetails = await getUserPartyDetails(virtualAccount.wallet.userId);
const senderDetails = buildExternalPartyDetails(
    data.originatorName,
    data.originatorAccount,
    data.originatorBank
);

entries.push({
    userId: virtualAccount.wallet.userId,
    amount: amount,
    type: TransactionType.DEPOSIT,
    reference: reference,
    description: 'Deposit via Globus Bank',

    // Sender Details
    senderName: senderDetails.name,
    senderAccount: senderDetails.account,
    senderBankName: senderDetails.bankName,

    // Receiver Details
    receiverName: receiverDetails.name,
    receiverAccount: receiverDetails.account,
    receiverBankName: receiverDetails.bankName,
});
```

## Benefits

### 1. **Performance**

- ❌ Before: Multiple joins (User → Wallet → VirtualAccount → Counterparty → Wallet → VirtualAccount)
- ✅ After: Single table query, no joins required

### 2. **Data Integrity**

- ❌ Before: Transaction details lost if user/wallet deleted
- ✅ After: Complete transaction history preserved forever

### 3. **External Accounts**

- ❌ Before: Cannot log transactions from external accounts not in database
- ✅ After: Full support for external accounts with complete details

### 4. **Simplicity**

- ❌ Before: Complex logic to determine sender/receiver from relations
- ✅ After: Direct field access, no conditional logic needed

### 5. **Fintech Standard**

- ❌ Before: Non-standard relational structure
- ✅ After: Industry-standard flat transaction log

## API Response Format

```json
{
    "transactions": [
        {
            "id": "uuid",
            "type": "DEPOSIT",
            "amount": 5000,
            "status": "COMPLETED",
            "reference": "REF123",
            "narration": "Deposit via Globus Bank",
            "createdAt": "2026-01-23T00:00:00Z",
            "sender": {
                "name": "John Doe",
                "accountNumber": "1234567890",
                "bankName": "First Bank",
                "bankCode": "011",
                "avatarUrl": "",
                "type": "EXTERNAL"
            },
            "receiver": {
                "name": "Jane Smith",
                "accountNumber": "0987654321",
                "bankName": "SwapLink Wallet",
                "bankCode": "",
                "avatarUrl": "https://...",
                "type": "INTERNAL"
            }
        }
    ],
    "pagination": {
        "total": 100,
        "page": 1,
        "limit": 20,
        "totalPages": 5
    }
}
```

## Next Steps

1. **Run Migration**: Execute `npx tsx src/scripts/flatten-transactions.ts`
2. **Update Schema**: Run `npx prisma db push` to apply schema changes
3. **Update Other Services**: Review and update any other services that create transactions (transfers, withdrawals, etc.)
4. **Test Thoroughly**: Verify all transaction creation and retrieval flows
5. **Deploy**: Deploy to staging for testing before production

## Breaking Changes

⚠️ **Important**: This is a breaking change that requires:

1. Database migration
2. Code updates in all services that create transactions
3. Potential mobile app updates if transaction structure is cached

Ensure all dependent systems are updated before deploying to production.
