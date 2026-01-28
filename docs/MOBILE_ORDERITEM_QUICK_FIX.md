# Mobile App Quick Fix Guide - OrderItem Display

## 🎯 The Problem

When users BUY USD from the market screen, the OrderItem component shows "SELL USD" instead of "BUY USD".

## ✅ The Solution

**Use `order.userSide` from the backend** - it's already calculated correctly!

---

## 📝 Code Changes Required

### File: `src/components/market/OrderItem.tsx`

**BEFORE (Lines 28-56):**

```tsx
// Determine user's role in this order
const amIMaker = user?.id === order.makerId;
const amITaker = user?.id === order.takerId;

// Determine the Ad Type
const adType = order.ad?.type;
const isSellFxAd = adType === 'SELL_FX';

// Determine if I am the FX sender or NGN payer
const iAmFxSender = (isSellFxAd && amIMaker) || (!isSellFxAd && amITaker);

// From the user's perspective:
const isBuy = !iAmFxSender; // NGN payer is buying FX
```

**AFTER (SIMPLIFIED):**

```tsx
// Use userSide from backend (already correct!)
const isBuy = order.userSide === 'BUYER';
```

---

### File: `src/components/market/OrderItem.tsx` (Line 176)

**BEFORE:**

```tsx
<Text>Buyer/Seller: {counterparty?.firstName}</Text>
```

**AFTER:**

```tsx
<Text>
    {isBuy ? 'FX Sender' : 'FX Receiver'}: {counterparty?.firstName}
</Text>
```

---

## 🧪 Testing

After making these changes, test:

1. **BUY_FX Ad - As Maker**:

    - Create a BUY_FX ad
    - Check your orders list
    - ✅ Should show "BUY USD"

2. **BUY_FX Ad - As Taker**:

    - Respond to someone's BUY_FX ad
    - Check your orders list
    - ✅ Should show "SELL USD"

3. **SELL_FX Ad - As Maker**:

    - Create a SELL_FX ad
    - Check your orders list
    - ✅ Should show "SELL USD"

4. **SELL_FX Ad - As Taker**:
    - Respond to someone's SELL_FX ad
    - Check your orders list
    - ✅ Should show "BUY USD"

---

## 📊 Quick Reference

| Your Action       | Ad Type You See | Your Order Shows | Counterparty Role |
| ----------------- | --------------- | ---------------- | ----------------- |
| Buy USD           | SELL_FX         | "BUY USD"        | FX Sender         |
| Sell USD          | BUY_FX          | "SELL USD"       | FX Receiver       |
| Create BUY_FX ad  | -               | "BUY USD"        | FX Sender         |
| Create SELL_FX ad | -               | "SELL USD"       | FX Receiver       |

---

## 🎯 Why This Works

The backend already calculates `userSide` correctly:

-   **BUYER** = User paying Naira (has money in escrow)
-   **SELLER** = User expecting Naira (will receive Naira)

So the mobile app just needs to:

1. Check `order.userSide === 'BUYER'` → Display "BUY"
2. Check `order.userSide === 'SELLER'` → Display "SELL"

That's it! No complex calculations needed on the mobile side.

---

## 📝 Complete OrderItem.tsx Example

```tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { P2POrder, User } from '@/types';

interface OrderItemProps {
    order: P2POrder;
    user: User;
    onPress: () => void;
}

export function OrderItem({ order, user, onPress }: OrderItemProps) {
    // ✅ SIMPLE: Just use userSide from backend
    const isBuy = order.userSide === 'BUYER';

    // Determine counterparty
    const counterparty = isBuy ? order.seller : order.buyer;
    const counterpartyRole = isBuy ? 'FX Sender' : 'FX Receiver';

    // Display values
    const action = isBuy ? 'BUY' : 'SELL';
    const currency = order.ad.currency;
    const amount = order.amount;
    const totalNgn = order.totalNgn;

    return (
        <TouchableOpacity onPress={onPress}>
            <View>
                {/* Main action */}
                <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                    {action} {amount} {currency}
                </Text>

                {/* Amount in Naira */}
                <Text>₦{totalNgn.toLocaleString()}</Text>

                {/* Counterparty */}
                <Text>
                    {counterpartyRole}: {counterparty?.firstName} {counterparty?.lastName}
                </Text>

                {/* Status */}
                <Text>Status: {order.status}</Text>
            </View>
        </TouchableOpacity>
    );
}
```

---

## ✅ Summary

**Change 1 line of code:**

```tsx
// OLD
const isBuy = !iAmFxSender;

// NEW
const isBuy = order.userSide === 'BUYER';
```

That's it! The backend does all the heavy lifting.
