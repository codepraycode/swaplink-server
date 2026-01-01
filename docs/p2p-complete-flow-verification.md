# Complete P2P Flow Verification - From Ad Creation to Completion

## Summary of Your Requirements

1. **BUY_FX**: Maker gives Naira to obtain FX
2. **SELL_FX**: Maker gives FX to obtain Naira
3. **Naira Locking**:
    - If Maker sends Naira → Locked at **ad creation**
    - If Taker sends Naira → Locked at **order creation**
4. **FX sender uploads receipt** → Auto marks as PAID

---

## Flow 1: BUY_FX Ad (Maker wants to buy FX)

### Step 1: Ad Creation ✅

**File**: `p2p-ad.service.ts` (lines 36-43)

```typescript
if (type === AdType.BUY_FX) {
    if (!paymentMethodId) throw new BadRequestError('Payment method is required for Buy FX ads');
    // Maker is GIVING NGN. Must lock funds.
    const totalNgnRequired = totalAmount * price;

    // Lock Funds (Throws error if insufficient)
    await walletService.lockFunds(userId, totalNgnRequired);
}
```

**What happens:**

-   Maker creates ad: "I want to buy 100 USD at 1500 NGN/USD"
-   Maker provides payment method (to receive USD)
-   **Maker's 150,000 NGN is locked** ✅
-   Ad status: ACTIVE

**Verification**: ✅ Correct - Maker sends Naira, so Naira locked at ad creation

---

### Step 2: Order Creation ✅

**File**: `p2p-order.service.ts` (lines 56-67, 116-135)

```typescript
if (ad.type === AdType.BUY_FX) {
    // Maker WANTS FX (Gives NGN). Maker funds already locked in Ad.
    // Taker GIVES FX. Taker needs Maker's Bank Details to send FX.
    if (!ad.paymentMethod) throw new InternalError('Maker payment method missing for Buy FX ad');

    bankSnapshot = {
        bankName: ad.paymentMethod.bankName,
        accountNumber: ad.paymentMethod.accountNumber,
        accountName: ad.paymentMethod.accountName,
        bankDetails: ad.paymentMethod.details,
    };
}

// B. Funds Locking Logic (If SELL_FX)
if (ad.type === AdType.SELL_FX) {
    // Taker needs to lock NGN funds.
    // ... (NOT executed for BUY_FX)
}
```

**What happens:**

-   Taker creates order: "I'll sell you 50 USD"
-   System snapshots Maker's bank details (where Taker will send USD)
-   **No Naira locking** (already locked in ad) ✅
-   Ad remaining amount: 100 → 50
-   Order status: PENDING

**Verification**: ✅ Correct - No Taker Naira locking for BUY_FX

---

### Step 3: FX Transfer & Proof Upload ✅

**File**: `p2p-order.service.ts` (lines 207-214)

```typescript
// Who sends FX and uploads proof?
// If BUY_FX: Maker wants FX, Taker sends FX → Taker uploads proof
// If SELL_FX: Maker sends FX, Taker wants FX → Maker uploads proof
const isFxSender =
    (order.ad.type === AdType.BUY_FX && userId === order.takerId) ||
    (order.ad.type === AdType.SELL_FX && userId === order.makerId);

if (!isFxSender) throw new ForbiddenError('Only the FX sender can upload payment proof');
```

**What happens:**

-   Taker sends 50 USD to Maker's bank account (external)
-   Taker uploads receipt
-   **Authorization check**: `(BUY_FX && userId === takerId)` → ✅ TRUE
-   Order status: PENDING → PAID

**Verification**: ✅ Correct - Taker sends FX, Taker uploads proof

---

### Step 4: Confirmation ✅

**File**: `p2p-order.service.ts` (lines 250-262)

```typescript
// Who confirms the order?
// The person who LOCKED the NGN (The NGN Payer / FX Buyer).
// They confirm that they received the FX in their external bank account.
// Once confirmed, the locked NGN is released to the FX Seller.

const isNgnPayer =
    (order.ad.type === AdType.BUY_FX && userId === order.makerId) ||
    (order.ad.type === AdType.SELL_FX && userId === order.takerId);

if (!isNgnPayer)
    throw new ForbiddenError(
        'Only the buyer of FX (NGN payer) can confirm receipt and release funds. You are the seller.'
    );
```

