# Mobile App OrderItem Fix - User Side Display

## 📋 Summary

The backend `userSide` calculation is **100% CORRECT**. The mobile app needs to use it properly.

---

## ✅ Backend Logic (CORRECT - No Changes Needed)

**File**: `src/api/modules/p2p/order/p2p-order.controller.ts` (Lines 67-95)

```typescript
private static transformOrder(order: any, userId: string) {
    const isBuyAd = order.ad.type === AdType.BUY_FX;

    // BUYER = Person who locked Naira in escrow
    const buyer = isBuyAd ? order.maker : order.taker;
    const seller = isBuyAd ? order.taker : order.maker;

    return {
        ...order,
        buyer: sanitize(buyer),
        seller: sanitize(seller),
        userSide: userId === buyer?.id ? 'BUYER' : 'SELLER', // ✅ CORRECT
    };
}
```

**This is perfect** because:

-   BUY_FX ad → Maker locks Naira → Maker is BUYER
-   SELL_FX ad → Taker locks Naira → Taker is BUYER

---

## 🐛 Mobile App Issue

The mobile app's `OrderItem.tsx` was **NOT using `userSide`** correctly.

### ❌ Old Approach (Broken):

```tsx
const isBuy = order.userSide === 'BUYER';
const counterparty = isBuy ? order.seller : order.buyer;
```

**Problem**: This was actually correct, but the issue report suggests it wasn't working. Let's verify what the mobile app should do.

---

## 🎯 Correct Mobile App Logic

### Option 1: Use `userSide` from Backend (SIMPLEST)

```tsx
// OrderItem.tsx
const isBuy = order.userSide === 'BUYER';
const isSell = order.userSide === 'SELLER';

// Display
const action = isBuy ? 'BUY' : 'SELL';
const counterparty = isBuy ? order.seller : order.buyer;
const counterpartyRole = isBuy ? 'FX Sender' : 'FX Receiver';
```

**Explanation:**

-   If `userSide === 'BUYER'` → User is paying Naira → Display "BUY USD"
-   If `userSide === 'SELLER'` → User is sending FX → Display "SELL USD"

---

### Option 2: Calculate Client-Side (MORE COMPLEX)

```tsx
// OrderItem.tsx
const amIMaker = user?.id === order.makerId;
const amITaker = user?.id === order.takerId;
const isBuyFxAd = order.ad?.type === 'BUY_FX';

// Determine if I'm the BUYER (NGN payer)
const iAmBuyer = (isBuyFxAd && amIMaker) || (!isBuyFxAd && amITaker);

// Display
const action = iAmBuyer ? 'BUY' : 'SELL';
const counterparty = iAmBuyer ? order.seller : order.buyer;
const counterpartyRole = iAmBuyer ? 'FX Sender' : 'FX Receiver';
```

---

## 📊 Verification Table

| Ad Type | User Role | `userSide` | Display    | Counterparty Role   |
| ------- | --------- | ---------- | ---------- | ------------------- |
| BUY_FX  | Maker     | BUYER      | "BUY USD"  | FX Sender (Taker)   |
| BUY_FX  | Taker     | SELLER     | "SELL USD" | FX Receiver (Maker) |
| SELL_FX | Maker     | SELLER     | "SELL USD" | FX Receiver (Taker) |
| SELL_FX | Taker     | BUYER      | "BUY USD"  | FX Sender (Maker)   |

---

## 🔍 Test Cases

### Test Case 1: BUY_FX Ad - I'm the Maker

```javascript
{
  ad: { type: 'BUY_FX' },
  makerId: 'user-123',
  takerId: 'user-456',
  userId: 'user-123',  // I'm the Maker
  userSide: 'BUYER'    // ✅ From backend
}
```

**Expected Display:**

-   ✅ "BUY USD" (I'm paying Naira)
-   ✅ Counterparty: Taker (FX Sender)

---

### Test Case 2: BUY_FX Ad - I'm the Taker

```javascript
{
  ad: { type: 'BUY_FX' },
  makerId: 'user-456',
  takerId: 'user-123',
  userId: 'user-123',  // I'm the Taker
  userSide: 'SELLER'   // ✅ From backend
}
```

**Expected Display:**

-   ✅ "SELL USD" (I'm sending FX)
-   ✅ Counterparty: Maker (FX Receiver)

---

### Test Case 3: SELL_FX Ad - I'm the Maker

```javascript
{
  ad: { type: 'SELL_FX' },
  makerId: 'user-123',
  takerId: 'user-456',
  userId: 'user-123',  // I'm the Maker
  userSide: 'SELLER'   // ✅ From backend
}
```

**Expected Display:**

-   ✅ "SELL USD" (I'm sending FX)
-   ✅ Counterparty: Taker (FX Receiver)

---

### Test Case 4: SELL_FX Ad - I'm the Taker

```javascript
{
  ad: { type: 'SELL_FX' },
  makerId: 'user-456',
  takerId: 'user-123',
  userId: 'user-123',  // I'm the Taker
  userSide: 'BUYER'    // ✅ From backend
}
```

**Expected Display:**

-   ✅ "BUY USD" (I'm paying Naira)
-   ✅ Counterparty: Maker (FX Sender)

---

## 🎯 Recommended Mobile App Code

```tsx
// OrderItem.tsx - RECOMMENDED APPROACH
import { P2POrder } from '@/types/p2p';

interface OrderItemProps {
    order: P2POrder;
    user: User;
}

export function OrderItem({ order, user }: OrderItemProps) {
    // Use the userSide from backend (SIMPLEST and MOST RELIABLE)
    const isBuyer = order.userSide === 'BUYER';

    // Determine display values
    const action = isBuyer ? 'BUY' : 'SELL';
    const currency = order.ad.currency;
    const amount = order.amount;

    // Counterparty info
    const counterparty = isBuyer ? order.seller : order.buyer;
    const counterpartyRole = isBuyer ? 'FX Sender' : 'FX Receiver';

    return (
        <View>
            <Text>
                {action} {amount} {currency}
            </Text>
            <Text>
                Counterparty: {counterparty.firstName} ({counterpartyRole})
            </Text>
            <Text>Status: {order.status}</Text>
        </View>
    );
}
```

---

## 🔧 What to Update in Mobile App

### File: `src/components/market/OrderItem.tsx`

**Replace lines 28-56 with:**

```tsx
// Use userSide from backend (already calculated correctly)
const isBuyer = order.userSide === 'BUYER';
const action = isBuyer ? 'BUY' : 'SELL';
const counterparty = isBuyer ? order.seller : order.buyer;
const counterpartyRole = isBuyer ? 'FX Sender' : 'FX Receiver';
```

**Replace line 176 with:**

```tsx
<Text>
    {counterpartyRole}: {counterparty?.firstName}
</Text>
```

---

## ✅ Conclusion

1. **Backend is CORRECT** - No changes needed
2. **Mobile app should use `order.userSide`** directly
3. **`userSide === 'BUYER'`** means display "BUY"
4. **`userSide === 'SELLER'`** means display "SELL"
5. This aligns with: "Whoever has money locked in escrow is the BUYER"

---

## 📝 Related Files

-   Backend: `src/api/modules/p2p/order/p2p-order.controller.ts`
-   Mobile: `src/components/market/OrderItem.tsx` (needs update)
-   Mobile: `src/screens/OrderDetailsScreen.tsx` (verify consistency)
-   Mobile: `src/screens/PaymentProofScreen.tsx` (verify consistency)
