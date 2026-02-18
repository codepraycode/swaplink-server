# Mobile Client API Update Guide — P2P Module

This document details all API changes for the Expo mobile app. It covers breaking changes from the server update and full documentation of all working endpoints.

---

## 1. Order Creation — BREAKING CHANGE

### Before

```
POST /api/v1/p2p/orders
Content-Type: application/json

{ "adId": "...", "amount": 50, "paymentMethodId": "..." }
```

Then separately: `POST /api/v1/p2p/chat/upload` to submit proof → triggers `markAsPaid`.

### After

Order creation now handles two flows based on the ad type:

- **BUY_FX Ad**: Taker (Sender) **MUST** provide payment proof in the same request. Status starts at `IN_PROGRESS`.
- **SELL_FX Ad**: Taker (Buyer) **is not required** to provide proof. Status starts at `AWAITING_MAKER_PAYMENT`, indicating we are expecting the **Maker** (Seller) to send FX and provide proof.

```
POST /api/v1/p2p/orders
Content-Type: multipart/form-data
Authorization: Bearer <token>

Fields:
  - adId: string (required)
  - amount: number (required)
  - paymentMethodId: string (required for SELL_FX ads)
  - currency: string (required for SELL_FX ads)
  - proof: File (required for BUY_FX, optional for SELL_FX)
```

**Response**: Order object with status `"IN_PROGRESS"` or `"AWAITING_MAKER_PAYMENT"`.

### Mobile Code Example

```typescript
const formData = new FormData();
formData.append('adId', adId);
formData.append('amount', amount.toString());
if (paymentMethodId) {
    formData.append('paymentMethodId', paymentMethodId);
    formData.append('currency', currency); // e.g. 'USD'
}
formData.append('proof', {
    uri: proofImageUri,
    type: 'image/jpeg',
    name: 'proof.jpg',
} as any);

const response = await api.post('/p2p/orders', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
});
// response.data.status === 'IN_PROGRESS'
```