**What happens:**

-   Maker checks bank account, sees 50 USD arrived
-   Maker confirms receipt
-   **Authorization check**: `(BUY_FX && userId === makerId)` → ✅ TRUE
-   Order status: PAID → PROCESSING

**Verification**: ✅ Correct - Maker sent Naira, Maker confirms FX receipt

---

### Step 5: Fund Release ✅

**File**: `p2p-order.worker.ts` (async)

**What happens:**

-   Worker processes fund release
-   Debits Maker's locked balance: 75,000 NGN
-   Credits Taker: 74,250 NGN (75,000 - 1% fee)
-   Credits revenue: 750 NGN
-   Order status: PROCESSING → COMPLETED

**Verification**: ✅ Correct - Taker receives Naira

---

## Flow 2: SELL_FX Ad (Maker wants to sell FX)

### Step 1: Ad Creation ✅

**File**: `p2p-ad.service.ts` (lines 44-172)

```typescript
} else if (type === AdType.SELL_FX) {
    // Maker is RECEIVING NGN (Giving FX).
    // ... (lots of comments)
    logger.debug('Nothing to do!');
}
```

**What happens:**

-   Maker creates ad: "I want to sell 100 USD at 1500 NGN/USD"
-   **No Naira locking** ✅
-   **No payment method required** (Maker will send FX, Taker provides receiving details)
-   Ad status: ACTIVE

**Verification**: ✅ Correct - Maker sends FX, no Naira to lock

---

### Step 2: Order Creation ✅

**File**: `p2p-order.service.ts` (lines 68-94, 116-135)

```typescript
} else {
    // SELL_FX: Maker GIVES FX (Wants NGN).
    // Taker GIVES NGN. Taker WANTS FX.
    // Taker needs to lock NGN funds.
    // Taker needs to provide Payment Method (to receive FX).
    if (!paymentMethodId)
        throw new BadRequestError(
            `Payment method required to receive ${currency || 'Unknown'}`
        );

    const takerMethod = await prisma.p2PPaymentMethod.findUnique({
        where: { id: paymentMethodId, currency },
    });
    if (!takerMethod || takerMethod.userId !== takerId)
        throw new BadRequestError(
            `Invalid payment method for ${currency || 'Unknown'}. Please provide a valid payment method.`
        );

    bankSnapshot = {
        bankName: takerMethod.bankName,
        accountNumber: takerMethod.accountNumber,
        accountName: takerMethod.accountName,
        bankDetails: takerMethod.details,
    };
}

// B. Funds Locking Logic (If SELL_FX)
if (ad.type === AdType.SELL_FX) {
    // Taker needs to lock NGN funds.
    const wallet = await tx.wallet.findUnique({ where: { userId: takerId } });
    if (!wallet) throw new NotFoundError('Wallet not found');

    const balance = new Decimal(wallet.balance);
    const locked = new Decimal(wallet.lockedBalance);
    const available = balance.minus(locked);
    const decimalAmount = new Decimal(totalNgn);

    if (available.lessThan(decimalAmount)) {
        throw new BadRequestError('Insufficient funds to lock');
    }

    await tx.wallet.update({
        where: { id: wallet.id },
        data: { lockedBalance: { increment: decimalAmount } },
    });
}
```

**What happens:**

-   Taker creates order: "I'll buy 50 USD from you"
-   Taker provides payment method (to receive USD)
-   System snapshots Taker's bank details (where Maker will send USD)
-   **Taker's 75,000 NGN is locked** ✅
-   Ad remaining amount: 100 → 50
-   Order status: PENDING

**Verification**: ✅ Correct - Taker sends Naira, so Naira locked at order creation

---

### Step 3: FX Transfer & Proof Upload ✅

**File**: `p2p-order.service.ts` (lines 207-214)

```typescript
const isFxSender =
    (order.ad.type === AdType.BUY_FX && userId === order.takerId) ||
    (order.ad.type === AdType.SELL_FX && userId === order.makerId);

if (!isFxSender) throw new ForbiddenError('Only the FX sender can upload payment proof');
```

