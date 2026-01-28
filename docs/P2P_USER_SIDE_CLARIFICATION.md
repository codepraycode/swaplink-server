# P2P User Side Clarification - BUYER vs SELLER

## 🎯 Core Definition

**BUYER** = User who is **paying Naira** (has money locked in escrow)
**SELLER** = User who is **expecting Naira** (will receive Naira)

> **Key Insight**: "Whoever has his money locked in escrow is the BUYER"

---

## 📊 Truth Table

| Ad Type     | Maker Role                     | Taker Role                     | Who Locks Naira?              | BUYER     | SELLER    |
| ----------- | ------------------------------ | ------------------------------ | ----------------------------- | --------- | --------- |
| **BUY_FX**  | Wants to buy FX<br/>Pays Naira | Wants to sell FX<br/>Sends FX  | **Maker** (at ad creation)    | **Maker** | **Taker** |
| **SELL_FX** | Wants to sell FX<br/>Sends FX  | Wants to buy FX<br/>Pays Naira | **Taker** (at order creation) | **Taker** | **Maker** |

---

## 🔍 Scenario Analysis

### Scenario 1: BUY_FX Ad

```javascript
{
  adType: 'BUY_FX',
  maker: 'Alice',  // Created ad to buy FX
  taker: 'Bob',    // Responded to ad to sell FX
}
```

**Flow:**

1. Alice creates BUY_FX ad → **Alice locks 150,000 NGN** ✅
2. Bob creates order to sell USD
3. Bob sends USD to Alice (external transfer)
4. Bob uploads proof
5. Alice confirms receipt
6. **Bob receives Naira** (Alice's locked funds)

**User Sides:**

-   **Alice (Maker)**: BUYER ✅ (paid Naira, has money in escrow)
-   **Bob (Taker)**: SELLER ✅ (expects Naira)

---

### Scenario 2: SELL_FX Ad

```javascript
{
  adType: 'SELL_FX',
  maker: 'Alice',  // Created ad to sell FX
  taker: 'Bob',    // Responded to ad to buy FX
}
```

**Flow:**

1. Alice creates SELL_FX ad → **No Naira locked**
2. Bob creates order to buy USD → **Bob locks 75,000 NGN** ✅
3. Alice sends USD to Bob (external transfer)
4. Alice uploads proof
5. Bob confirms receipt
6. **Alice receives Naira** (Bob's locked funds)

**User Sides:**

-   **Alice (Maker)**: SELLER ✅ (expects Naira)
-   **Bob (Taker)**: BUYER ✅ (paid Naira, has money in escrow)

---

## ✅ Correct Logic

```typescript
// Determine who is the BUYER (NGN payer with locked funds)
const isNgnLockedByMaker = order.ad.type === AdType.BUY_FX;
const buyer = isNgnLockedByMaker ? order.maker : order.taker;
const seller = isNgnLockedByMaker ? order.taker : order.maker;

// User's side
const userSide = userId === buyer?.id ? 'BUYER' : 'SELLER';
```

**This is EXACTLY what the backend already does!** ✅

---

## 🐛 The Real Issue

The backend logic is **CORRECT**. The issue is in the **mobile app** (`OrderItem.tsx`).

### Old Mobile Code (WRONG):

```tsx
const isBuy = order.userSide === 'BUYER';
const counterparty = isBuy ? order.seller : order.buyer;
```

This relied on `order.userSide` which was correct, but the display logic was confusing.

### New Mobile Code (ALSO CORRECT):

```tsx
const amIMaker = user?.id === order.makerId;
const amITaker = user?.id === order.takerId;
const adType = order.ad?.type;
const isSellFxAd = adType === 'SELL_FX';

// Determine if I am the FX sender
const iAmFxSender = (isSellFxAd && amIMaker) || (!isSellFxAd && amITaker);

// From the user's perspective:
// - If I'm the FX sender, I'm SELLING FX
// - If I'm the NGN payer, I'm BUYING FX
const isBuy = !iAmFxSender; // NGN payer is buying FX
```

---

## 🎯 What "BUY" and "SELL" Mean in the UI

### When User Sees "BUY USD":

-   User is **paying Naira** to obtain USD
-   User's Naira is **locked in escrow**
-   User is the **BUYER** (userSide = 'BUYER')
-   User will **confirm receipt** of USD
-   Counterparty is the **FX Sender**

### When User Sees "SELL USD":

-   User is **sending USD** to obtain Naira
-   User will **receive Naira** (from escrow)
-   User is the **SELLER** (userSide = 'SELLER')
-   User will **upload proof** of USD transfer
-   Counterparty is the **FX Receiver**

---

## 🔧 Summary

| Concept        | Definition                                           |
| -------------- | ---------------------------------------------------- |
| **BUYER**      | Pays Naira, has funds in escrow, confirms FX receipt |
| **SELLER**     | Sends FX, uploads proof, receives Naira              |
| **BUY_FX Ad**  | Maker is BUYER, Taker is SELLER                      |
| **SELL_FX Ad** | Maker is SELLER, Taker is BUYER                      |
| **userSide**   | 'BUYER' or 'SELLER' based on who locked Naira        |

---

## ✅ Verification

The backend `transformOrder` function is **100% CORRECT**:

```typescript
const isBuyAd = order.ad.type === AdType.BUY_FX;
const buyer = isBuyAd ? order.maker : order.taker; // ✅
const seller = isBuyAd ? order.taker : order.maker; // ✅
userSide: userId === buyer?.id ? 'BUYER' : 'SELLER'; // ✅
```

**This perfectly implements**: "Whoever has his money locked in escrow is the BUYER"
