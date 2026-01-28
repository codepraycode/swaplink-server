# Feature Implementation Reference

This document provides a comprehensive overview of the backend features implemented for Swaplink, including Push Notifications, User Management, and their integration into the transfer system.

## 1. Push Notifications

### Overview

We use `expo-server-sdk` to send push notifications to mobile devices. Users must register their Expo Push Token with the backend to receive notifications.

### Database Schema

The `User` model in `prisma/schema.prisma` includes a `pushToken` field:

```prisma
model User {
  // ... other fields
  pushToken String? // Stores the Expo Push Token
}
```

### Service: `NotificationService`

Located at `src/services/notification.service.ts`.

-   **`sendToUser(userId, title, body, data)`**: Sends a notification to a specific user.
    -   Handles `DeviceNotRegistered` errors by automatically removing invalid tokens from the database.
    -   Uses `expo-server-sdk` for reliable delivery.

---

## 2. User Management

### API Endpoints

#### Update Push Token

Registers the device for push notifications.

-   **Endpoint**: `PUT /api/v1/users/push-token`
-   **Auth**: Required (`Bearer <token>`)
-   **Body**:
    ```json
    { "token": "ExponentPushToken[...]" }
    ```

#### Change Password

Allows authenticated users to change their password.

-   **Endpoint**: `POST /api/v1/users/change-password`
-   **Auth**: Required
-   **Body**:
    ```json
    { "oldPassword": "current_password", "newPassword": "new_secure_password" }
    ```
-   **Logic**: Verifies `oldPassword` using `bcrypt` before hashing and saving `newPassword`.

#### Update Profile

Updates user profile information.

-   **Endpoint**: `PUT /api/v1/users/profile`
-   **Auth**: Required
-   **Body**:
    ```json
    { "firstName": "NewName", "lastName": "NewLast" }
    ```
    _(Accepts any valid field defined in `UserService.updateProfile` whitelist)_

---

## 3. Transfer Integration & Notifications

Notifications are triggered automatically during transfer events.

### Internal Transfers

-   **Trigger**: When a transfer is successfully processed in `TransferService.processInternalTransfer`.
-   **Receiver Notification**:
    -   **Title**: "Credit Alert"
    -   **Body**: "You received ₦5,000 from John Doe"
    -   **Data**: `{ "type": "DEPOSIT", "transactionId": "...", "sender": { "name": "John Doe", "id": "..." } }`
-   **Sender Notification**:
    -   **Title**: "Debit Alert"
    -   **Body**: "You sent ₦5,000 to Jane Doe"
    -   **Data**: `{ "type": "DEBIT", "transactionId": "...", "sender": { "name": "John Doe", "id": "..." } }`
-   **Socket Event**: `WALLET_UPDATED` event emitted to receiver includes `sender` info.

### External Transfers

-   **Trigger**: Processed asynchronously via `TransferWorker`.
-   **Success Notification**:
    -   **Title**: "Transfer Successful"
    -   **Body**: "Your transfer of ₦5,000 was successful."
    -   **Data**: `{ "type": "TRANSFER_SUCCESS", "sender": { "name": "System", "id": "SYSTEM" } }`
-   **Failure Notification**:
    -   **Title**: "Transfer Failed"
    -   **Body**: "Your transfer of ₦5,000 failed and has been reversed."
    -   **Data**: `{ "type": "TRANSFER_FAILED", "sender": { "name": "System", "id": "SYSTEM" } }`

---

## 4. Frontend Integration Guide

### Push Notification Listener

Handle incoming notifications in your Expo app:

```javascript
import * as Notifications from 'expo-notifications';

Notifications.addNotificationReceivedListener(notification => {
    const { type, transactionId, sender } = notification.request.content.data;

    if (type === 'DEPOSIT') {
        console.log(`Received money from ${sender.name}`);
        // Refresh wallet balance or show modal
    }
});
```

### Socket Event Listener

Listen for real-time wallet updates:

```javascript
socket.on('WALLET_UPDATED', data => {
    // data structure:
    // {
    //   balance: 50000,
    //   message: "Credit Alert: +₦5,000",
    //   sender: { name: "John Doe", id: "..." } // Present if available
    // }

    updateBalance(data.balance);

    if (data.sender) {
        showToast(`Received from ${data.sender.name}`);
    }
});
```

## 5. Testing with Postman

1.  **Login** to get an Access Token.
2.  **Set Token** in Authorization header (`Bearer <token>`).
3.  **Update Push Token**: `PUT /users/push-token` with a valid Expo token.
4.  **Perform Transfer**: Call the transfer endpoint.
5.  **Verify**: Check the Expo Push Tool or your device for the notification.