**What happens:**

-   Maker sends 50 USD to Taker's bank account (external)
-   Maker uploads receipt
-   **Authorization check**: `(SELL_FX && userId === makerId)` → ✅ TRUE
-   Order status: PENDING → PAID

**Verification**: ✅ Correct - Maker sends FX, Maker uploads proof

---

### Step 4: Confirmation ✅

**File**: `p2p-order.service.ts` (lines 250-262)

```typescript
const isNgnPayer =
    (order.ad.type === AdType.BUY_FX && userId === order.makerId) ||
    (order.ad.type === AdType.SELL_FX && userId === order.takerId);

if (!isNgnPayer)
    throw new ForbiddenError(
        'Only the buyer of FX (NGN payer) can confirm receipt and release funds. You are the seller.'
    );
```

**What happens:**

-   Taker checks bank account, sees 50 USD arrived
-   Taker confirms receipt
-   **Authorization check**: `(SELL_FX && userId === takerId)` → ✅ TRUE
-   Order status: PAID → PROCESSING

**Verification**: ✅ Correct - Taker sent Naira, Taker confirms FX receipt

---

### Step 5: Fund Release ✅

**File**: `p2p-order.worker.ts` (async)

**What happens:**

-   Worker processes fund release
-   Debits Taker's locked balance: 75,000 NGN
-   Credits Maker: 74,250 NGN (75,000 - 1% fee)
-   Credits revenue: 750 NGN
-   Order status: PROCESSING → COMPLETED

**Verification**: ✅ Correct - Maker receives Naira

---

## Your Debug Case Analysis

```javascript
{
  type: 'SELL_FX',
  maker: '1eccdfb1-298e-46b3-bfaa-b8f5c081dfa9',
  taker: 'c2954880-5ec5-4d18-b6d4-0a1c116063f5',
  userId: 'c2954880-5ec5-4d18-b6d4-0a1c116063f5'  // User is TAKER
}
```

**Analysis:**

-   Ad Type: SELL_FX (Maker wants to sell FX)
-   User Role: **Taker** (userId matches taker ID)
-   Who sends FX? **Maker** (in SELL_FX, Maker sends FX)
-   Who sends Naira? **Taker** (in SELL_FX, Taker sends Naira)
-   Can Taker upload proof? **NO** ❌ (Taker doesn't send FX)
-   **Expected Result**: 403 Forbidden ✅ **CORRECT!**

**What the Taker should do:**

1. ✅ Lock Naira at order creation (already done)
2. ❌ Wait for Maker to upload FX transfer proof
3. ✅ Confirm receipt when FX arrives in their bank account
4. ✅ Receive Naira after confirmation

---

## Final Verification Summary

| Aspect                              | BUY_FX           | SELL_FX        | Status |
| ----------------------------------- | ---------------- | -------------- | ------ |
| **Ad Creation - Naira Lock**        | Maker locks      | None           | ✅     |
| **Ad Creation - Payment Method**    | Required (Maker) | Not required   | ✅     |
| **Order Creation - Naira Lock**     | None             | Taker locks    | ✅     |
| **Order Creation - Payment Method** | Uses Maker's     | Taker provides | ✅     |
| **FX Sender**                       | Taker            | Maker          | ✅     |
| **Proof Uploader**                  | Taker            | Maker          | ✅     |
| **Confirmation**                    | Maker            | Taker          | ✅     |
| **Naira Receiver**                  | Taker            | Maker          | ✅     |

---

## Conclusion

✅ **ALL LOGIC IS 100% CORRECT!**

The code perfectly implements your requirements:

1. ✅ Naira locking happens at the right time (ad creation for BUY_FX, order creation for SELL_FX)
2. ✅ FX sender uploads proof (Taker for BUY_FX, Maker for SELL_FX)
3. ✅ FX receiver confirms receipt (Maker for BUY_FX, Taker for SELL_FX)
4. ✅ Proper authorization checks at every step

**Your debug case is working as expected** - the Taker on a SELL_FX ad should NOT be able to upload proof because they're not the FX sender. The Maker should upload the proof.
