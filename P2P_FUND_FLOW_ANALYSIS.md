# P2P Fund Flow Analysis

## Current Flow Summary

### Scenario 1: BUY_FX Ad (Maker wants to buy foreign currency with NGN)

**Ad Creation:**

-   ✅ Maker locks `totalAmount * price` NGN in wallet
-   ✅ Funds are in `lockedBalance`

**Order Creation (Taker sells FX):**

-   ✅ Ad's `remainingAmount` is decremented by order amount
-   ✅ No additional funds locked (Maker's funds already locked in ad)

**Order Cancellation:**

-   ✅ Ad's `remainingAmount` is incremented back
-   ✅ No wallet changes (funds stay locked in ad)

**Ad Closure:**

-   ✅ Remaining NGN is unlocked: `remainingAmount * price`
-   ✅ Wallet `lockedBalance` is decremented

**Order Completion:**

-   ✅ Worker debits from Maker's `lockedBalance`
-   ✅ Worker credits Taker's `balance` (minus fee)
-   ✅ Fee goes to revenue wallet

**ISSUE FOUND:** When order completes, funds are unlocked from Maker's wallet, but the Ad's `remainingAmount` is NOT restored! This means:

-   If Maker has multiple orders from the same ad
-   When orders complete, the funds are released from locked balance
-   But the ad still shows reduced `remainingAmount`
-   When Maker closes the ad, it tries to unlock `remainingAmount * price` again
-   This could unlock MORE than what was originally locked!

---

### Scenario 2: SELL_FX Ad (Maker wants to sell foreign currency for NGN)

**Ad Creation:**

-   ✅ No NGN locked (Maker will send FX externally)
-   ✅ No wallet changes

**Order Creation (Taker buys FX):**

-   ✅ Ad's `remainingAmount` is decremented
-   ✅ Taker locks `totalNgn` in their wallet
-   ✅ Taker's `lockedBalance` is incremented

**Order Cancellation:**

-   ✅ Ad's `remainingAmount` is incremented back
-   ✅ Taker's `lockedBalance` is decremented
-   ✅ Funds returned to Taker

**Ad Closure:**

-   ✅ No refund needed (no NGN was locked)
-   ✅ Ad status set to CLOSED

**Order Completion:**

-   ✅ Worker debits from Taker's `lockedBalance`
-   ✅ Worker credits Maker's `balance` (minus fee)
-   ✅ Fee goes to revenue wallet

**ISSUE FOUND:** Same as Scenario 1 - when order completes, the ad's `remainingAmount` is not restored.

---

## Critical Issues Identified

### Issue #1: Ad remainingAmount Not Restored on Order Completion ⚠️

**Problem:**
When an order completes, the funds are moved between wallets, but the ad's `remainingAmount` stays decremented. This creates accounting issues:

1. **For BUY_FX Ads:**
    - Ad created with 1000 USD, locks 1,500,000 NGN
    - Order 1: 250 USD → `remainingAmount` = 750 USD
    - Order 1 completes → 375,000 NGN unlocked from wallet
    - Ad still shows `remainingAmount` = 750 USD
    - When ad closes → tries to unlock 750 \* 1500 = 1,125,000 NGN
    - **Total unlocked: 375,000 + 1,125,000 = 1,500,000 NGN ✅ CORRECT**

Actually, wait... let me recalculate:

2. **Correct Analysis:**
    - Ad created: 1000 USD @ 1500 NGN/USD = 1,500,000 NGN locked
    - `remainingAmount` = 1000 USD
    - Order 1: 250 USD created
    - `remainingAmount` = 750 USD (decremented)
    - Order 1 completes:
        - Worker unlocks 250 \* 1500 = 375,000 NGN from `lockedBalance`
        - `remainingAmount` still = 750 USD
    - Ad closes:
        - Unlocks 750 \* 1500 = 1,125,000 NGN from `lockedBalance`
    - **Total unlocked: 375,000 + 1,125,000 = 1,500,000 NGN ✅**

**This is actually CORRECT!** The `remainingAmount` represents the amount still available in the ad, not the amount locked. When an order completes, the funds are released, and the `remainingAmount` correctly reflects what's left.

### Issue #2: Job Name Mismatch ⚠️

**Problem:**
In `p2p-order.service.ts` line 143:

```typescript
await getP2POrderQueue().add('checkOrderExpiration', { orderId: order.id }, ...)
```

But in `p2p-order.worker.ts` line 222:

```typescript
if (job.name === 'order-timeout') {
```

**The job names don't match!** This means expiration jobs are never processed.

**Fix:** Change job name to match.

---

## Recommendations

### Fix #1: Correct Job Name

Change the job name in service to match the worker.

### Fix #2: Verify Fund Locking Logic

The current logic is actually correct, but we should add comments to clarify.

### Fix #3: Add Balance Validation

Before unlocking funds, verify that the locked balance is sufficient.
