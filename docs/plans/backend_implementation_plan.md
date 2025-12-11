# SwapLink Backend Implementation Plan

# Goal Description

Implement the backend services for SwapLink, a mobile financial app, using Node.js, Express, TypeScript, and Prisma. The goal is to provide a robust API for authentication, wallet management, transactions, and P2P currency exchange.

## User Review Required

> [!IMPORTANT]
>
> -   Confirm the database schema for `User`, `Wallet`, `Transaction`, and `P2POffer` models.
> -   Review the security measures for PIN handling and OTP verification.

## Proposed Changes

### Database Schema (Prisma)

#### [MODIFY] [schema.prisma](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/prisma/schema.prisma)

-   Add/Update `User` model with KYC fields.
-   Add `Wallet` model.
-   Add `Transaction` model.
-   Add `P2POffer` model.
-   Add `OTP` model for phone/email verification and password reset.
-   Update `Currency` enum to include `EUR`, `CAD`, `GBP`.
-   Ensure `User` model has consistent KYC fields.

### Authentication Module

#### [MODIFY] [auth.service.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/services/auth.service.ts)

-   Implement registration, login, OTP generation/verification, password reset.
-   Implement `sendOtp` (phone/email).
-   Implement `verifyOtp` (phone/email).
-   Implement `requestPasswordReset`.
-   Implement `verifyResetOtp`.
-   Implement `resetPassword`.
-   Implement `submitKyc`.
-   Implement `getVerificationStatus`.

#### [NEW] [auth.controller.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/controllers/auth.controller.ts)

-   Handle HTTP requests for auth endpoints.

#### [MODIFY] [auth.routes.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/routes/auth.routes.ts)

-   Define routes for `/auth/*`.
-   Add routes for OTP, password reset, and KYC endpoints.

### Wallet Module

#### [NEW] [wallet.service.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/services/wallet.service.ts)

-   Manage wallet balances, deposits, and withdrawals.

#### [NEW] [wallet.controller.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/controllers/wallet.controller.ts)

-   Handle HTTP requests for wallet endpoints.

#### [NEW] [wallet.routes.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/routes/wallet.routes.ts)

-   Define routes for `/wallets/*`.

### Transaction Module

#### [NEW] [transaction.service.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/services/transaction.service.ts)

-   Handle internal and external transfers, transaction history.

#### [NEW] [transaction.controller.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/controllers/transaction.controller.ts)

-   Handle HTTP requests for transaction endpoints.

#### [NEW] [transaction.routes.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/routes/transaction.routes.ts)

-   Define routes for `/transactions/*`.

### Bank Account Module

#### [NEW] [bank-account.service.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/services/bank-account.service.ts)

-   Manage user bank accounts (add, remove, list).

#### [NEW] [bank-account.controller.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/controllers/bank-account.controller.ts)

-   Handle HTTP requests for bank account endpoints.

#### [NEW] [bank-account.routes.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/routes/bank-account.routes.ts)

-   Define routes for `/bank-accounts/*`.

### P2P Offer & Trade Module

#### [NEW] [p2p.service.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/services/p2p.service.ts)

-   Manage P2P offers (create, update, fetch).
-   Manage Trade lifecycle:
    -   `initiateTrade` (Accept Offer)
    -   `markPaymentSent` (Buyer action)
    -   `confirmPaymentReceived` (Seller action - Releases Escrow)
    -   `cancelTrade`
    -   `disputeTrade`

#### [NEW] [p2p.controller.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/controllers/p2p.controller.ts)

-   Handle HTTP requests for P2P and Trade endpoints.

#### [NEW] [p2p.routes.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/routes/p2p.routes.ts)

-   Define routes for `/offers/*` and `/trades/*`.

## Verification Plan

### Automated Tests

-   Run unit tests for services using Jest: `npm run test:unit`
-   Run integration tests for API endpoints using Supertest: `npm run test:integration`

### Manual Verification

-   Use Postman or curl to test endpoints against the local server.
-   Verify database state using `prisma studio`.
