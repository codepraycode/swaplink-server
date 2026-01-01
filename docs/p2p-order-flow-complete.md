# P2P Order Flow - Complete Guide

## Flow Overview

```
Ad Creation → Order Creation → FX Transfer → Proof Upload → Confirmation → Fund Release
```

---

## Scenario 1: BUY_FX Ad Flow

### Step 1: Ad Creation

**Maker creates BUY_FX ad:**

-   "I want to buy 100 USD at 1500 NGN/USD"
-   Maker locks 150,000 NGN in the ad
-   Maker provides their USD bank account details (where they want to receive USD)

### Step 2: Order Creation

**Taker creates order:**

-   "I'll sell you 50 USD"
-   System reserves 50 USD from the ad (remaining: 50 USD)
-   Taker receives Maker's USD bank account details
-   Order status: `PENDING`

### Step 3: FX Transfer

**Taker sends FX:**

-   Taker transfers 50 USD to Maker's USD bank account (external transfer)
-   Taker takes a screenshot/photo of the transfer receipt

### Step 4: Proof Upload & Mark as Paid

**Taker uploads proof:**

-   Taker uploads the receipt via `/api/v1/p2p/chat/upload?orderId=xxx`
-   ✅ Authorization passes (Taker is FX sender)
-   Order status: `PENDING` → `PAID`
-   Maker gets notification: "Payment proof uploaded"

### Step 5: Confirmation

**Maker confirms receipt:**

-   Maker checks their USD bank account
-   Maker sees the 50 USD has arrived
-   Maker calls confirm endpoint
-   ✅ Authorization passes (Maker is NGN payer/FX receiver)
-   Order status: `PAID` → `PROCESSING`

### Step 6: Fund Release (Async)

**System releases funds:**

-   Worker processes the fund release
-   Taker receives 74,250 NGN (75,000 - 1% fee)
-   System revenue: 750 NGN
-   Order status: `PROCESSING` → `COMPLETED`

---

## Scenario 2: SELL_FX Ad Flow

### Step 1: Ad Creation

**Maker creates SELL_FX ad:**

-   "I want to sell 100 USD at 1500 NGN/USD"
-   No NGN locked yet (Maker will send FX)
-   Maker has 100 USD available to sell

### Step 2: Order Creation

**Taker creates order:**

-   "I'll buy 50 USD from you"
-   Taker locks 75,000 NGN (50 USD × 1500)
-   Taker provides their USD bank account details (where they want to receive USD)
-   Maker receives Taker's USD bank account details
-   Order status: `PENDING`

### Step 3: FX Transfer

**Maker sends FX:**

-   Maker transfers 50 USD to Taker's USD bank account (external transfer)
-   Maker takes a screenshot/photo of the transfer receipt

### Step 4: Proof Upload & Mark as Paid

**Maker uploads proof:**

-   Maker uploads the receipt via `/api/v1/p2p/chat/upload?orderId=xxx`
-   ✅ Authorization passes (Maker is FX sender)
-   Order status: `PENDING` → `PAID`
-   Taker gets notification: "Payment proof uploaded"

### Step 5: Confirmation

**Taker confirms receipt:**

-   Taker checks their USD bank account
-   Taker sees the 50 USD has arrived
-   Taker calls confirm endpoint
-   ✅ Authorization passes (Taker is NGN payer/FX receiver)
-   Order status: `PAID` → `PROCESSING`

### Step 6: Fund Release (Async)

**System releases funds:**

-   Worker processes the fund release
-   Maker receives 74,250 NGN (75,000 - 1% fee)
-   System revenue: 750 NGN
-   Order status: `PROCESSING` → `COMPLETED`

---

## Authorization Summary

| Action               | BUY_FX Ad | SELL_FX Ad |
| -------------------- | --------- | ---------- |
| **Create Ad**        | Maker     | Maker      |
| **Lock NGN (Ad)**    | Maker     | -          |
| **Create Order**     | Taker     | Taker      |
| **Lock NGN (Order)** | -         | Taker      |
| **Send FX**          | Taker     | Maker      |
| **Upload Proof**     | Taker ✓   | Maker ✓    |
| **Confirm Receipt**  | Maker ✓   | Taker ✓    |
| **Receive NGN**      | Taker     | Maker      |

---

## Key Authorization Rules

### markAsPaid (Upload Proof)

```typescript
// Only the FX sender can upload proof
const isFxSender =
    (order.ad.type === AdType.BUY_FX && userId === order.takerId) ||
    (order.ad.type === AdType.SELL_FX && userId === order.makerId);

if (!isFxSender) throw new ForbiddenError('Only the FX sender can upload payment proof');
```

### confirmOrder (Confirm Receipt)

```typescript
// Only the FX receiver (NGN payer) can confirm
const isNgnPayer =
    (order.ad.type === AdType.BUY_FX && userId === order.makerId) ||
    (order.ad.type === AdType.SELL_FX && userId === order.takerId);

if (!isNgnPayer) throw new ForbiddenError('Only the FX receiver can confirm receipt');
```

---

## Your Original Issue - Resolved ✅

**Your scenario:** "I want to sell FX, I send 200 USD, then I wanted to send receipt"

**Analysis:**

1. You're selling FX → You responded to a **BUY_FX** ad
2. You are the **Taker**
3. You send 200 USD → You are the **FX sender**
4. Authorization check: `AdType.BUY_FX && userId === order.takerId` → ✅ **TRUE**
5. You can now upload the receipt without getting 403 Forbidden!

**The fix ensures:**

-   BUY_FX ad → Taker uploads proof ✓
-   SELL_FX ad → Maker uploads proof ✓
-   The person who transfers FX always uploads proof ✓
