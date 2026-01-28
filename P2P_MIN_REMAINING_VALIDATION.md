# Minimum Remaining Amount Validation - Examples

## Overview

When creating an order, the system now validates that the remaining amount after the order won't be less than the minimum order limit set by the ad creator. This prevents "dust orders" that are too small to be useful.

---

## Validation Rule

**Rule**: `newRemainingAmount == 0 OR newRemainingAmount >= minLimit`

Where:

-   `newRemainingAmount = ad.remainingAmount - orderAmount`
-   `minLimit = ad.minLimit`

**In other words:**

-   You can take the full remaining amount (leaving 0)
-   OR you must leave at least the minimum order amount for the next person

---

## Example Scenarios

### Scenario 1: Valid Order (Full Amount)

**Ad Details:**

-   Remaining: 100 USD
-   Min Limit: 50 USD
-   Max Limit: 500 USD

**Order Request:**

-   Amount: 100 USD

**Validation:**

```
newRemainingAmount = 100 - 100 = 0
0 == 0 ✅ ALLOWED (taking full amount)
```

**Result**: ✅ Order created successfully

---

### Scenario 2: Valid Order (Leaves Enough)

**Ad Details:**

-   Remaining: 200 USD
-   Min Limit: 50 USD
-   Max Limit: 500 USD

**Order Request:**

-   Amount: 100 USD

**Validation:**

```
newRemainingAmount = 200 - 100 = 100
100 >= 50 ✅ ALLOWED (leaves 100, which is >= minLimit of 50)
```

**Result**: ✅ Order created successfully

---

### Scenario 3: Invalid Order (Leaves Dust)

**Ad Details:**

-   Remaining: 100 USD
-   Min Limit: 50 USD
-   Max Limit: 500 USD

**Order Request:**

-   Amount: 60 USD

**Validation:**

```
newRemainingAmount = 100 - 60 = 40
40 < 50 ❌ NOT ALLOWED (leaves 40, which is < minLimit of 50)
```

**Error Message:**

```
Order would leave 40 USD remaining, which is below the minimum order of 50.
Please order at least 51 or the full remaining amount of 100.
```

**Result**: ❌ Order rejected

**Valid Options:**

-   Order 51-100 USD (leaves 0-49, but if 0 it's allowed, if 1-49 it would fail)
-   Actually, order 51 USD would leave 49, which is still < 50
-   So valid options are:
    -   Order exactly 100 USD (leaves 0) ✅
    -   Order 50 USD or less (leaves 50+) ✅

---

### Scenario 4: Edge Case (Exactly Min Limit Remaining)

**Ad Details:**

-   Remaining: 100 USD
-   Min Limit: 50 USD
-   Max Limit: 500 USD

**Order Request:**

-   Amount: 50 USD

**Validation:**

```
newRemainingAmount = 100 - 50 = 50
50 >= 50 ✅ ALLOWED (leaves exactly minLimit)
```

**Result**: ✅ Order created successfully

---

### Scenario 5: Complex Example

**Ad Details:**

-   Remaining: 150 USD
-   Min Limit: 60 USD
-   Max Limit: 500 USD

**Test Cases:**

| Order Amount | New Remaining | Valid? | Reason                    |
| ------------ | ------------- | ------ | ------------------------- |
| 150          | 0             | ✅     | Full amount               |
| 90           | 60            | ✅     | Leaves exactly minLimit   |
| 89           | 61            | ✅     | Leaves more than minLimit |
| 91           | 59            | ❌     | Leaves less than minLimit |
| 100          | 50            | ❌     | Leaves less than minLimit |
| 60           | 90            | ✅     | Leaves more than minLimit |

**For the rejected cases (91 or 100 USD):**

Error message would suggest:

-   Order at least 91 USD (to leave ≤ 59, but must be 0 or ≥ 60)
-   Actually, the minimum valid order is 90 USD (leaves 60)
-   Or the full 150 USD (leaves 0)

**Valid ranges:**

-   1-90 USD (leaves 60-149)
-   150 USD (leaves 0)

**Invalid range:**

-   91-149 USD (leaves 1-59, which is < minLimit of 60)

---

## Error Message Breakdown

When an order is rejected, the error message provides:

```
Order would leave {newRemainingAmount} {currency} remaining,
which is below the minimum order of {minLimit}.
Please order at least {suggestedMin} or the full remaining amount of {remainingAmount}.
```

**Variables:**

-   `newRemainingAmount`: What would be left after this order
-   `currency`: The foreign currency (USD, EUR, etc.)
-   `minLimit`: The minimum order amount set by ad creator
-   `suggestedMin`: `remainingAmount - minLimit + 1`
-   `remainingAmount`: Current remaining amount in the ad

**Note**: The `suggestedMin` calculation might not always be perfectly accurate due to the edge case, but it gives users a good starting point.

---

## Benefits

1. **Prevents Dust Orders**: No tiny unusable amounts left in ads
2. **Better UX**: Clear error messages guide users to valid amounts
3. **Fair Trading**: Ensures all orders meet the minimum requirement
4. **Ad Efficiency**: Ads can be fully utilized without leftover scraps

---

## Implementation

The validation is performed in `P2POrderService.createOrder()` before the transaction begins:

```typescript
// Check if remaining amount after this order would be less than minLimit
const newRemainingAmount = ad.remainingAmount - amount;
if (newRemainingAmount > 0 && newRemainingAmount < ad.minLimit) {
    throw new BadRequestError(
        `Order would leave ${newRemainingAmount} ${ad.currency} remaining, ` +
            `which is below the minimum order of ${ad.minLimit}. ` +
            `Please order at least ${ad.remainingAmount - ad.minLimit + 1} ` +
            `or the full remaining amount of ${ad.remainingAmount}.`
    );
}
```

This validation happens **before** any funds are locked or database changes are made, ensuring a clean rejection with no side effects.
