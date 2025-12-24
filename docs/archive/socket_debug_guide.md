# Socket.io Debugging Guide for SwapLink

This guide helps you troubleshoot why `transaction_update` events might not be received in your Expo app.

## 1. Server-Side Verification

The server is configured to emit `transaction_update` in `src/api/modules/transfer/transfer.service.ts` and `src/worker/transfer.worker.ts`.

### Check Server Logs

Look for these logs in your server terminal when the server starts and when a user connects:

-   `✅ Socket.io initialized`
-   `🔌 User connected: <userId> (<socketId>)`
-   `📡 Emitted 'transaction_update' to User <userId>`

If you don't see "User connected", your app is not connecting to the socket server.

### Verify Redis (If using Workers)

If you are running the worker process separately, ensure Redis is running and accessible. The worker publishes events to Redis, and the API server subscribes to them to emit to the client.

-   Check for `✅ Subscribed to socket-events Redis channel` in the API server logs.

## 2. Client-Side Debugging (Expo App)

Since I cannot access your Expo app code, please verify the following:

### A. Connection URL

Ensure your socket client connects to the correct URL.

-   Localhost (Android Emulator): `http://10.0.2.2:3000` (or your port)
-   Localhost (iOS Simulator): `http://localhost:3000`
-   Physical Device: `http://<YOUR_PC_IP>:3000`

### B. Authentication

The `SocketService` requires a valid JWT token. Ensure you are passing it in the handshake.

```typescript
import io from 'socket.io-client';

const socket = io('http://YOUR_SERVER_URL', {
    auth: {
        token: 'YOUR_JWT_TOKEN', // Must be valid
    },
    // Or query: { token: '...' }
});
```

### C. Event Listener

Ensure you are listening for the exact event name `transaction_update`.

```typescript
socket.on('transaction_update', data => {
    console.log('Received transaction update:', data);
});
```

### D. Connection Status

Log connection events to debug:

```typescript
socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
});

socket.on('connect_error', err => {
    console.error('Socket connection error:', err);
});
```

## 3. Common Pitfalls

1.  **Idempotency**: If you retry a transfer with the same `Idempotency-Key`, the server returns the cached result immediately and **does NOT emit the socket event again**. Ensure you use a unique key for every new test.
2.  **Event Mismatch**: `TransferService` emits `transaction_update`, but `WalletService` (used for deposits/withdrawals) emits `WALLET_UPDATED`. Ensure you listen to the correct event for the operation you are testing.
3.  **User ID Mismatch**: The server emits to the `userId` in the token. Ensure the token used by the socket client belongs to the user receiving the transfer.

## 4. Test Script

You can run this script in the `swaplink-server` directory to verify the server is working (requires `socket.io-client` installed):

```typescript
// test-socket.ts
import { io } from 'socket.io-client';

const URL = 'http://localhost:3000'; // Adjust port
const TOKEN = 'YOUR_TEST_TOKEN'; // Get a valid token from login

const socket = io(URL, {
    auth: { token: TOKEN },
});

socket.on('connect', () => {
    console.log('Connected:', socket.id);
});

socket.on('transaction_update', data => {
    console.log('EVENT RECEIVED:', data);
});

socket.on('disconnect', () => {
    console.log('Disconnected');
});
```
