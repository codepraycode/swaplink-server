# Transfer & Beneficiary Module Implementation

## Overview

The Transfer and Beneficiary modules handle all fund movements within the SwapLink system, including internal P2P transfers, external bank transfers, and beneficiary management.

## 1. Data Models

### Transaction (`Transaction`)

Records every fund movement.

-   **`type`**: `DEPOSIT`, `WITHDRAWAL`, `TRANSFER`, `BILL_PAYMENT`, `FEE`, `REVERSAL`.
-   **`status`**: `PENDING`, `COMPLETED`, `FAILED`, `CANCELLED`.
-   **`reference`**: Unique transaction reference.
-   **`idempotencyKey`**: Unique key to prevent duplicate processing.
-   **`metadata`**: JSON field for storing external gateway responses (e.g., Paystack/Flutterwave refs).

### Beneficiary (`Beneficiary`)

Stores saved recipients for quick access.

-   **`userId`**: Owner of the beneficiary.
-   **`accountNumber`**, **`bankCode`**: Unique composite key per user.
-   **`isInternal`**: Boolean flag indicating if the beneficiary is a SwapLink user.

### Wallet (`Wallet`) & Virtual Account (`VirtualAccount`)

-   **`Wallet`**: Holds the user's NGN balance.
-   **`VirtualAccount`**: Linked to the wallet for receiving deposits.

## 2. Services

### `TransferService` (`src/shared/lib/services/transfer.service.ts`)

The core orchestrator.

-   **`processTransfer(payload)`**:
    -   Verifies Transaction PIN.
    -   Checks for duplicate `idempotencyKey`.
    -   Resolves destination (Internal vs External).
    -   **Internal**: Executes atomic `prisma.$transaction` to debit sender and credit receiver instantly.
    -   **External**: Debits sender, creates `PENDING` transaction, and adds job to `transfer-queue` (BullMQ).
    -   Auto-saves beneficiary if `saveBeneficiary` is true.

### `BeneficiaryService` (`src/shared/lib/services/beneficiary.service.ts`)

-   **`createBeneficiary`**: Saves a new beneficiary.
-   **`getBeneficiaries`**: Retrieves list for a user.
-   **`validateBeneficiary`**: Ensures no duplicates.

### `PinService` (`src/shared/lib/services/pin.service.ts`)

-   **`verifyPin`**: Checks hash against stored PIN. Implements lockout policy (3 failed attempts = 15 min lock).
-   **`setPin` / `updatePin`**: Manages PIN lifecycle.

### `NameEnquiryService` (`src/shared/lib/services/name-enquiry.service.ts`)

-   **`resolveAccount`**:
    1.  Checks internal `VirtualAccount` table.
    2.  If not found, calls external banking provider (mocked).

## 3. Workflows

### Internal Transfer (P2P)

1.  **Request**: User submits amount, account number, PIN.
2.  **Validation**: PIN verified, Balance checked.
3.  **Execution**:
    -   Debit Sender Wallet.
    -   Credit Receiver Wallet.
    -   Create `COMPLETED` Transaction record.
4.  **Response**: Success message.

### External Transfer

1.  **Request**: User submits amount, bank code, account number, PIN.
2.  **Validation**: PIN verified, Balance checked.
3.  **Execution**:
    -   Debit Sender Wallet.
    -   Create `PENDING` Transaction record.
    -   **Queue**: Job added to `transfer-queue`.
4.  **Response**: "Transfer processing" message.
5.  **Background Worker**:
    -   Picks up job.
    -   Calls External Bank API.
    -   **Success**: Updates Transaction to `COMPLETED`.
    -   **Failure**: Updates Transaction to `FAILED` and **Refunds** Sender.

## 4. API Endpoints

| Method | Endpoint                          | Description                              |
| :----- | :-------------------------------- | :--------------------------------------- |
| `POST` | `/api/v1/transfers/name-enquiry`  | Resolve account name (Internal/External) |
| `POST` | `/api/v1/transfers/process`       | Initiate a transfer                      |
| `POST` | `/api/v1/transfers/pin`           | Set or update transaction PIN            |
| `GET`  | `/api/v1/transfers/beneficiaries` | Get saved beneficiaries                  |

## 5. Security Measures

-   **PIN Hashing**: All PINs are hashed using `bcrypt`.
-   **Rate Limiting**: PIN verification has strict rate limiting and lockout.
-   **Idempotency**: Critical for preventing double-debiting on network retries.
-   **Atomic Transactions**: Internal transfers use database transactions to ensure data integrity.
