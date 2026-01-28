# Payment Method System Update Summary

## Changes Made

### 1. Updated Service Logic (`p2p-payment-method.service.ts`)

#### Before:

- Required complex banking details (routing numbers, IBANs, sort codes, institution numbers)
- Supported USD, EUR, GBP, CAD with traditional banking
- Complex validation for each currency

#### After:

- **CAD**: Interac e-Transfer (email-based)
- **USD**: Zelle (email-based)
- **GBP**: Traditional bank transfer (account number)
- **EUR**: Removed (can be added later with SEPA)

---

## New Request Format

### CAD Payment Method

```json
{
    "currency": "CAD",
    "accountName": "John Doe",
    "email": "john@example.com",
    "isPrimary": true
}
```

**Stored as:**

- `bankName`: "Interac" (auto-set)
- `accountNumber`: "" (empty)
- `accountName`: "John Doe"
- `details`: `{ "email": "john@example.com" }`

---

### USD Payment Method

```json
{
    "currency": "USD",
    "accountName": "Jane Smith",
    "email": "jane@example.com",
    "isPrimary": true
}
```

**Stored as:**

- `bankName`: "Zelle" (auto-set)
- `accountNumber`: "" (empty)
- `accountName`: "Jane Smith"
- `details`: `{ "email": "jane@example.com" }`

---

### GBP Payment Method

```json
{
    "currency": "GBP",
    "bankName": "Barclays",
    "accountName": "Robert Johnson",
    "accountNumber": "12345678",
    "isPrimary": false
}
```

**Stored as:**

- `bankName`: "Barclays" (or "UK Bank Transfer" if not provided)
- `accountNumber`: "12345678"
- `accountName`: "Robert Johnson"
- `details`: `{}` (empty)

---

## Key Features

### ✅ Auto-Default Bank Names

```typescript
getDefaultBank(currency: string): string {
  switch (currency) {
    case 'CAD': return 'Interac';
    case 'USD': return 'Zelle';
    case 'GBP': return 'UK Bank Transfer';
    default: return 'Bank Transfer';
  }
}
```

### ✅ Email Validation (CAD/USD)

- Validates email format using regex
- Required for Interac and Zelle transfers
- Error: "Valid email is required for CAD (Interac) transfers"

### ✅ Account Number Validation (GBP)

- Must be exactly 8 digits
- Strips spaces before validation
- Error: "Invalid UK account number format (must be 8 digits)"

### ✅ Simplified Data Structure

- Email stored in `details` JSON field
- `accountNumber` empty for email-based systems
- Backward compatible with existing schema

---

## Database Schema (No Changes Required)

The existing `P2PPaymentMethod` model works perfectly:

```prisma
model P2PPaymentMethod {
  id            String   @id @default(uuid())
  userId        String
  currency      String   // CAD, USD, GBP
  bankName      String   // Interac, Zelle, UK Bank Transfer
  accountNumber String   // Empty for CAD/USD, 8-digit for GBP
  accountName   String   // Recipient name
  details       Json     // { email: "..." } for CAD/USD
  isPrimary     Boolean  @default(false)
  isActive      Boolean  @default(true)

  ads           P2PAd[]
  user          User     @relation(fields: [userId], references: [id])

  @@map("p2p_payment_methods")
}
```

**No migration needed!** The schema is flexible enough to handle both old and new formats.

---

## Validation Rules

| Currency | Required Fields                            | Validation             |
| -------- | ------------------------------------------ | ---------------------- |
| **CAD**  | `accountName`, `email`                     | Valid email format     |
| **USD**  | `accountName`, `email`                     | Valid email format     |
| **GBP**  | `accountName`, `accountNumber`, `bankName` | 8-digit account number |

---

## Error Messages

### CAD/USD Errors

```
"Account name is required"
"Valid email is required for CAD (Interac) transfers"
"Valid email is required for USD (Zelle) transfers"
```

### GBP Errors

```
"Account name is required"
"Account number is required for GBP transfers"
"Invalid UK account number format (must be 8 digits)"
```

### General Errors

```
"Currency EUR is not supported for P2P. Supported currencies: CAD, USD, GBP"
"Payment method not found"
```

---

## Testing Checklist

- [ ] Create CAD payment method with valid email
- [ ] Create CAD payment method with invalid email (should fail)
- [ ] Create USD payment method with valid email
- [ ] Create USD payment method without email (should fail)
- [ ] Create GBP payment method with 8-digit account number
- [ ] Create GBP payment method with invalid account number (should fail)
- [ ] Try to create EUR payment method (should fail)
- [ ] Set multiple payment methods as primary for same currency (only last should be primary)
- [ ] Delete payment method linked to active ad (should soft delete)
- [ ] Delete payment method not linked to any ad (should hard delete)

---

## Next Steps

### Recommended:

1. **Update Frontend Forms**: Adjust UI to collect email for CAD/USD, account number for GBP
2. **Add TypeScript DTOs**: Create proper request/response types
3. **Update API Documentation**: Swagger/OpenAPI specs
4. **Add Unit Tests**: Test validation logic
5. **Migration Script**: (Optional) Convert existing payment methods to new format

### Optional Enhancements:

- Support phone numbers for Interac/Zelle (alternative to email)
- Add payment method verification flow
- Support EUR with SEPA Instant
- Add payment method nicknames ("My Zelle", "Business Interac")
- Add payment method usage analytics

---

## Files Modified

1. ✅ `src/api/modules/p2p/payment-method/p2p-payment-method.service.ts`
    - Updated `createPaymentMethod()` to handle email field
    - Added `getDefaultBank()` helper
    - Rewrote `validateCurrencyDetails()` for new requirements
    - Added `isValidEmail()` validator

2. ✅ `docs/P2P_PAYMENT_METHODS.md` (NEW)
    - Comprehensive documentation
    - API examples
    - Testing guide

3. ✅ `docs/PAYMENT_METHOD_UPDATE_SUMMARY.md` (THIS FILE)
    - Change summary
    - Migration guide

---

## Backward Compatibility

### Existing Payment Methods

Old payment methods with routing numbers, IBANs, etc. will continue to work:

- They're stored in the `details` JSON field
- The system doesn't modify existing records
- New validations only apply to new payment methods

### Migration Strategy (If Needed)

If you want to migrate old payment methods to the new format:

```typescript
// Example migration script
async function migratePaymentMethods() {
    const oldMethods = await prisma.p2PPaymentMethod.findMany({
        where: {
            currency: { in: ['CAD', 'USD'] },
            // Find old format (has routing number or institution number)
        },
    });

    for (const method of oldMethods) {
        // Extract email from old details or prompt user
        // Update to new format
    }
}
```

---

## Support

For questions or issues:

1. Check `docs/P2P_PAYMENT_METHODS.md` for detailed documentation
2. Review validation error messages
3. Test with cURL examples provided in docs
4. Check database records to verify storage format
