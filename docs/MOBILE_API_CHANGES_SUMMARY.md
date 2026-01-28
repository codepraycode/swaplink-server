# API Changes Summary for Mobile Team

**Date:** 2026-01-28  
**Impact:** Breaking Changes  
**Action Required:** Update mobile app before next release

---

## 🚨 Breaking Changes

### 1. Payment Methods (P2P)

#### What Changed

- **CAD** now uses **Interac** (email-based) instead of bank routing
- **USD** now uses **Zelle** (email-based) instead of routing numbers
- **GBP** uses simple account number (8 digits) instead of sort codes
- **EUR** removed (can be added later)

#### Mobile Action Required

```diff
- Remove: Routing number, IBAN, sort code, institution number fields
+ Add: Email field for CAD/USD
+ Add: Conditional rendering based on currency
```

#### New API Format

```typescript
// CAD/USD (email-based)
POST /api/v1/p2p/payment-methods
{
  "currency": "CAD",
  "accountName": "John Doe",
  "email": "john@example.com"
}

// GBP (account-based)
{
  "currency": "GBP",
  "bankName": "Barclays",
  "accountName": "John Doe",
  "accountNumber": "12345678"
}
```

---

### 2. Profile Updates

#### What Changed

- **Name changes blocked** - Cannot update `firstName` or `lastName`
- **Address updates require proof** - Must upload utility bill/bank statement
- **New endpoint** - `PUT /api/v1/user/profile/address`

#### Mobile Action Required

```diff
- Remove: First name and last name edit fields from profile
- Remove: Address fields from profile update
+ Add: New address update screen with file upload
+ Add: expo-document-picker for proof of address
+ Add: "Contact Support" for name changes
```

#### New API Format

```typescript
// Address update (multipart/form-data)
PUT /api/v1/user/profile/address
FormData {
  address: "123 Main Street",
  city: "Lagos",
  state: "Lagos",
  country: "Nigeria",
  postalCode: "100001",
  proofOfAddress: [FILE] // Required: JPG, PNG, PDF (max 5MB)
}
```

---

## 📋 Quick Migration Checklist

### Payment Methods

- [ ] Update payment method form UI
- [ ] Add email input for CAD/USD
- [ ] Add account number input for GBP
- [ ] Remove old fields (routing, IBAN, etc.)
- [ ] Update validation logic
- [ ] Test all three currencies

### Profile Updates

- [ ] Remove name edit fields
- [ ] Create address update screen
- [ ] Install `expo-document-picker`
- [ ] Implement file upload
- [ ] Add file validation (type, size)
- [ ] Test address update flow

---

## 🔧 Required Dependencies

```bash
npx expo install expo-document-picker
```

---

## 📱 Code Snippets

### Payment Method Form (CAD/USD)

```jsx
{
    (currency === 'CAD' || currency === 'USD') && (
        <TextInput
            placeholder={currency === 'CAD' ? 'Interac Email' : 'Zelle Email'}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
        />
    );
}
```

### Address Update with File Upload

```jsx
import * as DocumentPicker from 'expo-document-picker';

const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'application/pdf'],
    });
    if (result.type === 'success') {
        setProofDocument(result);
    }
};

const updateAddress = async () => {
    const formData = new FormData();
    formData.append('address', address);
    formData.append('city', city);
    formData.append('proofOfAddress', {
        uri: proofDocument.uri,
        type: proofDocument.mimeType,
        name: proofDocument.name,
    });

    await fetch('/api/v1/user/profile/address', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });
};
```

---

## ⚠️ Common Errors

### Payment Methods

```json
// Missing email for CAD/USD
{
  "success": false,
  "message": "Valid email is required for CAD (Interac) transfers"
}

// Invalid account number for GBP
{
  "success": false,
  "message": "Invalid UK account number format (must be 8 digits)"
}
```

### Profile Updates

```json
// Name change attempt
{
  "success": false,
  "message": "Name changes are not allowed. Please contact support..."
}

// Missing proof of address
{
  "success": false,
  "message": "Proof of address document is required..."
}

// File too large
{
  "success": false,
  "message": "File is too large. Please upload a smaller file."
}
```

---

## 📚 Full Documentation

- **Complete Integration Guide**: `MOBILE_INTEGRATION_GUIDE.md`
- **Payment Methods Details**: `P2P_PAYMENT_METHODS.md`
- **Profile Update Details**: `PROFILE_UPDATE_RESTRICTIONS.md`

---

## 🆘 Need Help?

1. Check full documentation files
2. Review code examples in integration guide
3. Test with provided cURL examples
4. Contact backend team

---

## 📅 Timeline

- **Deadline**: Before next app release
- **Testing**: Required before production
- **Rollout**: Coordinate with backend deployment

---

**Questions?** Contact the backend team or check the full documentation.
