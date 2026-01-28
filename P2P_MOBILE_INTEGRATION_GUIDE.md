# P2P Mobile Integration Guide

## 📚 Overview

This guide details how to integrate the P2P (Peer-to-Peer) trading module into the mobile application. The backend handles fund locking, transaction logging, and real-time updates via sockets.

---

## 🔄 The P2P Order Lifecycle

1.  **Creation**: Taker creates an order from an Ad.
    -   _Status_: `PENDING`
2.  **Payment**: Taker pays NGN (Internal or External) and uploads proof.
    -   _Status_: `PAID`
3.  **Confirmation**: Maker (or NGN Receiver) confirms receipt.
    -   _Status_: `PROCESSING` → `COMPLETED` (Async Worker)
4.  **Completion**: Funds are released automatically.
    -   _Status_: `COMPLETED`

---

## 📡 API Endpoints

### 1. Ads (Marketplace)

| Method  | Endpoint                    | Description     | Payload                                                                       |
| :------ | :-------------------------- | :-------------- | :---------------------------------------------------------------------------- |
| `GET`   | `/api/v1/p2p/ads`           | List active ads | Query: `type` (BUY_FX/SELL_FX), `currency`, `amount`                          |
| `POST`  | `/api/v1/p2p/ads`           | Create a new ad | `{ type, currency, totalAmount, price, minLimit, maxLimit, paymentMethodId }` |
| `PATCH` | `/api/v1/p2p/ads/:id/close` | Close an ad     | -                                                                             |

**Note**:

-   `BUY_FX`: Maker wants to BUY FX (Gives NGN). **Requires `paymentMethodId`** (to receive FX).
-   `SELL_FX`: Maker wants to SELL FX (Gives FX). `paymentMethodId` is optional (Taker provides it in Order).

### 2. Orders

| Method  | Endpoint                         | Description       | Payload                              |
| :------ | :------------------------------- | :---------------- | :----------------------------------- |
| `GET`   | `/api/v1/p2p/orders`             | List my orders    | -                                    |
| `GET`   | `/api/v1/p2p/orders/:id`         | Get order details | -                                    |
| `POST`  | `/api/v1/p2p/orders`             | Create order      | `{ adId, amount, paymentMethodId? }` |
| `PATCH` | `/api/v1/p2p/orders/:id/confirm` | Confirm & Release | -                                    |
| `PATCH` | `/api/v1/p2p/orders/:id/cancel`  | Cancel order      | -                                    |

**Order Creation Logic**:

-   If Ad is `SELL_FX` (Maker Selling FX), Taker (You) must provide `paymentMethodId` to receive the FX.
-   If Ad is `BUY_FX` (Maker Buying FX), Taker (You) sends FX to Maker's bank details (returned in Order).

### 3. Chat & Payment Proof

| Method | Endpoint                             | Description              | Payload                              |
| :----- | :----------------------------------- | :----------------------- | :----------------------------------- |
| `POST` | `/api/v1/p2p/chat/upload`            | Upload Proof & Mark Paid | `file` (Multipart), Query: `orderId` |
| `GET`  | `/api/v1/p2p/chat/:orderId/messages` | Get chat history         | -                                    |

**Important**: Calling `/upload` with `orderId` automatically marks the order as **PAID**.

---

## 🔌 Real-Time Updates (Socket.IO)

Connect to the socket server and join the order room to receive updates.

### Events

1.  **Join Room**:

    ```javascript
    socket.emit('join_order', orderId);
    ```

2.  **Send Message**:

    ```javascript
    socket.emit('send_message', {
        orderId: '...',
        message: 'Hello, I sent the money.',
        imageUrl: '...', // Optional
    });
    ```

3.  **Receive Message**:

    ```javascript
    socket.on('new_message', chat => {
        // Append to chat list
        console.log(chat.message, chat.imageUrl);
    });
    ```

4.  **Typing Indicators**:
    ```javascript
    socket.emit('typing', { orderId });
    socket.on('user_typing', ({ userId }) => { ... });
    ```

---

## 📱 UI/UX Implementation Details

### 1. Order Details Screen

**Display Logic:**

-   **Timer**: Show `remainingTime` (counts down to 0). If 0, order is expired.
-   **Role**: Check `userSide` ('BUYER' or 'SELLER') to determine UI.
-   **Status Banners**:
    -   `PENDING`: "Please make payment" (Buyer) / "Waiting for payment" (Seller).
    -   `PAID`: "Payment marked. Waiting for confirmation" (Buyer) / "Confirm payment" (Seller).
    -   `PROCESSING`: "Releasing funds..." (Both). **Disable buttons.**
    -   `COMPLETED`: "Order Completed".

**Action Buttons:**

-   **Buyer**:
    -   "I Have Paid" -> Calls `/chat/upload` (Upload Proof).
    -   "Cancel" -> Calls `/cancel`.
-   **Seller**:
    -   "Confirm Payment" -> Calls `/confirm`. **Only enabled if status is PAID.**
    -   "Appeal/Dispute" -> (Future feature).

### 2. Fund Release Flow (Async)

When Seller clicks "Confirm Payment":

1.  Call `PATCH .../confirm`.
2.  **IMMEDIATELY** update UI to show "Processing...".
3.  The API returns success immediately, but funds move in background.
4.  Listen for Order Status change via Socket (or poll `GET /orders/:id`).
5.  When status becomes `COMPLETED`, show success modal.

### 3. Validation Rules

-   **Minimum Amount**: If user tries to create an order that leaves a tiny amount (dust) in the Ad, the API will return a `400 Bad Request` with a specific message. **Display this message to the user.**
    -   _Example_: "Order would leave 40 USD remaining... Please order at least 51..."

---

## ⚠️ Error Handling

Handle these specific error codes/messages:

-   `400 Bad Request`: "Amount must be between X and Y"
-   `400 Bad Request`: "Insufficient funds" (for Maker creating Ad)
-   `403 Forbidden`: "Only the buyer can mark order as paid"
-   `404 Not Found`: "Ad not found" (maybe closed/deleted)

---

## 🧪 Testing Scenarios

1.  **Happy Path (Buy FX)**:

    -   User A creates BUY_FX Ad.
    -   User B creates Order.
    -   User B uploads proof (Mark Paid).
    -   User A confirms.
    -   Check Balances.

2.  **Happy Path (Sell FX)**:

    -   User A creates SELL_FX Ad.
    -   User B creates Order (provides Payment Method).
    -   User B pays NGN.
    -   User B uploads proof.
    -   User A confirms.
    -   Check Balances.

3.  **Expiration**:
    -   Create Order.
    -   Wait 15 mins.
    -   Verify status changes to `CANCELLED`.
