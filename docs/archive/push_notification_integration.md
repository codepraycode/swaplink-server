# Backend Integration Guide: Expo Push Notifications

This guide outlines the necessary changes in the backend to support Expo Push Notifications for the Swaplink app.

## Prerequisites

-   Install `expo-server-sdk`:
    ```bash
    npm install expo-server-sdk
    # or
    yarn add expo-server-sdk
    ```

## Implementation Checklist

-   [ ] **Database**: Create `Device` model (or add `pushToken` to `User`) & run migration.
-   [ ] **API**: Implement `PUT /users/push-token` endpoint.
-   [ ] **Service**: Create `NotificationService` with `sendToUser` method.
-   [ ] **Integration**: Call `NotificationService.sendToUser` in your business logic (e.g., Transfer Service).
-   [ ] **Cleanup**: Implement logic to delete invalid tokens (handle `DeviceNotRegistered` error).

## 1. Database Schema Update (Prisma)

Add a `pushToken` field to the `User` model to store the Expo Push Token.

```prisma
// prisma/schema.prisma

model User {
  id        String   @id @default(uuid())
  // ... existing fields
  pushToken String?  // Add this field
  // ...
}
```

Run migration:

```bash
npx prisma migrate dev --name add_push_token
```

## 2. API Endpoint: Save Push Token

Create an endpoint to allow the mobile app to send and save the push token.

**Route**: `PUT /users/push-token`
**Body**: `{ "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" }`

### Controller Implementation (Example)

```typescript
// src/api/modules/user/user.controller.ts

import { Request, Response } from 'express';
import { UserService } from './user.service';

export class UserController {
    // ... existing methods

    static async updatePushToken(req: Request, res: Response) {
        try {
            const userId = req.user.id; // Assuming auth middleware populates req.user
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({ success: false, message: 'Token is required' });
            }

            await UserService.updatePushToken(userId, token);

            return res.status(200).json({
                success: true,
                message: 'Push token updated successfully',
            });
        } catch (error) {
            console.error('Error updating push token:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}
```

### Service Implementation (Example)

```typescript
// src/api/modules/user/user.service.ts

import prisma from '../../../lib/prisma'; // Adjust import path

export class UserService {
    // ... existing methods

    static async updatePushToken(userId: string, token: string) {
        return await prisma.user.update({
            where: { id: userId },
            data: { pushToken: token },
        });
    }
}
```

## 3. Notification Service (Sending Notifications)

Create a service to handle sending notifications using `expo-server-sdk`.

````typescript
// src/services/notification.service.ts

import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import prisma from '../lib/prisma'; // Adjust import path

const expo = new Expo();

export class NotificationService {
    /**
     * Send a push notification to a specific user by their User ID.
     */
    static async sendToUser(userId: string, title: string, body: string, data: any = {}) {
        try {
            // 1. Get user's push token
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { pushToken: true },
            });

            if (!user || !user.pushToken) {
                console.warn(`User ${userId} has no push token.`);
                return;
            }

            const pushToken = user.pushToken;

            // 2. Check if token is valid
            if (!Expo.isExpoPushToken(pushToken)) {
                console.error(`Push token ${pushToken} is not a valid Expo push token`);
                return;
            }

            // 3. Construct message
            const messages: ExpoPushMessage[] = [
                {
                    to: pushToken,
                    sound: 'default',
                    title: title,
                    body: body,
                    data: data,
                },
            ];

            // 4. Send notification
            const chunks = expo.chunkPushNotifications(messages);

            for (const chunk of chunks) {
                try {
                    const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                    console.log('Notification sent:', ticketChunk);
                    // NOTE: You should handle errors here (e.g., invalid token)
                } catch (error) {
                    console.error('Error sending notification chunk:', error);
                }
            }
        } catch (error) {
            console.error('Error in sendToUser:', error);
        }
    }
}

## Production Considerations (Critical)

To make this implementation **production-ready**, you must address the following:

### 1. Multiple Devices Support
Users may log in from multiple devices (e.g., iPhone and Android). Storing a single `pushToken` string on the `User` model will overwrite the previous device's token.

**Recommended Schema:**
Create a `Device` model.

```prisma
model Device {
  id        String   @id @default(uuid())
  token     String   @unique
  platform  String   // 'ios' | 'android'
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}
````

### 2. Handling Invalid Tokens (Receipts)

Expo tokens can become invalid (e.g., user uninstalls app). You **must** check for error receipts and delete invalid tokens to avoid sending messages to dead ends.

```typescript
// In NotificationService
// ... inside the chunk loop
try {
    const tickets = await expo.sendPushNotificationsAsync(chunk);

    // Process tickets to identify errors
    tickets.forEach(ticket => {
        if (ticket.status === 'error') {
            if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
                // TODO: Delete this specific token from the Device table
                console.log('Token is invalid, deleting...');
            }
        }
    });
} catch (error) {
    console.error('Error sending chunk:', error);
}
```

### 3. Security

Ensure the `PUT /users/push-token` endpoint is protected by your authentication middleware.

## 4. Usage Example

When a transfer is received, you can call the service:

```typescript
// Inside TransferService or TransferWorker

import { NotificationService } from '../services/notification.service';

// ... after processing transfer
await NotificationService.sendToUser(
    recipientId,
    'Credit Alert',
    `You received ₦${amount} from ${senderName}`,
    { transactionId: transaction.id, type: 'DEPOSIT' }
);
```

I also need this endpoints active

```typescript
export const userAPI = {
    updateProfile: (data: Partial<IUser>) => api.put<IUserResponse>('/users/profile', data),
    updatePushToken: (token: string) => api.put<IApiResponse<void>>('/users/push-token', { token }),
    changePassword: (data: any) => api.post<IApiResponse<void>>('/users/change-password', data),
};
```
