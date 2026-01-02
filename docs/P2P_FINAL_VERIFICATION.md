# P2P Flow - Final Verification with Corrected Understanding

## 🎯 Core Definitions (FINAL)

### User Sides

-   **BUYER** = User paying Naira (has money locked in escrow)
-   **SELLER** = User expecting Naira (will receive Naira from escrow)

### Ad Types (Never Change)

-   **BUY_FX** = Ad creator wants to buy FX (ad type stays BUY_FX forever)
-   **SELL_FX** = Ad creator wants to sell FX (ad type stays SELL_FX forever)

### Order Object

-   **Ad Type**: Retains the original ad type (BUY_FX or SELL_FX)
-   **userSide**: Indicates the authenticated user's side (BUYER or SELLER)

---

## 📊 Complete Flow Matrix

| Ad Type     | Maker Wants             | Taker Wants             | Maker Side | Taker Side | Who Locks Naira | When Locked    |
| ----------- | ----------------------- | ----------------------- | ---------- | ---------- | --------------- | -------------- |
| **BUY_FX**  | Buy FX<br/>(Pay Naira)  | Sell FX<br/>(Get Naira) | **BUYER**  | **SELLER** | Maker           | Ad Creation    |
| **SELL_FX** | Sell FX<br/>(Get Naira) | Buy FX<br/>(Pay Naira)  | **SELLER** | **BUYER**  | Taker           | Order Creation |

---

## 🔍 Detailed Scenarios

### Scenario A: BUY_FX Ad

```javascript
// Ad Creation
{
  type: 'BUY_FX',           // ✅ Never changes
  makerId: 'alice-123',
  status: 'ACTIVE'
}
```

**Step 1: Alice Creates Ad**

-   Alice wants to **buy 100 USD** at 1500 NGN/USD
-   Alice provides payment method (her USD bank account)
-   **Alice locks 150,000 NGN** ✅
-   Alice's side: **BUYER** ✅

**Step 2: Bob Creates Order**

```javascript
{
  adId: 'ad-456',
  ad: { type: 'BUY_FX' },   // ✅ Still BUY_FX
  makerId: 'alice-123',
  takerId: 'bob-789',
  amount: 50,               // Bob sells 50 USD
  totalNgn: 75000
}
```

-   Bob wants to **sell 50 USD**
-   Bob's side: **SELLER** ✅
-   No additional Naira locking (Alice already locked)

**Step 3: Bob Sends FX**

-   Bob sends 50 USD to Alice's bank account (external)
-   Bob uploads proof
-   Order status: PENDING → PAID

**Step 4: Alice Confirms**

