# Software Requirement Specification: Authentication Module

**Project:** SwapLink Fintech App

**Version:** 1.0

**Module:** Identity & Access Management (IAM)

## 1. Introduction

This module handles User Registration, Login, Identity Verification (KYC), Session Management, and Credential Recovery. It serves as the security gateway for the application, ensuring only authorized entities can access financial data.

## 2. Functional Requirements (FR)

### 2.1 User Registration (Onboarding)

-   **FR-01:** The system shall allow users to register using a verified **Phone Number** and **Email Address**.
-   **FR-02:** The system must enforce OTP verification for the Phone Number _before_ creating the account.
-   **FR-03:** The system must validate that the Phone Number and Email are not already in use.
-   **FR-04:** The system shall require a password meeting the **Complexity Policy** (See Sec 3.1).
-   **FR-05:** The system shall require acceptance of Terms of Service & Privacy Policy during signup.

### 2.2 Login & Authentication

-   **FR-06:** The system shall authenticate users via **Email/Phone** and **Password**.
-   **FR-07:** The system shall support **Biometric Login** (FaceID/TouchID) for mobile apps by exchanging a stored cryptographic signature for a Session Token.
-   **FR-08:** The system shall detect **New Devices**. If a user logs in from a previously unknown `deviceId`, the system must trigger a mandatory **OTP Verification** (2FA).
-   **FR-09:** The system shall provide a **JWT Access Token** (Short-lived) and a **Refresh Token** (Long-lived) upon successful login.

### 2.3 Transaction Authorization (Step-Up Auth)

-   **FR-10:** The system shall require a **6-digit Transaction PIN** for all monetary outbound transactions.
-   **FR-11:** The PIN must be distinct from the Login Password.
-   **FR-12:** The system shall lock the transaction capability for **1 hour** after 3 consecutive failed PIN attempts.

### 2.4 Credential Recovery

-   **FR-13:** The system shall allow Password Reset via a link sent to the verified Email.
-   **FR-14:** Password Reset flows must require **Two-Factor Verification** (Email Link + OTP sent to Phone) to prevent unauthorized takeovers.
-   **FR-15:** After a password reset, withdrawals must be suspended for **24 hours** (Cool-down period).

## 3. Non-Functional Requirements (NFR)

### 3.1 Security & Cryptography

-   **NFR-01 Password Hashing:** All passwords must be hashed using **Argon2id** (minimum configuration: memory=64MB, iterations=3). MD5/SHA256 is strictly prohibited.
-   **NFR-02 PIN Storage:** Transaction PINs must be hashed separately using **Bcrypt** or **Argon2**.
-   **NFR-03 Transmission:** All data in transit must be encrypted via **TLS 1.2+** (HTTPS).
-   **NFR-04 Data Redaction:** Logs must never contain Passwords, PINs, OTPs, or Access Tokens.

### 3.2 Session Management

-   **NFR-05 Access Token TTL:** Access tokens shall expire after **15 minutes**.
-   **NFR-06 Refresh Token TTL:** Refresh tokens shall expire after **7 days** (rolling expiration active if used).
-   **NFR-07 Idle Timeout:** The mobile app must auto-lock (require biometric/PIN unlock) after **5 minutes** of user inactivity.
-   **NFR-08 Device Binding:** Refresh tokens must be bound to the specific `deviceId`. A token stolen from Device A must not work on Device B.

### 3.3 Reliability & Availability

-   **NFR-09 OTP Delivery:** The system must support failover for OTPs (Primary: SMS, Failover: WhatsApp or Voice Call).
-   **NFR-10 Latency:** Login requests should complete within **500ms** (excluding network latency).

## 4. Technical Constraints & Data Rules

### 4.1 Input Validation Rules

| Field        | Rule                                                        | Error Message                                |
| :----------- | :---------------------------------------------------------- | :------------------------------------------- |
| **Email**    | Valid RFC 5322 format. No disposable domains.               | "Please use a valid personal email address." |
| **Phone**    | E.164 Format (e.g., +234...).                               | "Invalid phone number format."               |
| **Password** | Min 8 chars, 1 Uppercase, 1 Lowercase, 1 Number, 1 Special. | "Password is too weak."                      |
| **PIN**      | 6 Digits. No sequences (123456) or repeats (111111).        | "PIN is too easy to guess."                  |

### 4.2 Rate Limiting Policies

| Action              | Limit                          | Consequence                                |
| :------------------ | :----------------------------- | :----------------------------------------- |
| **Login**           | 5 failed attempts per 15 mins  | Account Locked (15 mins)                   |
| **OTP Request**     | 3 requests per hour per target | User blocked from requesting OTPs (1 hour) |
| **Transaction PIN** | 3 failed attempts per hour     | Transactions blocked (1 hour)              |

## 5. User Flows (Logic)

### 5.1 Registration Flow

1.  User enters Phone Number.
2.  System sends SMS OTP.
3.  User enters OTP -> System Verifies.
4.  User enters Email, Password, Name.
5.  System creates "Pending" User.
6.  System sends Email Verification Link.
7.  User clicks Link -> System activates User.

### 5.2 Login Flow (New Device)

1.  User enters Email + Password.
2.  System validates credentials.
3.  System checks `deviceId` against `UserDevices` table.
4.  **IF** Device is known: Return JWTs.
5.  **IF** Device is unknown:
    -   System generates generic "2FA Required" token.
    -   System sends OTP to registered Phone.
    -   User enters OTP.
    -   System registers new Device.
    -   System returns JWTs.

## 6. Edge Cases & Error Handling

-   **EC-01 Database Down:** Return HTTP 503 "Service Unavailable" (do not hang).
-   **EC-02 SMS Gateway Failure:** If SMS provider fails, retry with secondary provider or suggest "Call me" option after 60 seconds.
-   **EC-03 Clock Skew:** Server must validate JWT `iat` (issued at) and `exp` with a small clock skew tolerance (e.g., 5 seconds) to handle slight server time differences.
