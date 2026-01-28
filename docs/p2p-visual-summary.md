# P2P Flow - Visual Summary

## Quick Decision Tree

```
Are you creating an ad or responding to one?

├─ Creating an Ad
│  ├─ BUY_FX (I want to buy FX)
│  │  ├─ I lock Naira NOW (at ad creation)
│  │  ├─ I provide my FX bank account
│  │  └─ Later: I confirm when FX arrives
│  │
│  └─ SELL_FX (I want to sell FX)
│     ├─ I don't lock anything NOW
│     ├─ I don't provide bank account
│     └─ Later: I upload proof when I send FX
│
└─ Responding to an Ad
   ├─ BUY_FX Ad (Someone wants to buy FX)
   │  ├─ I will sell them FX
   │  ├─ I don't lock Naira (they already did)
   │  ├─ I send FX to their bank account
   │  └─ I upload proof of FX transfer
   │
   └─ SELL_FX Ad (Someone wants to sell FX)
      ├─ I will buy their FX
      ├─ I lock Naira NOW (at order creation)
      ├─ I provide my FX bank account
      └─ I confirm when FX arrives
```

---

## Who Does What - Simple Table

| Action                            | BUY_FX Ad | SELL_FX Ad |
| --------------------------------- | --------- | ---------- |
| **Locks Naira at Ad Creation**    | Maker     | -          |
| **Locks Naira at Order Creation** | -         | Taker      |
| **Sends FX**                      | Taker     | Maker      |
| **Uploads Proof**                 | Taker     | Maker      |
| **Confirms Receipt**              | Maker     | Taker      |
| **Receives Naira**                | Taker     | Maker      |

---

## Your Debug Case Explained

```
You are: TAKER
Ad Type: SELL_FX
```

**What this means:**

-   Someone created a SELL_FX ad (they want to sell FX)
-   You responded (you want to buy FX)
-   **You locked Naira** when creating the order ✅
-   **They will send FX** to your bank account
-   **They will upload proof** (not you!) ❌
-   **You will confirm** when FX arrives ✅

**Why you got 403 Forbidden:**

-   You tried to upload proof
-   But you're not the FX sender
-   The Maker (ad creator) is the FX sender
-   Only the FX sender can upload proof
-   **This is correct behavior!** ✅

---

## Simple Rules to Remember

1. **FX sender uploads proof** (always!)
2. **FX receiver confirms receipt** (always!)
3. **Naira sender's money is locked** (always!)
4. **Naira receiver gets paid after confirmation** (always!)

---

## Mobile App Implementation Guide

### When showing "Upload Proof" button:

```typescript
// Show upload button only if user is FX sender
const canUploadProof =
    (order.ad.type === 'BUY_FX' && userId === order.takerId) ||
    (order.ad.type === 'SELL_FX' && userId === order.makerId);

if (canUploadProof) {
    // Show "Upload Proof" button
}
```

### When showing "Confirm Receipt" button:

```typescript
// Show confirm button only if user is FX receiver (Naira sender)
const canConfirm =
    (order.ad.type === 'BUY_FX' && userId === order.makerId) ||
    (order.ad.type === 'SELL_FX' && userId === order.takerId);

if (canConfirm && order.status === 'PAID') {
    // Show "Confirm Receipt" button
}
```

### When showing order details:

```typescript
// Determine user's role
const userRole = userId === order.makerId ? 'MAKER' : 'TAKER';
const isFxSender =
    (order.ad.type === 'BUY_FX' && userRole === 'TAKER') ||
    (order.ad.type === 'SELL_FX' && userRole === 'MAKER');

// Show appropriate message
if (isFxSender) {
    if (order.status === 'PENDING') {
        message = 'Send FX and upload proof';
    }
} else {
    if (order.status === 'PENDING') {
        message = 'Waiting for FX sender to upload proof';
    } else if (order.status === 'PAID') {
        message = 'Proof uploaded. Confirm when FX arrives';
    }
}
```

---

## Common Mistakes to Avoid

❌ **Wrong**: "I'm buying FX, so I upload proof"
✅ **Correct**: "I'm sending FX, so I upload proof"

❌ **Wrong**: "I locked Naira, so I upload proof"
✅ **Correct**: "I'm sending FX, so I upload proof"

❌ **Wrong**: "I'm the Taker, so I always upload proof"
✅ **Correct**: "If I'm sending FX, I upload proof (depends on ad type)"

---

## Final Checklist for Mobile App

-   [ ] Show "Upload Proof" button only to FX sender
-   [ ] Show "Confirm Receipt" button only to FX receiver
-   [ ] Display correct bank account details (where to send FX)
-   [ ] Show correct status messages based on user role
-   [ ] Lock Naira at the right time (ad creation vs order creation)
-   [ ] Request payment method at the right time
