# SwapLink Master Development Specification

This document outlines the end-to-end development strategy for building SwapLink, coordinating both the Backend (Server) and Frontend (App) implementation.

## Development Philosophy

-   **Backend First**: We will implement the API endpoints and logic first, ensuring they are tested and working.
-   **Contract Driven**: The API endpoints defined in `API_ENDPOINTS.md` (and updated in our plans) serve as the contract.
-   **Step-by-Step Integration**: We will build and integrate feature by feature, rather than building the whole backend and then the whole frontend.

---

## Phase 1: Foundation & Authentication

**Goal**: Users can register, login, and manage their profile (KYC).

### Backend

1.  **Database**: Finalize `User`, `OTP`, `KycDocument` schemas. Run migrations.
2.  **Auth Service**: Implement `register`, `login`, `sendOtp`, `verifyOtp`.
3.  **API**: Expose `/auth/*` endpoints.
4.  **Verification**: Test with Postman/Jest.

### Frontend (App)

1.  **API Client**: Update `api.ts` with Auth endpoints.
2.  **Screens**: Wire up `SignUpScreen`, `LoginScreen`, `VerificationRouterScreen`.
3.  **Logic**: Implement Auth Context/Store to manage session token.

---

## Phase 2: Wallet & Banking

**Goal**: Users can view balances, deposit funds (mocked/simulated), and manage bank accounts.

### Backend

1.  **Database**: Finalize `Wallet`, `Transaction`, `BankAccount` schemas.
2.  **Wallet Service**: Implement `createWallet` (on register), `getWallets`, `deposit` (simulated).
3.  **Bank Service**: Implement CRUD for `BankAccount`.
4.  **API**: Expose `/wallets/*` and `/bank-accounts/*`.

### Frontend (App)

1.  **API Client**: Add Wallet and Bank endpoints.
2.  **Screens**: Wire up `Wallet` dashboard, `ReceivingAccountScreen`.
3.  **Logic**: State management for user's wallets and saved bank accounts.

---

## Phase 3: P2P Marketplace (Offers)

**Goal**: Users can see the market and post their own offers.

### Backend

1.  **Database**: Finalize `Offer` schema.
2.  **P2P Service**: Implement `createOffer`, `getOffers` (with filters), `getMyOffers`.
3.  **API**: Expose `/offers/*`.

### Frontend (App)

1.  **API Client**: Add Offer endpoints.
2.  **Screens**: Wire up `MarketScreen`, `CreateOfferScreen`, `MyOffersScreen`.
3.  **Logic**: Filtering and pagination for the market feed.

---

## Phase 4: Trade Execution (The Core)

**Goal**: Users can execute a P2P trade from start to finish.

### Backend

1.  **Database**: Finalize `Trade`, `Escrow` schemas.
2.  **P2P Service**: Implement the Trade State Machine:
    -   `initiateTrade` (Locks Escrow)
    -   `markPaymentSent` (Updates status)
    -   `confirmPayment` (Releases Escrow to Buyer)
    -   `cancelTrade` (Refunds Escrow if applicable)
3.  **API**: Expose `/trades/*`.

### Frontend (App)

1.  **API Client**: Add Trade endpoints.
2.  **Screens**: Wire up `OfferDetailsScreen`, `PaymentInstructionsScreen`, `PaymentProofScreen`, `SellConfirmationScreen`.
3.  **Logic**: Real-time (or polling) updates for trade status changes.

---

## Phase 5: Polish & Launch Prep

**Goal**: Production readiness.

### Backend

1.  **Security**: Rate limiting, input validation (Zod), security headers.
2.  **Jobs**: Cron jobs for expiring old offers/trades.
3.  **Deployment**: Dockerize and deploy to staging.

### Frontend (App)

1.  **UX**: Loading states, error handling, success toasts.
2.  **Testing**: End-to-end testing of the critical paths.
3.  **Build**: Configure EAS build for preview/production.
