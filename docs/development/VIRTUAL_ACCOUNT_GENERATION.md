# Virtual Account Generation Implementation

## 1. Overview

This document details the implementation of the Virtual Account Generation feature in SwapLink. The feature allows users to receive a unique NUBAN (virtual account number) for wallet funding. The system uses an event-driven architecture to handle account generation asynchronously, ensuring a responsive user experience.

## 2. Architecture

The implementation differs slightly from the initial requirements to improve robustness and scalability:

-   **Queue System:** Replaced simple `EventEmitter` with **BullMQ** (Redis-based) for persistent job processing, retries, and rate limiting.
-   **Real-time Updates:** Implemented **Socket.io** to push updates to the frontend, removing the need for client-side polling.
-   **Mock Mode:** Added a simulation mode for the Banking Service to facilitate development without live API credentials.

### Flow

1.  **User Registration:** User signs up (`AuthService`).
2.  **Job Enqueue:** `AuthService` adds a `create-virtual-account` job to `BankingQueue`.
3.  **Job Processing:** `BankingWorker` picks up the job asynchronously.
4.  **Bank API Call:** `GlobusService` calls the Globus Bank API (or Mock).
5.  **Database Update:** `VirtualAccount` record is created and linked to the User's Wallet.
6.  **Notification:** `SocketService` emits a `WALLET_UPDATED` event to the user's client.

## 3. Database Schema

Added `VirtualAccount` model to `prisma/schema.prisma`:

```prisma
model VirtualAccount {
  id            String   @id @default(uuid())
  walletId      String   @unique
  accountNumber String   @unique // The NUBAN
  accountName   String
  bankName      String   @default("Globus Bank")
  provider      String   @default("GLOBUS")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  wallet        Wallet   @relation(fields: [walletId], references: [id], onDelete: Cascade)
  @@map("virtual_accounts")
}
```

## 4. Key Components

### 4.1 GlobusService (`src/lib/integrations/banking/globus.service.ts`)

-   Handles interaction with Globus Bank API.
-   **Mock Mode:** If `GLOBUS_CLIENT_ID` is not set in `.env`, it generates a deterministic mock account number based on the user's ID.

### 4.2 BankingQueue (`src/lib/queues/banking.queue.ts`)

-   **Producer:** Adds jobs to the `banking-queue`.
-   **Worker:** Processes jobs with the following settings:
    -   **Concurrency:** 5 jobs at a time.
    -   **Rate Limit:** 10 requests per second (to protect Bank API).
    -   **Retries:** Exponential backoff for failed jobs.

### 4.3 SocketService (`src/lib/services/socket.service.ts`)

-   Manages WebSocket connections.
-   Authenticates users via JWT.
-   Emits `WALLET_UPDATED` events when:
    -   A virtual account is created.
    -   A wallet is credited or debited.

## 5. Configuration

Required Environment Variables in `.env`:

```bash
# Redis (Required for BullMQ)
REDIS_URL="redis://localhost:6379"
REDIS_PORT=6379

# Globus Bank (Optional - defaults to Mock Mode if missing)
GLOBUS_BASE_URL="https://sandbox.globusbank.com/api"
GLOBUS_CLIENT_ID="your_client_id"
GLOBUS_SECRET_KEY="your_secret_key"
```

## 6. Testing

### 6.1 Unit Tests

-   `src/lib/integrations/banking/__tests__/globus.service.test.ts`: Verifies Mock Mode and API interaction logic.

### 6.2 Integration Tests

-   `src/modules/auth/__tests__/auth.service.integration.test.ts`: Verifies that registering a user correctly triggers the background job.
-   `src/lib/queues/__tests__/banking.queue.test.ts`: Verifies the end-to-end flow from Queue -> Worker -> Database -> Socket Event.

## 7. Future Improvements

-   **Dead Letter Queue:** Handle jobs that fail permanently after all retries.
-   **Webhook Handling:** Implement a webhook endpoint to receive credit notifications from Globus Bank.
