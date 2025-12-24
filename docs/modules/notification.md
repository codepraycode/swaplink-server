# Notification Module Documentation

The Notification Module is a robust, event-driven system designed to handle real-time alerts and asynchronous communication across the SwapLink platform. It supports:

-   **Push Notifications**: Via Expo (for mobile apps).
-   **Emails**: Via Resend (for transactional emails).
-   **In-App Notifications**: Via Socket.IO and database persistence.

## Architecture

The module uses a **Producer-Consumer** pattern powered by **BullMQ** (Redis) and a Singleton **Event Bus**.

1.  **Event Bus**: Emits system events (e.g., `TRANSACTION_COMPLETED`).
2.  **Listeners**: Subscribe to events and trigger notification logic.
3.  **NotificationUtil**: Helper to persist notifications to the DB and add jobs to the queue.
4.  **Worker**: Processes background jobs to send external notifications (Push/Email).

---

## Backend Integration

### 1. Publishing Events

To trigger a notification, publish an event using the global `eventBus`.

```typescript
import { eventBus, EventType } from '../shared/lib/events/event-bus';

// Example: Triggering a transaction alert
eventBus.publish(EventType.TRANSACTION_COMPLETED, {
    userId: 'user-123',
    amount: 5000,
    type: 'DEPOSIT',
    counterpartyName: 'John Doe',
});
```

### 2. Sending Notifications Directly

If you need to send a notification without an event (e.g., from a specific API endpoint), use `NotificationUtil`.

```typescript
import NotificationUtil from '../shared/lib/services/notification/notification-utils';
import { NotificationType } from '../shared/database';

await NotificationUtil.sendToUser(
    userId,
    'Security Alert',
    'New login detected on your account.',
    { ip: '127.0.0.1' },
    NotificationType.SYSTEM
);
```

### 3. Adding New Listeners

1.  Create a listener file in `src/shared/lib/events/listeners/`.
2.  Subscribe to an event from `EventType`.
3.  Register the listener in `src/shared/lib/init/service-initializer.ts`.

```typescript
// src/shared/lib/events/listeners/custom.listener.ts
import { eventBus, EventType } from '../event-bus';

export function setupCustomListeners() {
    eventBus.subscribe(EventType.USER_REGISTERED, async data => {
        // Handle event
    });
}
```

---

## Mobile App Integration (Frontend)

To receive push notifications, the mobile app must register the device's Expo Push Token with the backend.

### 1. Register Push Token

Call this endpoint after the user logs in or grants notification permissions.

-   **Endpoint**: `PUT /api/v1/account/user/push-token`
-   **Auth**: Required (Bearer Token)
-   **Body**:
    ```json
    {
        "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
    }
    ```

### 2. Listen for In-App Notifications (Socket.IO)

The server emits a `NEW_NOTIFICATION` event via Socket.IO when a notification is created.

```javascript
import io from 'socket.io-client';

const socket = io('https://api.swaplink.app', {
    auth: { token: 'YOUR_JWT_TOKEN' },
});

socket.on('NEW_NOTIFICATION', notification => {
    console.log('New Notification:', notification);
    // Show in-app toast or update badge count
});
```

---

## Configuration

Ensure the following environment variables are set in your `.env` file:

```env
# Redis (for Queues)
REDIS_URL=redis://localhost:6379

# Resend (for Emails)
RESEND_API_KEY=re_123456789
FROM_EMAIL=onboarding@resend.dev

# Expo (Optional, for Push)
# No specific env var needed for basic Expo usage, but credentials may be required for production builds.
```
