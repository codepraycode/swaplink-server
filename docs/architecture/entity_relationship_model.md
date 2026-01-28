# Entity Relation Model (ERM) - SwapLink

This document visualizes the data relationships for the SwapLink application based on the current Prisma schema.

## Visual Diagram

```mermaid
erDiagram
    User ||--o{ Wallet : "has"
    User ||--o{ Offer : "creates"
    User ||--o{ Trade : "participates as buyer"
    User ||--o{ Trade : "participates as seller"
    User ||--o{ BankAccount : "owns"
    User ||--o{ KycDocument : "uploads"
    User ||--o{ Transaction : "initiates"
    User ||--o{ Escrow : "funds (from)"
    User ||--o{ Escrow : "receives (to)"
    User ||--o{ VirtualAccount : "assigned"

    Wallet ||--o{ Transaction : "records"

    Offer ||--o{ Trade : "generates"

    Trade ||--|| Escrow : "secured by"

    User {
        String id PK
        String email
        String phone
        String password
        String firstName
        String lastName
        KycLevel kycLevel
        KycStatus kycStatus
        Boolean isVerified
        Boolean twoFactorEnabled
    }

    VirtualAccount {
        String id PK
        String userId FK
        String accountName
        String accountNumber
        String bankName
        String providerReference
        Json metadata
    }

    Wallet {
        String id PK
        String userId FK
        Currency currency
        Float balance
        Float lockedBalance
    }

    Transaction {
        String id PK
        String userId FK
        String walletId FK
        TransactionType type
        Currency currency
        Float amount
        TransactionStatus status
        String reference
    }

    Offer {
        String id PK
        String userId FK
        OfferType type
        Currency currency
        Float amount
        Float rate
        Float minAmount
        Float maxAmount
        OfferStatus status
    }

    Trade {
        String id PK
        String offerId FK
        String buyerId FK
        String sellerId FK
        Float amount
        Float rate
        Float totalNgn
        TradeStatus status
        Boolean escrowLocked
        Boolean paymentSent
        Boolean paymentConfirmed
    }

    Escrow {
        String id PK
        String tradeId FK
        String fromUserId FK
        String toUserId FK
        Currency currency
        Float amount
        EscrowStatus status
    }

    BankAccount {
        String id PK
        String userId FK
        String accountNumber
        String bankName
        Boolean isVerified
    }

    KycDocument {
        String id PK
        String userId FK
        String documentType
        String documentUrl
        KycDocumentStatus status
    }
```

## Key Relationships Explained

1.  **User & Wallet**: One-to-Many. A user can have multiple wallets (e.g., one for USD, one for NGN).
2.  **User & Offer**: One-to-Many. A user can post multiple buy or sell offers.
3.  **Offer & Trade**: One-to-Many. A single offer (e.g., "Selling $1000") can be partially fulfilled by multiple trades (e.g., Trade 1: $200, Trade 2: $800).
4.  **Trade & Escrow**: One-to-One. Every active trade MUST have a corresponding escrow record to lock the funds and ensure safety.
5.  **User & Trade**: A user can be either the `buyer` or the `seller` in a trade.
6.  **Transaction**: An immutable ledger record for every balance change in a Wallet (Deposit, Withdrawal, Trade Lock, Trade Release).