-   Alice sees 50 USD in her bank account
-   Alice confirms receipt
-   Order status: PAID → PROCESSING → COMPLETED
-   **Bob receives 74,250 NGN** (from Alice's locked funds)

**API Response for Alice:**

```json
{
    "ad": { "type": "BUY_FX" },
    "makerId": "alice-123",
    "takerId": "bob-789",
    "userSide": "BUYER", // ✅ Alice is BUYER
    "buyer": { "id": "alice-123", "firstName": "Alice" },
    "seller": { "id": "bob-789", "firstName": "Bob" }
}
```

**API Response for Bob:**

```json
{
    "ad": { "type": "BUY_FX" },
    "makerId": "alice-123",
    "takerId": "bob-789",
    "userSide": "SELLER", // ✅ Bob is SELLER
    "buyer": { "id": "alice-123", "firstName": "Alice" },
    "seller": { "id": "bob-789", "firstName": "Bob" }
}
```

**Mobile App Display:**

-   **Alice sees**: "BUY 50 USD" ✅
-   **Bob sees**: "SELL 50 USD" ✅

---

### Scenario B: SELL_FX Ad

```javascript
// Ad Creation
{
  type: 'SELL_FX',          // ✅ Never changes
  makerId: 'alice-123',
  status: 'ACTIVE'
}
```

**Step 1: Alice Creates Ad**

-   Alice wants to **sell 100 USD** at 1500 NGN/USD
-   **No Naira locking** (Alice will send FX)
-   Alice's side: **SELLER** ✅

**Step 2: Bob Creates Order**

```javascript
{
  adId: 'ad-456',
  ad: { type: 'SELL_FX' },  // ✅ Still SELL_FX
  makerId: 'alice-123',
  takerId: 'bob-789',
  amount: 50,               // Bob buys 50 USD
  totalNgn: 75000
}
```

-   Bob wants to **buy 50 USD**
-   Bob provides payment method (his USD bank account)
-   **Bob locks 75,000 NGN** ✅
-   Bob's side: **BUYER** ✅

**Step 3: Alice Sends FX**

-   Alice sends 50 USD to Bob's bank account (external)
-   Alice uploads proof
-   Order status: PENDING → PAID

**Step 4: Bob Confirms**

-   Bob sees 50 USD in his bank account
-   Bob confirms receipt
-   Order status: PAID → PROCESSING → COMPLETED
-   **Alice receives 74,250 NGN** (from Bob's locked funds)

**API Response for Alice:**

```json
{
    "ad": { "type": "SELL_FX" },
    "makerId": "alice-123",
    "takerId": "bob-789",
    "userSide": "SELLER", // ✅ Alice is SELLER
    "buyer": { "id": "bob-789", "firstName": "Bob" },
    "seller": { "id": "alice-123", "firstName": "Alice" }
}
```

**API Response for Bob:**

```json
{
    "ad": { "type": "SELL_FX" },
    "makerId": "alice-123",
    "takerId": "bob-789",
    "userSide": "BUYER", // ✅ Bob is BUYER
    "buyer": { "id": "bob-789", "firstName": "Bob" },
    "seller": { "id": "alice-123", "firstName": "Alice" }
}
```

**Mobile App Display:**

-   **Alice sees**: "SELL 50 USD" ✅
-   **Bob sees**: "BUY 50 USD" ✅

---

## ✅ Backend Verification

### File: `p2p-order.controller.ts` (Lines 66-96)

```typescript
private static transformOrder(order: any, userId: string) {
    // Determine who is BUYER based on who locked Naira
    const isBuyAd = order.ad.type === AdType.BUY_FX;

    // BUY_FX: Maker locked Naira → Maker is BUYER
    // SELL_FX: Taker locked Naira → Taker is BUYER
    const buyer = isBuyAd ? order.maker : order.taker;
    const seller = isBuyAd ? order.taker : order.maker;

    return {
        ...order,
        buyer: sanitize(buyer),
        seller: sanitize(seller),
        // User's side based on who locked Naira
        userSide: userId === buyer?.id ? 'BUYER' : 'SELLER',
    };
}
```

**Verification:**

-   ✅ BUY_FX ad → buyer = maker (maker locked Naira)
-   ✅ SELL_FX ad → buyer = taker (taker locked Naira)
-   ✅ userSide = 'BUYER' if user locked Naira
-   ✅ userSide = 'SELLER' if user will receive Naira

**Status**: **100% CORRECT** ✅

---

## 🎯 Mobile App Requirements

### OrderItem.tsx

```tsx
// CORRECT IMPLEMENTATION
const isBuyer = order.userSide === 'BUYER';
const action = isBuyer ? 'BUY' : 'SELL';
const counterparty = isBuyer ? order.seller : order.buyer;
const counterpartyRole = isBuyer ? 'FX Sender' : 'FX Receiver';

// Display
<Text>{action} {order.amount} {order.ad.currency}</Text>
<Text>{counterpartyRole}: {counterparty.firstName}</Text>
```

### OrderDetailsScreen.tsx

```tsx
// CORRECT IMPLEMENTATION
const isBuyer = order.userSide === 'BUYER';
const isSeller = order.userSide === 'SELLER';

// Action buttons
{
    isSeller && order.status === 'PENDING' && (
        <Button onPress={navigateToPaymentProof}>I have sent {order.ad.currency}</Button>
    );
}

{
    isBuyer && order.status === 'PAID' && (
        <Button onPress={handleConfirmReceipt}>Confirm {order.ad.currency} Received</Button>
    );
}
```

---

## 📋 Summary Table

| Aspect                    | BUY_FX Ad               | SELL_FX Ad                 |
| ------------------------- | ----------------------- | -------------------------- |
| **Ad Type**               | BUY_FX (never changes)  | SELL_FX (never changes)    |
| **Maker Side**            | BUYER                   | SELLER                     |
| **Taker Side**            | SELLER                  | BUYER                      |
| **Maker Locks Naira?**    | ✅ Yes (at ad creation) | ❌ No                      |
| **Taker Locks Naira?**    | ❌ No                   | ✅ Yes (at order creation) |
| **Maker Sends FX?**       | ❌ No                   | ✅ Yes                     |
| **Taker Sends FX?**       | ✅ Yes                  | ❌ No                      |
| **Maker Uploads Proof?**  | ❌ No                   | ✅ Yes                     |
| **Taker Uploads Proof?**  | ✅ Yes                  | ❌ No                      |
| **Maker Confirms?**       | ✅ Yes                  | ❌ No                      |
| **Taker Confirms?**       | ❌ No                   | ✅ Yes                     |
| **Maker Receives Naira?** | ❌ No                   | ✅ Yes                     |
| **Taker Receives Naira?** | ✅ Yes                  | ❌ No                      |

---

## 🎯 Key Takeaways

1. **Ad Type Never Changes**: Once created as BUY_FX or SELL_FX, it stays that way
2. **userSide is Dynamic**: Calculated per user based on who locked Naira
3. **BUYER = NGN Payer**: Person with money in escrow
4. **SELLER = NGN Receiver**: Person who will get Naira
5. **Backend is Correct**: No changes needed
6. **Mobile App**: Should use `order.userSide` directly

---

## ✅ Final Verification

**Backend Logic**: ✅ **PERFECT**
**Mobile App Logic**: ⚠️ **Needs to use `userSide` correctly**

The backend correctly implements:

> "Whoever has his money locked in escrow is the BUYER"

The mobile app should simply trust the `userSide` field from the backend.
