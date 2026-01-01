# P2P Payment Proof Upload Logic

## Core Definitions

### Ad Types

-   **BUY_FX**: Someone is **giving Naira to obtain foreign currency**
    -   Ad creator wants to receive FX and will pay Naira
-   **SELL_FX**: Someone is **giving FX to obtain Naira**
    -   Ad creator wants to send FX and receive Naira

### Golden Rule

**The person who transfers the FX uploads the receipt and marks the order as paid.**

---

## Scenarios Explained

### Scenario 1: BUY_FX Ad

**Ad Creator (Maker):**

-   "I want to BUY foreign currency"
-   "I will give Naira, I want to receive FX"
-   Locks Naira in the ad

**Order Taker (Taker):**

-   "I will sell you FX"
-   "I will send FX, I want Naira"
-   **Sends FX to Maker's external bank account**

**Who uploads proof?** → **TAKER** ✓

-   The Taker is transferring FX
-   The Taker uploads the receipt
-   Order is automatically marked as PAID

---

### Scenario 2: SELL_FX Ad

**Ad Creator (Maker):**

-   "I want to SELL foreign currency"
-   "I will give FX, I want to receive Naira"
-   **Sends FX to Taker's external bank account**

**Order Taker (Taker):**

-   "I will buy your FX"
-   "I will give Naira, I want FX"
-   Locks Naira when creating the order

**Who uploads proof?** → **MAKER** ✓

-   The Maker is transferring FX
-   The Maker uploads the receipt
-   Order is automatically marked as PAID

---

## Summary Table

| Ad Type     | Maker Action                | Taker Action                | FX Sender | Proof Uploader |
| ----------- | --------------------------- | --------------------------- | --------- | -------------- |
| **BUY_FX**  | Wants FX<br/>Pays Naira     | Sends FX<br/>Receives Naira | **Taker** | **Taker** ✓    |
| **SELL_FX** | Sends FX<br/>Receives Naira | Wants FX<br/>Pays Naira     | **Maker** | **Maker** ✓    |

---

## Implementation

### Authorization Check (markAsPaid method)

```typescript
// Who sends FX and uploads proof?
// If BUY_FX: Maker wants FX, Taker sends FX → Taker uploads proof
// If SELL_FX: Maker sends FX, Taker wants FX → Maker uploads proof
const isFxSender =
    (order.ad.type === AdType.BUY_FX && userId === order.takerId) ||
    (order.ad.type === AdType.SELL_FX && userId === order.makerId);

if (!isFxSender) throw new ForbiddenError('Only the FX sender can upload payment proof');
```

---

## Key Points

1. **FX is the external asset** - transferred via bank/payment method outside the platform
2. **Naira is the escrowed asset** - locked within the platform
3. **Proof is for the FX transfer** - the external payment that happens outside the platform
4. **The FX sender uploads proof** - to show they completed their part of the trade
5. **Upload automatically marks as PAID** - the order status changes when proof is uploaded

---

## Your Original Scenario

**"I want to sell FX, I send 200 USD"**

1. You're selling FX → You respond to a **BUY_FX** ad (someone wants to buy FX)
2. You are the **Taker** (responding to their ad)
3. You **send 200 USD** to the buyer's bank account
4. ✅ **You upload the receipt** (because you're the FX sender)
5. Order is automatically marked as PAID

**This is now working correctly!** The 403 error was because the logic was checking the wrong condition. Now it correctly identifies that the Taker on a BUY_FX ad is the FX sender and can upload proof.
