# P2P Dispute Resolution Module Documentation

## Overview

The **Dispute Resolution Module** enables Administrators to intervene in P2P orders where the Buyer and Seller are in disagreement. Admins can review evidence (chat history, payment receipts) and force-resolve disputes by either releasing funds to the buyer or refunding the seller.

## Core Features

1.  **Dispute Dashboard**: List all orders with `DISPUTE` status.
2.  **Evidence Review**: Access full chat history and order details.
3.  **Force Resolution**:
    -   **RELEASE**: Funds moved from Escrow (Locked) to Buyer/Receiver. Order -> `COMPLETED`.
    -   **REFUND**: Funds moved from Escrow (Locked) back to Seller/Payer. Order -> `CANCELLED`.
4.  **Audit Logging**: All admin actions are logged immutably with IP addresses.
5.  **Role-Based Access**: Strict separation of `USER`, `SUPPORT`, `ADMIN`, and `SUPER_ADMIN`.

## Architecture & Implementation

### 1. Database Schema (Prisma)

-   **User Model**: Added `role` field (`UserRole` enum).
-   **P2POrder Model**: Added dispute metadata:
    -   `disputeReason`: Reason provided by the user.
    -   `resolvedBy`: ID of the admin who resolved it.
    -   `resolutionNotes`: Admin's justification.
    -   `resolvedAt`: Timestamp of resolution.
-   **AdminLog Model**: New table for audit trails.
    -   `action`: e.g., `RESOLVE_RELEASE`, `RESOLVE_REFUND`, `CREATE_ADMIN`.
    -   `metadata`: JSON snapshot of the decision.
    -   `ipAddress`: IP of the admin at the time of action.

### 2. API Endpoints

Base URL: `/api/v1/admin`

| Method | Endpoint                | Role                   | Description                                         |
| :----- | :---------------------- | :--------------------- | :-------------------------------------------------- |
| `GET`  | `/disputes`             | `ADMIN`, `SUPER_ADMIN` | List paginated disputed orders.                     |
| `GET`  | `/disputes/:id`         | `ADMIN`, `SUPER_ADMIN` | Get order details, chat history, and evidence.      |
| `POST` | `/disputes/:id/resolve` | `ADMIN`, `SUPER_ADMIN` | Resolve dispute (`decision`: `RELEASE` / `REFUND`). |
| `POST` | `/users`                | `SUPER_ADMIN`          | Create a new Admin or Support user.                 |
| `GET`  | `/users`                | `SUPER_ADMIN`          | List all admin users.                               |

### 3. Security & Access Control

-   **Middleware**: `requireRole` ensures only authorized users can access admin routes.
-   **Token Security**: JWT payloads now include the `role` field for efficient checks.
-   **IP Logging**: Every critical action captures the admin's IP address for accountability.

### 4. Real-time Notifications

-   **Socket Event**: `ORDER_RESOLVED` is emitted to both the Buyer and Seller immediately upon resolution.

## Setup & Seeding

A seeding script (`prisma/seed.ts`) ensures a **Super Admin** exists on startup.

-   **Credentials**: Configured via `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables.
-   **Default**: `admin@swaplink.com` / `SuperSecretAdmin123!` (if env not set).

## Verification

-   **Automated Tests**: Integration tests ensure fund movements and status updates are atomic.
-   **Manual Verification**: Walkthrough available in `walkthrough.md`.
