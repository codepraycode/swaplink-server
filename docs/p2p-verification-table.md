# P2P Authorization Verification Table

## Complete Flow Matrix

| Ad Type     | User Role | Sends FX? | Sends Naira? | Naira Locked When? | Can Upload Proof? | Can Confirm Receipt? |
| ----------- | --------- | --------- | ------------ | ------------------ | ----------------- | -------------------- |
| **BUY_FX**  | Maker     | ❌ No     | ✅ Yes       | Ad creation        | ❌ No             | ✅ Yes               |
| **BUY_FX**  | Taker     | ✅ Yes    | ❌ No        | -                  | ✅ Yes            | ❌ No                |
| **SELL_FX** | Maker     | ✅ Yes    | ❌ No        | -                  | ✅ Yes            | ❌ No                |
| **SELL_FX** | Taker     | ❌ No     | ✅ Yes       | Order creation     | ❌ No             | ✅ Yes               |

---

## Your Debug Case Verification

### Input

```javascript
{
  type: 'SELL_FX',
  maker: '1eccdfb1-298e-46b3-bfaa-b8f5c081dfa9',
  taker: 'c2954880-5ec5-4d18-b6d4-0a1c116063f5',
  userId: 'c2954880-5ec5-4d18-b6d4-0a1c116063f5'  // User is the TAKER
}
```

### Analysis

-   **Ad Type**: SELL_FX
-   **User Role**: Taker (userId matches taker ID)
-   **Who sends FX?**: Maker (in SELL_FX, Maker sends FX)
-   **Who sends Naira?**: Taker (in SELL_FX, Taker sends Naira)
-   **Can Taker upload proof?**: ❌ **NO** (Taker doesn't send FX)
-   **Expected Result**: 403 Forbidden ✅

### Authorization Check

```typescript
const isFxSender =
    (order.ad.type === AdType.BUY_FX && userId === order.takerId) ||
    (order.ad.type === AdType.SELL_FX && userId === order.makerId);

// For your case:
// (AdType.SELL_FX && userId === makerId)
// (SELL_FX && 'c2954880...' === '1eccdfb1...')
// (true && false) = FALSE

if (!isFxSender) throw new ForbiddenError('Only the FX sender can upload payment proof');
// !FALSE = TRUE → Throws error ✅ CORRECT!
```

---

## Summary of Rules

### BUY_FX Ad

**Maker (Ad Creator):**

-   Wants to BUY FX
-   Sends: Naira (locked at ad creation)
-   Receives: FX
-   Actions: ❌ Cannot upload proof | ✅ Can confirm receipt

**Taker (Order Creator):**

-   Wants to SELL FX
-   Sends: FX (external transfer)
-   Receives: Naira
-   Actions: ✅ Can upload proof | ❌ Cannot confirm receipt

### SELL_FX Ad

**Maker (Ad Creator):**

-   Wants to SELL FX
-   Sends: FX (external transfer)
-   Receives: Naira
-   Actions: ✅ Can upload proof | ❌ Cannot confirm receipt

**Taker (Order Creator):**

-   Wants to BUY FX
-   Sends: Naira (locked at order creation)
-   Receives: FX
-   Actions: ❌ Cannot upload proof | ✅ Can confirm receipt

---

## Code Implementation

### Upload Proof Authorization (markAsPaid)

```typescript
// Only FX sender can upload proof
const isFxSender =
    (order.ad.type === AdType.BUY_FX && userId === order.takerId) || // BUY_FX: Taker sends FX
    (order.ad.type === AdType.SELL_FX && userId === order.makerId); // SELL_FX: Maker sends FX

if (!isFxSender) throw new ForbiddenError('Only the FX sender can upload payment proof');
```

### Confirm Receipt Authorization (confirmOrder)

```typescript
// Only FX receiver (Naira sender) can confirm
const isNairaSender =
    (order.ad.type === AdType.BUY_FX && userId === order.makerId) || // BUY_FX: Maker sends Naira
    (order.ad.type === AdType.SELL_FX && userId === order.takerId); // SELL_FX: Taker sends Naira

if (!isNairaSender) throw new ForbiddenError('Only the FX receiver can confirm receipt');
```

---

## Test Cases

### Test Case 1: BUY_FX - Taker uploads proof ✅

```javascript
{ type: 'BUY_FX', maker: 'M', taker: 'T', userId: 'T' }
// isFxSender = (BUY_FX && T === T) = TRUE ✅
// Result: Upload allowed
```

### Test Case 2: BUY_FX - Maker tries to upload proof ❌

```javascript
{ type: 'BUY_FX', maker: 'M', taker: 'T', userId: 'M' }
// isFxSender = (BUY_FX && M === T) = FALSE ❌
// Result: 403 Forbidden (Correct!)
```

### Test Case 3: SELL_FX - Maker uploads proof ✅

```javascript
{ type: 'SELL_FX', maker: 'M', taker: 'T', userId: 'M' }
// isFxSender = (SELL_FX && M === M) = TRUE ✅
// Result: Upload allowed
```

### Test Case 4: SELL_FX - Taker tries to upload proof ❌ (YOUR CASE)

```javascript
{ type: 'SELL_FX', maker: '1eccdfb1...', taker: 'c2954880...', userId: 'c2954880...' }
// isFxSender = (SELL_FX && 'c2954880...' === '1eccdfb1...') = FALSE ❌
// Result: 403 Forbidden (Correct!)
```

---

## Conclusion

✅ **The authorization logic is 100% CORRECT!**

In your debug case:

-   You are the **Taker** on a **SELL_FX** ad
-   The **Maker** should upload proof (because Maker sends FX)
-   You (Taker) should **NOT** be able to upload proof
-   The 403 Forbidden error is **EXPECTED and CORRECT**

**If you're the Taker on a SELL_FX ad:**

-   You send Naira (locked at order creation) ✅
-   You receive FX ✅
-   You **confirm receipt** after receiving FX ✅
-   You do **NOT** upload proof ❌ (Maker does that)
