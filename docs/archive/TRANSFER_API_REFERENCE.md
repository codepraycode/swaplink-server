# Transfer API Quick Reference

## Two-Step Transfer Process

### Step 1: Verify PIN

**Endpoint**: `POST /api/transfer/verify-pin`

**Request**:

```json
{
    "pin": "1234"
}
```

**Success Response (200)**:

```json
{
    "success": true,
    "message": "Success",
    "data": {
        "message": "PIN verified successfully",
        "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
        "expiresIn": 300
    }
}
```

**Error Responses**:

-   `400` - Invalid PIN (shows remaining attempts)
-   `403` - PIN locked (shows retry time)

---

### Step 2: Process Transfer

**Endpoint**: `POST /api/transfer/process`

**Headers**:

```
Idempotency-Key: <key-from-step-1>
```

**Request**:

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

**Success Response (200)**:

```json
{
    "success": true,
    "message": "Success",
    "data": {
        "message": "Transfer successful",
        "transactionId": "tx_123456789",
        "status": "COMPLETED",
        "amount": 5000,
        "recipient": "John Doe"
    }
}
```

**Error Responses**:

-   `400` - Missing idempotency key header
-   `400` - Insufficient funds
-   `403` - Invalid/expired idempotency key
-   `403` - Key belongs to different user

---

## Other Transfer Endpoints

### Set/Update PIN

**Endpoint**: `POST /api/transfer/pin`

**Set New PIN**:

```json
{
    "newPin": "1234"
}
```

**Update Existing PIN**:

```json
{
    "oldPin": "1234",
    "newPin": "5678"
}
```

---

### Name Enquiry

**Endpoint**: `POST /api/transfer/name-enquiry`

**Request**:

```json
{
    "accountNumber": "0123456789",
    "bankCode": "058"
}
```

**Response**:

```json
{
    "accountName": "John Doe",
    "bankName": "GTBank",
    "isInternal": false
}
```

---

### Get Beneficiaries

**Endpoint**: `GET /api/transfer/beneficiaries`

**Response**:

```json
{
    "success": true,
    "data": [
        {
            "id": "ben_123",
            "accountNumber": "0123456789",
            "accountName": "John Doe",
            "bankCode": "058",
            "bankName": "GTBank",
            "isInternal": false
        }
    ]
}
```

---

### Get Transactions

**Endpoint**: `GET /api/transfer/transactions`

**Query Parameters**:

-   `page` (optional, default: 1)
-   `limit` (optional, default: 20)
-   `type` (optional: TRANSFER, DEPOSIT, WITHDRAWAL)

**Response**:

```json
{
  "success": true,
  "data": {
    "transactions": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100
    }
  }
}
```

---

## Important Notes

1. **All endpoints require authentication** - Include `Authorization: Bearer <token>` header
2. **Idempotency keys expire after 5 minutes** - User must re-verify PIN if expired
3. **PIN attempts are limited** - 3 failed attempts result in 15-minute lockout
4. **Idempotency keys are single-use** - They are deleted after successful transfer
5. **Content-Type must be application/json** for all POST requests
