# Identity & Security Module

## Overview

The Identity & Security Module manages user authentication, session management, KYC (Know Your Customer) verification, and core security features like Transaction PINs and Account Locking.

## 1. Authentication

### Unified Session Management

We enforce a "One Device, One Session" policy to enhance security.

-   **Login**: When a user logs in, any existing session for that user is invalidated.
-   **Concurrent Login**: If a user is logged in on Device A and logs in on Device B, Device A receives a `FORCE_LOGOUT` socket event.
-   **Storage**: Active sessions are stored in Redis (`session:{userId}`) with a 24h TTL.

### OTP System

-   **Storage**: OTPs are stored in Redis with a 5-minute TTL.
-   **Providers**:
    -   `LocalMessagingProvider`: Logs OTPs to console (Development).
    -   `TermiiProvider`: Sends SMS via Termii (Production).

### Hard Logout

-   **JWT Blacklist**: On logout, the Access Token is added to a Redis blacklist until its natural expiration.

## 2. KYC Tier Engine

We use a tiered KYC system to manage user limits and privileges.

### Tiers

1.  **Tier 0 (None)**: Registration only. No transactions allowed.
2.  **Tier 1 (Basic)**: Email & Phone Verified.
    -   **Limit**: 30 Million NGN Cumulative Inflow.
    -   **Requirements**: File Upload (ID Card).
3.  **Tier 2 (Full)**: BVN/NIN Verified.
    -   **Limit**: Unlimited.
    -   **Requirements**: BVN Verification.

### Automatic Inflow Monitoring

-   The system monitors `cumulativeInflow` for every deposit.
-   If a Tier 1 user exceeds 30M NGN, their account is automatically restricted (`isActive = false`) and they are notified to upgrade.

## 3. Security

### Transaction PIN

-   **Hashing**: PINs are hashed using `bcrypt` before storage.
-   **Rate Limiting**: 3 failed attempts lock the PIN for 15 minutes.
-   **Notifications**: Users receive email alerts whenever their PIN is set or changed.

### Events

The module emits the following events via the `EventBus`:

-   `USER_REGISTERED`: New user signup.
-   `LOGIN_DETECTED`: Successful login.
-   `KYC_SUBMITTED`: User uploaded documents.
-   `KYC_APPROVED`: User upgraded tier.
-   `FAILED_PIN_ATTEMPTS`: Failed PIN verification (for security monitoring).

## 4. Architecture

-   **Services**: `AuthService`, `KycService`, `PinService`.
-   **Listeners**: `AuthListener`, `KycListener`, `KycTransactionListener`.
-   **Database**: Prisma (PostgreSQL).
-   **Cache/Session**: Redis.

## 5. API Endpoints

### Auth

-   `POST /auth/register`: Create account.
-   `POST /auth/login`: Login (returns JWT).
-   `POST /auth/logout`: Logout (invalidates JWT).
-   `POST /auth/otp/send`: Send OTP.
-   `POST /auth/otp/verify`: Verify OTP.

### KYC

-   `POST /kyc/tier1`: Submit documents.
-   `POST /kyc/tier2`: Verify BVN.

### PIN

-   `POST /wallet/pin/set`: Set initial PIN.
-   `POST /wallet/pin/update`: Change PIN.
-   `POST /wallet/pin/verify`: Verify PIN (for transactions).
