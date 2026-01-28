# P2P Payment Methods

## Overview

Payment methods in the P2P system allow users to receive foreign currency (FX) transfers. The system uses modern, email-based payment systems for CAD and USD, and traditional bank transfers for GBP.

## Supported Currencies & Payment Systems

### 🇨🇦 CAD (Canadian Dollar)

- **Default System**: Interac e-Transfer
- **Required Fields**:
    - Account Name (recipient's name)
    - Email (Interac email)
- **Optional**: Bank name (defaults to "Interac")

**Example Request:**

```json
{
    "currency": "CAD",
    "accountName": "John Doe",
    "email": "john.doe@example.com",
    "isPrimary": true
}
```

---

### 🇺🇸 USD (US Dollar)

- **Default System**: Zelle
- **Required Fields**:
    - Account Name (recipient's name)
    - Email (Zelle email)
- **Optional**: Bank name (defaults to "Zelle")

**Example Request:**

```json
{
    "currency": "USD",
    "accountName": "Jane Smith",
    "email": "jane.smith@example.com",
    "isPrimary": true
}
```

---

### 🇬🇧 GBP (British Pound)

- **Default System**: UK Bank Transfer
- **Required Fields**:
    - Bank Name
    - Account Name (recipient's name)
    - Account Number (8 digits)
- **Validation**: Account number must be exactly 8 digits

**Example Request:**

```json
{
    "currency": "GBP",
    "bankName": "Barclays",
    "accountName": "Robert Johnson",
    "accountNumber": "12345678",
    "isPrimary": true
}
```

---

## API Endpoints

### Create Payment Method

```
POST /api/v1/p2p/payment-methods
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  currency: 'CAD' | 'USD' | 'GBP';
  accountName: string;           // Required for all
  email?: string;                // Required for CAD, USD
  accountNumber?: string;        // Required for GBP
  bankName?: string;             // Optional (has defaults)
  isPrimary?: boolean;           // Default: false
}
```

**Response:**

```json
{
    "success": true,
    "message": "Payment method added successfully",
    "data": {
        "id": "uuid",
        "userId": "uuid",
        "currency": "CAD",
        "bankName": "Interac",
        "accountNumber": "",
        "accountName": "John Doe",
        "details": {
            "email": "john.doe@example.com"
        },
        "isPrimary": true,
        "isActive": true
    }
}
```

---

### Get All Payment Methods

```
GET /api/v1/p2p/payment-methods
Authorization: Bearer <token>
```

**Response:**

```json
{
    "success": true,
    "message": "Payment methods retrieved successfully",
    "data": [
        {
            "id": "uuid",
            "currency": "CAD",
            "bankName": "Interac",
            "accountName": "John Doe",
            "details": { "email": "john.doe@example.com" },
            "isPrimary": true
        },
        {
            "id": "uuid",
            "currency": "USD",
            "bankName": "Zelle",
            "accountName": "John Doe",
            "details": { "email": "john@gmail.com" },
            "isPrimary": false
        }
    ]
}
```

---

### Delete Payment Method

```
DELETE /api/v1/p2p/payment-methods/:id
Authorization: Bearer <token>
```

**Behavior:**

- If linked to active/paused ads: **Soft delete** (sets `isActive: false`)
- Otherwise: **Hard delete** (removes from database)

---

## Database Schema

```prisma
model P2PPaymentMethod {
  id            String   @id @default(uuid())
  userId        String
  currency      String   // CAD, USD, GBP
  bankName      String   // Interac, Zelle, UK Bank Transfer
  accountNumber String   // Empty for email-based, 8-digit for GBP
  accountName   String   // Recipient name
  details       Json     // { email: "..." } for CAD/USD
  isPrimary     Boolean  @default(false)
  isActive      Boolean  @default(true)

  ads           P2PAd[]
  user          User     @relation(fields: [userId], references: [id])

  @@map("p2p_payment_methods")
}
```

---

## Business Rules

### 1. Primary Payment Method

- Each user can have **one primary payment method per currency**
- Setting a new primary automatically unsets the previous one
- Primary methods appear first in listings

### 2. Soft Delete Protection

- Payment methods linked to **active or paused ads** cannot be hard deleted
- They are soft deleted (marked inactive) instead
- This prevents breaking active P2P trades

### 3. Email Validation

- CAD and USD require valid email format
- Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

### 4. Account Number Validation (GBP)

- Must be exactly 8 digits
- Spaces are stripped during validation
- Example: "1234 5678" → valid

---

## Usage in P2P Trades

### BUY_FX Ads (Maker wants to receive FX)

- Maker **must** provide a payment method when creating the ad
- The payment method is where they'll receive the FX
- Example: "I want to buy 500 USD" → Provide Zelle email

### SELL_FX Orders (Taker wants to receive FX)

- Taker **must** provide a payment method when creating the order
- The payment method is where they'll receive the FX
- Example: "I'll buy your 500 USD" → Provide Zelle email

### Payment Method Snapshot

When an order is created, the payment method details are **snapshotted** into the order:

```typescript
{
  bankName: "Zelle",
  accountNumber: "",
  accountName: "John Doe",
  bankDetails: { email: "john@example.com" }
}
```

This prevents issues if users modify/delete their payment methods during active trades.

---

## Migration from Old System

### Old Structure (Deprecated)

```json
{
    "currency": "USD",
    "bankName": "Chase Bank",
    "accountNumber": "1234567890",
    "accountName": "John Doe",
    "details": {
        "routingNumber": "021000021"
    }
}
```

### New Structure

```json
{
    "currency": "USD",
    "accountName": "John Doe",
    "email": "john@example.com"
}
```

**Why the change?**

- ✅ Simpler for users (no routing numbers, IBANs, sort codes)
- ✅ Faster transfers (Interac, Zelle are instant)
- ✅ More secure (email-based authentication)
- ✅ Better UX (users already know their email)

---

## Error Handling

### Common Validation Errors

**Missing Email (CAD/USD):**

```json
{
    "success": false,
    "message": "Valid email is required for CAD (Interac) transfers"
}
```

**Missing Account Number (GBP):**

```json
{
    "success": false,
    "message": "Account number is required for GBP transfers"
}
```

**Invalid Account Number (GBP):**

```json
{
    "success": false,
    "message": "Invalid UK account number format (must be 8 digits)"
}
```

**Unsupported Currency:**

```json
{
    "success": false,
    "message": "Currency EUR is not supported for P2P. Supported currencies: CAD, USD, GBP"
}
```

---

## Testing Examples

### cURL Examples

**Add CAD Payment Method:**

```bash
curl -X POST http://localhost:3000/api/v1/p2p/payment-methods \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "CAD",
    "accountName": "John Doe",
    "email": "john.interac@example.com",
    "isPrimary": true
  }'
```

**Add USD Payment Method:**

```bash
curl -X POST http://localhost:3000/api/v1/p2p/payment-methods \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "USD",
    "accountName": "Jane Smith",
    "email": "jane.zelle@example.com"
  }'
```

**Add GBP Payment Method:**

```bash
curl -X POST http://localhost:3000/api/v1/p2p/payment-methods \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "GBP",
    "bankName": "Barclays",
    "accountName": "Robert Johnson",
    "accountNumber": "12345678"
  }'
```

---

## Future Enhancements

- [ ] Add EUR support (SEPA Instant)
- [ ] Support phone numbers for Interac/Zelle
- [ ] Add payment method verification
- [ ] Support multiple emails per currency
- [ ] Add payment method nicknames
