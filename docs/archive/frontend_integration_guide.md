# Frontend Integration Guide: Live Transaction Updates

This guide details how to integrate the live transaction update feature into the Expo application using Socket.IO.

## Overview

The backend now supports real-time updates for transactions via WebSocket. This allows the app to reflect changes (like a successful deposit or a failed transfer) immediately without manual refreshing.

## Prerequisites

-   **Socket.IO Client**: Ensure `socket.io-client` is installed.
    ```bash
    npm install socket.io-client
    ```

## Integration Steps

### 1. Initialize Socket Connection

Create a centralized socket service or hook (e.g., `useSocket.ts`) to manage the connection. The connection requires the user's **JWT Access Token** for authentication.

```typescript
import { io, Socket } from 'socket.io-client';
import { useEffect, useState } from 'react';

// Replace with your actual backend URL
const SOCKET_URL = 'https://api.swaplink.com';

export const useSocket = (token: string | null) => {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        if (!token) return;

        // Initialize Socket
        const newSocket = io(SOCKET_URL, {
            auth: {
                token: token, // Pass token in auth object
            },
            // Optional: Transports configuration
            transports: ['websocket'],
        });

        newSocket.on('connect', () => {
            console.log('✅ Connected to WebSocket');
        });

        newSocket.on('connect_error', err => {
            console.error('❌ Socket Connection Error:', err.message);
        });

        setSocket(newSocket);

        // Cleanup on unmount or token change
        return () => {
            newSocket.disconnect();
        };
    }, [token]);

    return socket;
};
```

### 2. Listen for Wallet Updates

In your relevant screens (e.g., `WalletScreen`, `TransactionHistoryScreen`), use the socket instance to listen for the `WALLET_UPDATED` event. This event is emitted for all balance-changing operations (Deposits, Transfers, Reversals).

#### Event Payload Structure

```typescript
interface WalletUpdatePayload {
    id: string; // Wallet ID
    balance: number; // Current Balance
    lockedBalance: number;
    availableBalance: number;
    currency: string;
    virtualAccount: {
        accountNumber: string;
        bankName: string;
        accountName: string;
    } | null;
    message?: string; // e.g., "Credit Alert: +₦5,000"
}
```

#### Implementation Example

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useSocket } from './hooks/useSocket'; // Your hook from Step 1
import { useAuth } from './context/AuthContext'; // Assuming you have auth context

export const WalletScreen = () => {
    const { token, user } = useAuth();
    const socket = useSocket(token);
    const [balance, setBalance] = useState(user?.wallet?.balance || 0);

    useEffect(() => {
        if (!socket) return;

        // Event Listener
        const handleWalletUpdate = (data: WalletUpdatePayload) => {
            console.log('🔔 Wallet Update Received:', data);

            // 1. Update Balance
            setBalance(data.balance);

            // 2. Refresh Transactions (Optional)
            // Since the payload only gives the new balance, you might want to
            // re-fetch the transaction history to show the latest entry.
            // fetchTransactions();

            // 3. Show Notification
            if (data.message) {
                // Toast.show({ type: 'info', text1: 'Wallet Update', text2: data.message });
            }
        };

        socket.on('WALLET_UPDATED', handleWalletUpdate);

        // Cleanup listener
        return () => {
            socket.off('WALLET_UPDATED', handleWalletUpdate);
        };
    }, [socket]);

    return (
        <View>
            <Text>Current Balance: {balance}</Text>
        </View>
    );
};
```

### 3. Handling Background/Foreground States

If the app goes to the background, the socket might disconnect. Ensure your socket logic handles reconnection automatically (Socket.IO does this by default, but verify your config).

## Testing

1.  **Login** to the app.
2.  **Trigger a Transfer** (e.g., from another device or via Postman).
3.  **Observe**:
    -   The balance should update instantly.
    -   The transaction list should reflect the new transaction or status change.