> **When is `paymentMethodId` required?**
>
> - **BUY_FX ad** (maker wants to buy FX): Taker gives FX → `paymentMethodId` is **NOT** required (maker's payment details come from the ad).
> - **SELL_FX ad** (maker wants to sell FX): Taker gives NGN → `paymentMethodId` **IS** required (taker must specify where to receive FX).

---

## 2. Order Status Enum — BREAKING CHANGE

### Removed Statuses

| Old Status  | Replacement                                |
| ----------- | ------------------------------------------ |
| `PENDING`   | ❌ Removed — orders start as `IN_PROGRESS` |
| `PAID`      | ❌ Removed — replaced by `IN_PROGRESS`     |
| `CANCELLED` | ❌ Removed — orders cannot be cancelled    |

### New Status Flow

```
AWAITING_MAKER_PAYMENT → IN_PROGRESS → PROCESSING → COMPLETED
                                ↓
                              DISPUTE
```

- **AWAITING_MAKER_PAYMENT**: Only for `SELL_FX`. Maker needs to upload proof.
- **IN_PROGRESS**: Proof submitted, awaiting confirmation from the NGN payer.

### What to Update

- Remove all references to `PENDING`, `PAID`, `CANCELLED`
- Replace `PAID` displays with `IN_PROGRESS`
- Remove any cancel order UI/logic
- Update status-dependent styling/labels

---

## 3. Removed Endpoints — BREAKING CHANGE

| Endpoint                                 | Reason                             |
| ---------------------------------------- | ---------------------------------- |
| `PATCH /api/v1/p2p/orders/:id/cancel`    | Orders can no longer be cancelled  |
| `GET /api/v1/p2p/chat/:orderId/messages` | Chat module removed entirely       |
| `PATCH /api/v1/p2p/orders/:id/proof`     | **NEW**: For Maker to submit proof |

### Socket.IO Events Removed

All P2P chat socket events are removed:

- `join_order`, `send_message`, `receive_message`, `typing`, `user_online` / `user_offline`

---

## 4. Timer/Countdown Removal

`expiresAt` is now `null` for new orders.

- Remove countdown timer from order screens
- Remove "time remaining" display
- `payTimeLimit` and `remainingTime` are no longer in the API response

---

## 5. Ad Engagement Tracking — NEW

Two new endpoints for reserving ad amounts when a user starts the order flow.

### Engage Ad (Reserve Amount)

```
PATCH /api/v1/p2p/ads/:id/engage
Content-Type: application/json
Authorization: Bearer <token>

{ "amount": 50 }
```

**When to call**: When user taps on an ad and enters the order details screen.

### Disengage Ad (Release Amount)

```
PATCH /api/v1/p2p/ads/:id/disengage
Content-Type: application/json
Authorization: Bearer <token>

{ "amount": 50 }
```

**When to call**: When user navigates away without creating an order.

### Mobile Code Example

```typescript
useEffect(() => {
    engageAd(adId, amount);
    return () => {
        disengageAd(adId, amount);
    };
}, []);
```

### Ad Response — New Fields

```json
{
    "availableAmount": 80,
    "remainingAmount": 100,
    "engagedAmount": 20
}
```

| Field             | Use                                      |
| ----------------- | ---------------------------------------- |
| `availableAmount` | **Display this** as tradeable amount     |
| `remainingAmount` | Total FX left in the ad (for owner view) |
| `engagedAmount`   | Amount currently reserved by other users |

---

## 6. Full API Reference

### Payment Methods

Payment methods are currency-specific accounts where users can receive FX. Each currency has different validation:

| Currency | Required Fields                           | Default Bank     |
| -------- | ----------------------------------------- | ---------------- |
| **CAD**  | `accountName`, `email` (valid email)      | Interac          |
| **USD**  | `accountName`, `email` (valid email)      | Zelle            |
| **GBP**  | `accountName`, `accountNumber` (8 digits) | UK Bank Transfer |

#### Create Payment Method

```
POST /api/v1/p2p/payment-methods
Authorization: Bearer <token>

{
  "currency": "USD",           // Required: "CAD", "USD", or "GBP"
  "accountName": "John Doe",   // Required always
  "email": "john@example.com", // Required for CAD/USD
  "accountNumber": "12345678", // Required for GBP
  "bankName": "Custom Bank",   // Optional (auto-defaults per currency)
  "isPrimary": true            // Optional (default: false)
}
```

**Response** (201):

```json
{
    "id": "uuid",
    "userId": "uuid",
    "currency": "USD",
    "bankName": "Zelle",
    "accountNumber": "",
    "accountName": "John Doe",
    "details": { "email": "john@example.com" },
    "isPrimary": true,
    "isActive": true
}
```

> Setting `isPrimary: true` automatically unsets other primaries for the same currency.

#### Get My Payment Methods

```
GET /api/v1/p2p/payment-methods
Authorization: Bearer <token>
```

Returns all active payment methods, primary first.

#### Delete Payment Method

```
DELETE /api/v1/p2p/payment-methods/:id
Authorization: Bearer <token>
```

- If linked to active/paused ads → **soft-deleted** (sets `isActive: false`)
- If not linked → **hard-deleted**

---

### Ads

#### Create Ad

```
POST /api/v1/p2p/ads
Authorization: Bearer <token>

{
  "type": "BUY_FX" | "SELL_FX",
  "currency": "USD",
  "totalAmount": 100,
  "price": 1500,              // NGN per 1 FX unit
  "minLimit": 10,
  "maxLimit": 100,
  "paymentMethodId": "uuid",  // Required for BUY_FX
  "terms": "Payment within 5 mins",
  "autoReply": "Thanks for your order!"
}
```

> **BUY_FX**: Maker wants to buy FX (gives NGN). NGN is locked from wallet on ad creation.
> **SELL_FX**: Maker wants to sell FX (gives FX). No funds locked.

#### Get Ads

```
GET /api/v1/p2p/ads?currency=USD&type=BUY_FX&status=ACTIVE&minAmount=10
Authorization: Bearer <token>
```

Returns ads with `availableAmount` computed. If requester owns the ad, includes `orders` array.

#### Close Ad

```
PATCH /api/v1/p2p/ads/:id/close
Authorization: Bearer <token>
```

Fails if ad has active orders. Refunds locked NGN for BUY_FX ads.

#### Reactivate Ad

```
PATCH /api/v1/p2p/ads/:id/reactivate
Authorization: Bearer <token>
```

Only works on `PAUSED` ads (auto-paused after 24h of activity).

#### Engage Ad — NEW

```
PATCH /api/v1/p2p/ads/:id/engage
Authorization: Bearer <token>
{ "amount": 50 }
```

#### Disengage Ad — NEW

```
PATCH /api/v1/p2p/ads/:id/disengage
Authorization: Bearer <token>
{ "amount": 50 }
```

---

### Orders

#### Create Order (with proof) — UPDATED

```
POST /api/v1/p2p/orders
Content-Type: multipart/form-data
Authorization: Bearer <token>

Fields: adId, amount, paymentMethodId (SELL_FX only), currency (SELL_FX only), proof (file)
```

#### Get My Orders

```
GET /api/v1/p2p/orders
Authorization: Bearer <token>
```

#### Get Single Order

```
GET /api/v1/p2p/orders/:id
Authorization: Bearer <token>
```

#### Confirm Order

```
PATCH /api/v1/p2p/orders/:id/confirm
Authorization: Bearer <token>
```

Only the FX buyer (NGN payer) can confirm.

#### Submit Maker Proof (SELL_FX only) — NEW

```
PATCH /api/v1/p2p/orders/:id/proof
Content-Type: multipart/form-data
Authorization: Bearer <token>

Fields:
  - proof: File (required)
```

Used by the **Ad Owner (Maker)** of a `SELL_FX` ad to upload proof of FX transfer. This moves the order from `AWAITING_MAKER_PAYMENT` to `IN_PROGRESS`.

---

## Migration Checklist

1. [ ] Update order creation to use `multipart/form-data` with proof file
2. [ ] Update `OrderStatus` type (remove `PENDING`/`PAID`/`CANCELLED`, add `IN_PROGRESS`)
3. [ ] Remove cancel order UI and API call
4. [ ] Remove chat screen, socket connection, and message components
5. [ ] Add `engageAd` / `disengageAd` calls in order flow
6. [ ] Use `availableAmount` on ad cards instead of `remainingAmount`
7. [ ] Remove countdown timers and `expiresAt` references
8. [ ] Update status labels/colors for `IN_PROGRESS`
9. [ ] Verify payment method creation works per currency (CAD/USD need email, GBP needs account number)
10. [ ] Test end-to-end: create payment method → browse ads → engage → create order with proof → confirm
