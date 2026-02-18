# P2P Sell FX Flow Update Summary

This document summarizes the changes made to support the workflow where a buyer creates an order for a **SELL_FX** ad without providing initial proof, putting the order in a "waiting" state for the seller.

## 1. New Order Status: `AWAITING_MAKER_PAYMENT`

A new status has been added to the `OrderStatus` enum.

- **Definition**: This status indicates that a taker (buyer) has successfully reserved funds for a `SELL_FX` ad, and the system is now expecting the ad creator (maker/seller) to send the FX and provide proof of payment.

## 2. Updated Order Creation Flow

The `POST /api/v1/p2p/orders` endpoint has been updated to be more flexible:

- **For `BUY_FX` Ads**: The taker (seller) **must still** provide payment proof (`proof` file) immediately upon creation. Status starts at `IN_PROGRESS`.
- **For `SELL_FX` Ads**: The taker (buyer) **does not** provide a proof file. The order is created with status `AWAITING_MAKER_PAYMENT`.

## 3. New Endpoints for Ad Creators (Makers)

A new endpoint has been added to allow the ad creator to progress the order:

- **`PATCH /api/v1/p2p/orders/:id/proof`**:
    - **Who**: The Ad Owner (Maker) of a `SELL_FX` ad.
    - **Payload**: `multipart/form-data` with a `proof` file.
    - **Action**: Uploads the proof, updates the order status to `IN_PROGRESS`, and notifies the taker (buyer).

## 4. Mobile Integration Requirements

### Order Details Screen

- **Status Display**: If status is `AWAITING_MAKER_PAYMENT`:
    - **Buyer (Taker)**: Show message "Waiting for seller to send FX and upload proof".
    - **Seller (Maker)**: Show an "Upload Payment Proof" button that hits the new `/proof` endpoint.
- **Workflow Change**: Once the Maker uploads proof via the new endpoint, the status moves to `IN_PROGRESS`, and the Buyer will see the "Confirm Receipt" button enabled (as per the standard flow).

### Notifications

- Makers will receive a notification when a `SELL_FX` order is created: _"New Order for [Amount]. Please send FX and upload proof."_
- Takers will receive a notification once the Maker uploads proof: _"The seller has submitted proof... You can now confirm the receipt."_
