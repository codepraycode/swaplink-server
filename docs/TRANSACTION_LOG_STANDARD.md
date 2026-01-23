# Transaction Log Standardization

## Overview

This document outlines the standardized structure for transaction logs returned by the API. The goal is to ensure that every transaction record explicitly identifies the **Sender** and **Receiver**, regardless of the transaction type (Deposit, Withdrawal, Transfer).

## Detached Transaction Logging

To support robust transaction history even when external accounts are involved (or if internal users are deleted), the system now stores **detached** sender and receiver details directly on the `Transaction` record.

### Schema Updates

The `Transaction` table now includes:

- `senderName`, `senderAccount`, `senderBankName`, `senderBankCode`
- `destinationName`, `destinationAccount`, `destinationBankName`, `destinationBankCode`

These fields serve as the primary source of truth for the "Other Party" in the transaction.

## Standardized Response Structure

The `getTransactions` endpoint returns an enriched transaction object:

```typescript
interface TransactionResponse {
    id: string;
    type: TransactionType; // DEPOSIT, WITHDRAWAL, TRANSFER, FEE
    amount: number;
    status: string;
    reference: string;
    narration: string; // Mapped from description
    createdAt: Date;

    // Standardized Parties
    sender: TransactionParty;
    receiver: TransactionParty;

    // ... other fields (fee, balanceBefore, balanceAfter)
}

interface TransactionParty {
    name: string;
    accountNumber: string; // "0000000000" if unknown
    bankName: string; // "SwapLink Wallet" or External Bank Name
    bankCode?: string; // Optional, for external banks
    avatarUrl?: string; // Present for Internal Users
    id?: string; // Present for Internal Users
    type: 'INTERNAL' | 'EXTERNAL' | 'UNKNOWN';
}
```

## Logic Mapping

The system prioritizes the detached fields on the transaction record. If they are missing (legacy transactions), it falls back to relations (`counterparty`) or metadata.

### 1. Deposits (Credit)

- **Receiver**: The User (You).
- **Sender**:
    - **Priority 1**: `senderName`, `senderAccount`, etc. from Transaction record.
    - **Priority 2**: `counterparty` relation (Internal User).
    - **Priority 3**: Metadata (Legacy Webhooks).

### 2. Withdrawals & Transfers (Debit)

- **Sender**: The User (You).
- **Receiver**:
    - **Priority 1**: `destinationName`, `destinationAccount`, etc. from Transaction record.
    - **Priority 2**: `counterparty` relation (Internal User).
    - **Priority 3**: `destinationAccount` (Legacy External).

## Implementation Details

### Webhook Handling

When a credit notification is received via the Globus Webhook:

1.  The system extracts `originatorName`, `originatorAccount`, `originatorBank` from the payload.
2.  It saves these directly into the `sender...` fields of the `Transaction` record.
3.  This ensures that the transaction log is complete and independent of any future metadata changes or user deletions.

### API Response

The `WalletService.getTransactions` method performs a post-query mapping:

- It checks for detached fields first.
- It formats the `user` and `counterparty` data into the standard `sender`/`receiver` structure if detached fields are missing.
- It ensures robust fallbacks (no nulls) for UI stability.
