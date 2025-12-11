# SwapLink Master Development Tasks

## Phase 1: Foundation & Authentication

-   [ ] **Backend: Auth & User**
    -   [ ] Database: User, OTP, KycDocument schemas
    -   [ ] Service: Register, Login, OTP, Password Reset
    -   [ ] API: `/auth` endpoints
-   [ ] **Frontend: Auth Integration**
    -   [ ] Update `api.ts`
    -   [ ] Integrate Login/Signup Screens
    -   [ ] Integrate Verification Screens

## Phase 2: Wallet & Banking

-   [ ] **Backend: Wallet & Bank**
    -   [ ] Database: Wallet, Transaction, BankAccount schemas
    -   [ ] Service: Wallet Management, Bank Account CRUD
    -   [ ] API: `/wallets`, `/bank-accounts` endpoints
-   [ ] **Frontend: Wallet Integration**
    -   [ ] Integrate Wallet Dashboard
    -   [ ] Integrate Bank Account Management

## Phase 3: P2P Marketplace

-   [ ] **Backend: Offers**
    -   [ ] Database: Offer schema
    -   [ ] Service: Create/Get Offers
    -   [ ] API: `/offers` endpoints
-   [ ] **Frontend: Market Integration**
    -   [ ] Integrate Market Feed
    -   [ ] Integrate Create Offer Flow

## Phase 4: Trade Execution

-   [ ] **Backend: Trade Lifecycle**
    -   [ ] Database: Trade, Escrow schemas
    -   [ ] Service: Trade State Machine (Init, Pay, Release)
    -   [ ] API: `/trades` endpoints
-   [ ] **Frontend: Trade Integration**
    -   [ ] Integrate Trade Flow Screens
    -   [ ] Implement Trade Status Polling/Updates

## Phase 5: Polish

-   [ ] **Backend: Security & Jobs**
-   [ ] **Frontend: UX & Testing**
