# Two-Step Transfer Flow

## Overview

The transfer process has been updated to use a two-step flow for enhanced security and better user experience:

1. **Step 1: Verify PIN** - User verifies their transaction PIN and receives an idempotency key
2. **Step 2: Process Transfer** - User submits transfer request with the idempotency key in the header

## API Endpoints

### Step 1: Verify PIN

**Endpoint:** `POST /api/transfer/verify-pin`

**Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
    "pin": "1234"
}
```

**Success Response (200):**

```json
{
    "success": true,
    "message": "PIN verified successfully",
    "data": {
        "message": "PIN verified successfully",
        "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
        "expiresIn": 300
    }
}
```

**Error Responses:**

-   **400 Bad Request** - Invalid PIN format or PIN not set

```json
{
    "success": false,
    "message": "Invalid PIN. 2 attempts remaining."
}
```

-   **403 Forbidden** - PIN locked due to too many failed attempts

```json
{
    "success": false,
    "message": "PIN locked. Try again in 15 minutes."
}
```

### Step 2: Process Transfer

**Endpoint:** `POST /api/transfer/process`

**Headers:**

```
Authorization: Bearer <jwt_token>
Idempotency-Key: <idempotency_key_from_step_1>
Content-Type: application/json
```

**Request Body:**

```json
{
    "amount": 5000,
    "accountNumber": "0123456789",
    "bankCode": "058",
    "accountName": "John Doe",
    "narration": "Payment for services",
    "saveBeneficiary": true
}
```

**Success Response (200):**

```json
{
    "success": true,
    "message": "Transfer successful",
    "data": {
        "message": "Transfer successful",
        "transactionId": "tx_123456789",
        "status": "COMPLETED",
        "amount": 5000,
        "recipient": "John Doe"
    }
}
```

**Error Responses:**

-   **400 Bad Request** - Missing or invalid idempotency key header

```json
{
    "success": false,
    "message": "Idempotency-Key header is required"
}
```

-   **403 Forbidden** - Invalid or expired idempotency key

```json
{
    "success": false,
    "message": "Invalid or expired idempotency key. Please verify your PIN again."
}
```

-   **403 Forbidden** - Idempotency key doesn't belong to user

```json
{
    "success": false,
    "message": "Idempotency key does not belong to this user."
}
```

## Flow Diagram

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. POST /verify-pin
       │    { pin: "1234" }
       ▼
┌─────────────┐
│   Server    │
└──────┬──────┘
       │
       │ 2. Verify PIN
       │    - Check PIN attempts (Redis)
       │    - Validate PIN hash
       │    - Generate idempotency key
       │    - Store key in Redis (5 min TTL)
       │
       │ 3. Return idempotency key
       ▼
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 4. POST /process
       │    Headers: { Idempotency-Key: "..." }
       │    Body: { amount, accountNumber, ... }
       ▼
┌─────────────┐
│   Server    │
└──────┬──────┘
       │
       │ 5. Validate idempotency key
       │    - Check key exists in Redis
       │    - Verify key belongs to user
       │    - Check for duplicate transaction
       │
       │ 6. Process transfer
       │    - Resolve account
       │    - Check balance
       │    - Execute transfer
       │    - Delete idempotency key
       │
       │ 7. Return result
       ▼
┌─────────────┐
│   Client    │
└─────────────┘
```

## Security Features

### 1. PIN Rate Limiting

-   Maximum 3 failed PIN attempts
-   15-minute lockout after exceeding attempts
-   Attempts counter stored in Redis with TTL

### 2. Idempotency Key Validation

-   Keys are generated server-side (UUID v4)
-   Keys are stored in Redis with 5-minute expiration
-   Keys are tied to specific users
-   Keys are deleted after successful use
-   Prevents replay attacks and duplicate transactions

### 3. Transaction Deduplication

-   Idempotency keys are stored in the database
-   Duplicate requests return the original transaction result
-   Prevents accidental double-charging

## Client Implementation Example

```javascript
// Step 1: Verify PIN
async function verifyPin(pin) {
    const response = await fetch('/api/transfer/verify-pin', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
    });

    const data = await response.json();
    return data.data.idempotencyKey;
}

// Step 2: Process Transfer
async function processTransfer(idempotencyKey, transferData) {
    const response = await fetch('/api/transfer/process', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Idempotency-Key': idempotencyKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(transferData),
    });

    return await response.json();
}

// Complete flow
async function makeTransfer(pin, transferData) {
    try {
        // Step 1: Verify PIN
        const idempotencyKey = await verifyPin(pin);

        // Step 2: Process transfer
        const result = await processTransfer(idempotencyKey, transferData);

        console.log('Transfer successful:', result);
    } catch (error) {
        console.error('Transfer failed:', error);
    }
}
```

## Benefits of Two-Step Flow

1. **Better UX**: Separates PIN verification from transfer processing, allowing for better error handling and user feedback
2. **Enhanced Security**: Idempotency keys are server-generated and time-limited
3. **Prevents Replay Attacks**: Keys can only be used once and expire after 5 minutes
4. **Clearer Separation of Concerns**: PIN verification logic is isolated from transfer logic
5. **Easier Testing**: Each step can be tested independently

## Migration Notes

### Breaking Changes

-   The `/process` endpoint no longer accepts `pin` in the request body
-   The `Idempotency-Key` header is now required for `/process` endpoint
-   Clients must call `/verify-pin` before calling `/process`

### Backward Compatibility

-   The old flow is **not supported**
-   All clients must update to use the new two-step flow

## Error Handling Best Practices

1. **PIN Verification Errors**: Show remaining attempts to user
2. **Expired Idempotency Key**: Prompt user to re-enter PIN
3. **Network Errors**: Implement retry logic with exponential backoff
4. **Duplicate Transaction**: Inform user that transaction was already processed
