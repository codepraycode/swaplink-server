# P2P Order Status Flow Implementation

## Overview

This document outlines the implementation of the P2P order status flow with asynchronous fund release.

## Status Flow

### 1. **PENDING → PAID**

-   **Trigger**: Buyer sends proof of payment
-   **Action**: `markAsPaid()` is called by the buyer (taker in SELL_FX ads, or maker in BUY_FX ads)
-   **Result**:
    -   Order status updated to `PAID`
    -   Notification sent to the seller (ad creator) to verify and release funds
    -   Funds remain locked

### 2. **PAID → COMPLETED**

-   **Trigger**: Seller (ad creator) confirms receipt of payment and releases funds
-   **Action**: `confirmOrder()` is called by the ad creator (maker)
-   **Authorization**: Only the ad creator can mark an order as completed
-   **Result**:
    -   Order status updated to `COMPLETED`
    -   Fee and receive amount calculated and stored
    -   Async fund release job queued
    -   Immediate response: "Order confirmed. Funds will be released soon."
    -   System message posted to chat
    -   Notifications sent to both parties

### 3. **Fund Release (Async Worker)**

-   **Trigger**: Worker picks up `release-funds` job from queue
-   **Process**:
    1. Idempotency check (prevents duplicate processing)
    2. Debit payer's locked balance
    3. Credit receiver's balance (total - fee)
    4. Credit revenue wallet (fee)
    5. Update user cumulative inflow
    6. Create transaction records for audit trail
    7. Send notification to receiver about fund receipt
-   **Non-blocking**: API responds immediately; funds move in background

## Key Components

### Files Modified

1. **`src/api/modules/p2p/order/p2p-order.service.ts`**

    - Updated `confirmOrder()` to be non-blocking
    - Removed synchronous transaction processing
    - Added queue job triggering

2. **`src/worker/p2p-order.worker.ts`**

    - Added `processFundRelease()` function
    - Implemented complete fund movement logic
    - Added idempotency checks
    - Added notifications after successful fund release
    - Updated worker to handle multiple job types (`order-timeout`, `release-funds`)

3. **`src/api/modules/p2p/p2p-order.service.ts`**

    - Updated `releaseFunds()` method (if used elsewhere)
    - Made it non-blocking with queue integration

4. **`src/api/modules/p2p/order/p2p-order.controller.ts`**
    - Updated response message for `confirm` endpoint

## Authorization Rules

-   **Mark as Paid**: Only the FX payer can mark an order as paid

    -   For BUY_FX ads: Taker is FX payer
    -   For SELL_FX ads: Maker is FX payer

-   **Confirm & Release Funds**: Only the ad creator (maker) can confirm and release funds
    -   This ensures the seller verifies payment before releasing funds

## Benefits

1. **Non-blocking API**: Users get immediate feedback
2. **Better UX**: Clear messaging about async processing
3. **Reliability**: Idempotency prevents duplicate fund transfers
4. **Scalability**: Worker can process fund releases independently
5. **Audit Trail**: Complete transaction records created
6. **Notifications**: Users informed at each step

## Fee Structure

-   **Fee Percentage**: 1% of total NGN amount
-   **Fee Deduction**: From the NGN receiver
-   **Revenue Wallet**: Fees credited to service revenue wallet

## Future Enhancements

-   Add retry logic for failed fund releases
-   Implement dead letter queue for failed jobs
-   Add monitoring/alerting for stuck jobs
-   Consider adding webhook notifications
