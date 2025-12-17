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

### 2. Listen for Transaction Updates

In your relevant screens (e.g., `WalletScreen`, `TransactionHistoryScreen`), use the socket instance to listen for the `transaction_update` event.

#### Event Payload Structure

```typescript
interface TransactionUpdatePayload {
    transactionId: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    type: 'TRANSFER' | 'DEPOSIT' | 'REVERSAL';
    amount: number; // Negative for debit, Positive for credit
    balance: number; // The NEW wallet balance
    timestamp: string; // ISO Date string
    senderName?: string; // Optional (for received transfers)
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
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        if (!socket) return;

        // Event Listener
        const handleTransactionUpdate = (data: TransactionUpdatePayload) => {
            console.log('🔔 Transaction Update Received:', data);

            // 1. Update Balance
            setBalance(data.balance);

            // 2. Update Transaction List
            // Check if transaction already exists (update it) or add new one
            setTransactions(prev => {
                const exists = prev.find(t => t.id === data.transactionId);
                if (exists) {
                    return prev.map(t =>
                        t.id === data.transactionId ? { ...t, status: data.status } : t
                    );
                } else {
                    // Add new transaction to top
                    return [data, ...prev];
                }
            });

            // Optional: Show Toast Notification
            // Toast.show({ type: 'success', text1: 'New Transaction', text2: `Amount: ${data.amount}` });
        };

        socket.on('transaction_update', handleTransactionUpdate);

        // Cleanup listener
        return () => {
            socket.off('transaction_update', handleTransactionUpdate);
        };
    }, [socket]);

    return (
        <View>
            <Text>Current Balance: {balance}</Text>
            {/* Render Transaction List */}
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
