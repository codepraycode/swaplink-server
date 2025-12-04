# SwapLink Server Development Plan

This plan outlines the steps to complete the SwapLink Express server, focusing on a robust P2P exchange architecture.

## Goal Description

Build a secure, scalable, and feature-rich backend for the SwapLink P2P exchange app. The server will handle user authentication, multi-currency wallets, secure P2P trading with escrow, and compliance features.

## User Review Required

> [!IMPORTANT] > **Real-time Requirement**: The P2P chat and status updates require a WebSocket solution (e.g., Socket.io). This is not currently in the dependencies. I will add it in Phase 3.

> [!IMPORTANT] > **Globus Bank Integration**: We will integrate Globus Bank API for NGN deposits and withdrawals.
> **Action Required**: Please provide the following in your `.env` (or share securely):
>
> -   `GLOBUS_CLIENT_ID`
> -   `GLOBUS_CLIENT_SECRET`
> -   `GLOBUS_API_KEY`
> -   `GLOBUS_BASE_URL` (Sandbox: `https://sandbox.globusbank.com`)

## Proposed Changes

### Phase 1: Core Infrastructure & Auth (Refinement)

Ensure the foundation is solid before building complex logic.

#### [MODIFY] [server.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/server.ts)

-   Add global validation pipes.
-   Ensure all routes are protected by `authenticate` middleware where necessary.

### Phase 2: Wallet Management

Implement the ledger system for holding and moving funds.

#### [NEW] [wallet.service.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/services/wallet.service.ts)

-   Implement `createWallet` (auto-create on signup).
-   Implement `getBalance`.
-   Implement `lockFunds` (for escrow).
-   Implement `releaseFunds` (for trade completion).

#### [NEW] [transaction.service.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/services/transaction.service.ts)

-   Record every balance change.
-   Support types: `DEPOSIT`, `WITHDRAWAL`, `TRADE_LOCK`, `TRADE_RELEASE`.

#### [NEW] [globus.service.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/services/globus.service.ts)

-   **Authentication**: Implement token generation/refresh.
-   **Virtual Accounts**: Create dynamic NGN accounts for users.
-   **Transfers**: Handle payouts (withdrawals) to external bank accounts.
-   **Webhooks**: Handle deposit notifications to auto-credit wallets.

### Phase 3: P2P Trading Engine

The core business logic.

#### [NEW] [trade.controller.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/controllers/trade.controller.ts)

-   Endpoints to initiate a trade from an offer.
-   Endpoints to mark payment as sent/received.
-   Endpoints to dispute a trade.

#### [NEW] [escrow.service.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/services/escrow.service.ts)

-   Logic to safely hold funds during a trade.
-   Atomic transactions to prevent double-spending.

#### [NEW] [socket.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/socket.ts)

-   Setup Socket.io server.
-   Events: `join_trade_room`, `new_message`, `trade_status_update`.

### Phase 4: Compliance & Admin

#### [NEW] [admin.routes.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/routes/admin.routes.ts)

-   Admin-only endpoints.
-   View all users and verification status.
-   Resolve disputes (force release or refund escrow).

## Verification Plan

### Automated Tests

-   **Unit Tests**: Test individual services (Wallet, Escrow) with mocked database.
-   **Integration Tests**: Test full flows (Register -> Post Offer -> Initiate Trade -> Complete Trade) using the test database.
-   **Command**: `pnpm test`

### Manual Verification

-   **Postman/Insomnia**: Manually hit endpoints to verify success/error responses.
-   **Database Inspection**: Use `prisma studio` to verify data integrity after trades.
