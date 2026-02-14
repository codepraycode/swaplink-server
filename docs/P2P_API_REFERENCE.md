# P2P Module API Reference

This document provides the complete technical specification for the P2P (Peer-to-Peer) trading module, including TypeScript type definitions, object structures, and endpoint documentation.

---

## 🏷️ TypeScript Type Definitions

These interfaces define the core data structures used throughout the P2P system.

### **Core Enums**

```typescript
/**
 * Ad Types defining the Maker's intent
 */
export enum AdType {
    BUY_FX = 'BUY_FX', // Maker wants to BUY FX (Gives NGN)
    SELL_FX = 'SELL_FX', // Maker wants to SELL FX (Gives FX)
}

/**
 * Possible states for a P2P Advertisement
 */
export enum AdStatus {
    ACTIVE = 'ACTIVE',
    PAUSED = 'PAUSED',
    COMPLETED = 'COMPLETED',
    CLOSED = 'CLOSED',
}

/**
 * Lifecycle stages of a P2P Trade (Order)
 */
export enum OrderStatus {
    IN_PROGRESS = 'IN_PROGRESS', // Created with proof, awaiting confirmation
    PROCESSING = 'PROCESSING', // Fund release in progress (async worker)
    COMPLETED = 'COMPLETED', // Funds released to seller
    DISPUTE = 'DISPUTE', // Manual intervention required
}
```

### **User & Payment Interfaces**

```typescript
/**
 * Sanitized profile shared between trading parties
 */
export interface P2PUserSnapshot {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
    kycLevel: string;
}

/**
 * External payment method details
 */
export interface P2PPaymentMethod {
    id: string;
    currency: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    details: {
        email?: string; // Used for Interac/Zelle
        [key: string]: any;
    };
    isPrimary: boolean;
}
```

### **Ad & Trade Interfaces**

```typescript
/**
 * P2P Advertisement Object
 */
export interface P2PAd {
    id: string;
    userId: string;
    type: AdType;
    currency: string;

    // Inventory Management
    totalAmount: number; // Initial list amount
    remainingAmount: number; // Amount not yet "sold"
    engagedAmount: number; // Amount currently tied up in active trades
    availableAmount: number; // (remainingAmount - engagedAmount)

    // Terms & Pricing
    price: number; // Exchange rate (NGN per 1 FX)
    minLimit: number; // Minimum trade size
    maxLimit: number; // Maximum trade size

    // Status & Metadata
    status: AdStatus;
    terms: string | null;
    autoReply: string | null;
    version: number; // Optimistic locking version

    // Relations
    user?: P2PUserSnapshot; // Ad owner (Maker)
    paymentMethod?: P2PPaymentMethod;
    orders?: P2PTrade[]; // Associated trades (populated in 'My Ads')

    createdAt: string;
    updatedAt: string;
}

/**
 * P2P Trade (Order) Object
 */
export interface P2PTrade {
    id: string;
    adId: string;
    makerId: string;
    takerId: string;

    // Financial Snapshot (Fixed at creation)
    amount: number; // FX Amount
    price: number; // Exchange Rate
    totalNgn: number; // Total NGN to be paid
    fee: number; // System fee in NGN
    receiveAmount: number | null; // (totalNgn - fee)

    // Trade Execution
    status: OrderStatus;
    paymentProofUrl: string | null;

    // Logic Roles (Determined by Ad Type)
    buyer: P2PUserSnapshot; // The person RECEIVING FX
    seller: P2PUserSnapshot; // The person GIVING FX
    owner: P2PUserSnapshot; // The Ad creator (Maker)
    sender: P2PUserSnapshot; // The Order creator (usually Taker)
    userSide: 'BUYER' | 'SELLER'; // Context for the requesting user

    // Bank Detail Snapshots
    bankName: string | null;
    accountNumber: string | null;
    accountName: string | null;
    bankDetails: any | null; // Dynamic details (email, etc.)

    // Relations
    ad?: P2PAd;

    createdAt: string;
    updatedAt: string;
}
```

---

## 📣 P2P Advertisements (Ads) API

### **1. Public Ad Feed**

Retrieve all active ads available for trading. Results are enriched with `availableAmount` and hidden if `availableAmount < minLimit`.

- **URL:** `GET /api/v1/p2p/ads`
- **Query Params:** `currency`, `type`, `minAmount`

### **2. My Ads**

Retrieve ads created by the authenticated user, including all associated trades.

- **URL:** `GET /api/v1/p2p/ads/my-ads`

### **3. Create Advertisement**

Create a new P2P listing. If `BUY_FX`, the total required NGN will be locked from your wallet.

- **URL:** `POST /api/v1/p2p/ads`
- **Body:** `AdType`, `currency`, `totalAmount`, `price`, `minLimit`, `maxLimit`, `paymentMethodId`

---

## 🤝 P2P Trades (Orders) API

### **1. Create Trade**

Initiate a trade by submitting proof of payment.

- **URL:** `POST /api/v1/p2p/orders`
- **Body:** `multipart/form-data`
    - `adId`, `amount`, `paymentMethodId` (if selling FX)
    - `proof`: File attachment

### **2. Trade List & Details**

- **All Trades:** `GET /api/v1/p2p/orders` (Orders where user is Maker or Taker)
- **Single Trade:** `GET /api/v1/p2p/orders/:id`

### **3. Confirm Receipt (Release Funds)**

The **FX Buyer** (the person who received FX externally) confirms the trade, triggering the release of locked NGN to the Seller.

- **URL:** `PATCH /api/v1/p2p/orders/:id/confirm`
- **Restriction:** Allowed only for the user mapped as `buyer`.

---

## 🔄 Logic & Roles Matrix

| Ad Type     | Maker Intent | Buyer (FX Receiver) | Seller (FX Giver) | Who Confirms? |
| :---------- | :----------- | :------------------ | :---------------- | :------------ |
| **BUY_FX**  | Wants FX     | **Maker**           | **Taker**         | **Maker**     |
| **SELL_FX** | Wants NGN    | **Taker**           | **Maker**         | **Taker**     |

> **Security Note:** Funds are held in escrow (locked) until the `buyer` explicitly confirms receipt of FX. In cases of dispute, funds remain locked until resolved by an administrator.
