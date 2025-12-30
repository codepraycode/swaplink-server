# Socket Implementation Documentation

This document outlines the real-time communication architecture using [Socket.io](https://socket.io/) in the SwapLink server. It covers connection details, authentication, global events, specific gateways, and integration guides for Expo (React Native) and Postman.

## 1. Overview

The server uses `socket.io` to provide real-time updates for:

-   **Notifications**: System alerts, transaction updates.
-   **Wallet Updates**: Real-time balance changes.
-   **Security**: Force logout on concurrent sessions.
-   **P2P Chat**: Real-time messaging between buyers and sellers.

The implementation is divided into:

1.  **Global SocketService**: Manages user connections, authentication, and global events (notifications, wallet). It supports multi-instance scaling via Redis Pub/Sub.
2.  **P2P Chat Gateway**: A dedicated class for handling chat-specific logic (rooms, typing indicators).

## 2. Connection & Authentication

### Connection Details

-   **URL**: `ws://<your-server-url>` (e.g., `http://localhost:3000` or `https://api.swaplink.com`)
-   **Path**: Default `/socket.io/`
-   **Transports**: `websocket`, `polling`

### Authentication

The server requires a valid JWT Access Token to establish a connection. The token can be provided in three ways (checked in order):

1.  **Handshake Auth**: `{ auth: { token: "..." } }` (Recommended)
2.  **Query Parameter**: `?token=...`
3.  **Authorization Header**: `Authorization: Bearer ...`

If authentication fails, the connection is rejected with an error.

## 3. Global Events (SocketService)

These events are emitted globally to specific users via `SocketService`.

### Emitted Events (Server -> Client)

| Event Name         | Description                                                        | Payload Structure                                                 |
| :----------------- | :----------------------------------------------------------------- | :---------------------------------------------------------------- |
| `NOTIFICATION_NEW` | Sent when a new notification is created.                           | `Notification` object (see DB schema)                             |
| `WALLET_UPDATED`   | Sent when a wallet balance changes or account details update.      | `{ balance?: number, virtualAccount?: object, message?: string }` |
| `FORCE_LOGOUT`     | Sent when a new login is detected on another device.               | `{ reason: string }`                                              |
| `p2p:new-message`  | Sent when a P2P message is sent via HTTP API (Legacy/Alternative). | `P2PChat` object                                                  |

## 4. P2P Chat Gateway

The P2P Chat Gateway handles real-time chat within order rooms.

### Connection

Connects to the same main namespace.

### Client -> Server Events

| Event Name     | Payload                                                   | Description                                                                |
| :------------- | :-------------------------------------------------------- | :------------------------------------------------------------------------- |
| `join_order`   | `orderId` (string)                                        | Joins the socket room `order:{orderId}`. Required to receive chat updates. |
| `send_message` | `{ orderId: string, message: string, imageUrl?: string }` | Sends a message to the order room. Persists to DB.                         |
| `typing`       | `{ orderId: string }`                                     | Emits `user_typing` to other users in the room.                            |
| `stop_typing`  | `{ orderId: string }`                                     | Emits `user_stop_typing` to other users in the room.                       |

### Server -> Client Events

| Event Name         | Payload               | Description                                          |
| :----------------- | :-------------------- | :--------------------------------------------------- |
| `new_message`      | `P2PChat` object      | Broadcasted to the room when a message is received.  |
| `user_typing`      | `{ userId: string }`  | Broadcasted when another user starts typing.         |
| `user_stop_typing` | `{ userId: string }`  | Broadcasted when another user stops typing.          |
| `error`            | `{ message: string }` | Sent if an error occurs (e.g., message send failed). |

## 5. Expo (React Native) Integration

Use `socket.io-client` to connect from your Expo app.

### Installation

```bash
npm install socket.io-client
```

### Implementation Example

Create a `SocketContext` or a service to manage the connection.

```typescript
import io, { Socket } from 'socket.io-client';

const SOCKET_URL = 'https://api.swaplink.com'; // Replace with your server URL

class SocketManager {
    private socket: Socket | null = null;

    connect(token: string) {
        if (this.socket) return;

        this.socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'], // Force websocket for better performance in RN
            reconnection: true,
        });

        this.socket.on('connect', () => {
            console.log('Connected to socket server');
        });

        this.socket.on('connect_error', err => {
            console.error('Socket connection error:', err.message);
        });

        // Global Listeners
        this.socket.on('FORCE_LOGOUT', data => {
            alert(data.reason);
            // Perform logout logic
        });

        this.socket.on('NOTIFICATION_NEW', notification => {
            // Show in-app toast or update badge
        });
    }

    // P2P Chat Methods
    joinOrder(orderId: string) {
        this.socket?.emit('join_order', orderId);
    }

    sendMessage(orderId: string, message: string) {
        this.socket?.emit('send_message', { orderId, message });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    getSocket() {
        return this.socket;
    }
}

export const socketManager = new SocketManager();
```

### Usage in Component

```tsx
useEffect(() => {
    // Connect on mount (assuming you have the token)
    socketManager.connect(userToken);

    const socket = socketManager.getSocket();

    // Listen for specific events
    socket?.on('WALLET_UPDATED', data => {
        console.log('New Balance:', data.balance);
    });

    return () => {
        socket?.off('WALLET_UPDATED');
    };
}, [userToken]);
```

## 6. Testing with Postman

Postman supports Socket.io testing.

1.  **Open Postman**.
2.  Click **New** -> **Socket.io**.
3.  Enter the URL: `ws://localhost:3000` (or your server URL).
4.  **Settings / Handshake**:
    -   Go to the **Events** tab (or **Handshake** depending on version).
    -   Under **Handshake Request**, add `token` to the **Auth** section or as a query param `token` with your JWT.
    -   Alternatively, check the "Authorization" header box and add `Bearer <your_jwt>`.
5.  **Connect**: Click **Connect**. You should see "Connected".
6.  **Listen to Events**:
    -   In the **Events** tab, add listeners for `NOTIFICATION_NEW`, `WALLET_UPDATED`, `new_message`.
    -   Toggle "Listen" to ON.
7.  **Emit Events (P2P Chat)**:
    -   In the **Message** tab.
    -   Event name: `join_order`.
    -   Argument: `"<order_id>"` (JSON string or text).
    -   Click **Send**.
    -   Event name: `send_message`.
    -   Argument: `{"orderId": "<order_id>", "message": "Hello from Postman"}` (JSON).
    -   Click **Send**.
    -   Verify you receive `new_message` in the Events log.
