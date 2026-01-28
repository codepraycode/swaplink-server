# 📱 Mobile App - API Changelog

**Version:** 1.0.0  
**Date:** 2026-01-28  
**Type:** Breaking Changes

---

## 📊 Overview

| Feature         | Status      | Impact | Action Required                     |
| --------------- | ----------- | ------ | ----------------------------------- |
| Payment Methods | 🔴 Breaking | High   | Update forms & validation           |
| Profile Updates | 🔴 Breaking | High   | Remove name fields, add file upload |
| Address Updates | 🟢 New      | Medium | Create new screen                   |

---

## 1️⃣ Payment Methods - Simplified & Modernized

### 🔴 Breaking Changes

#### Before (Deprecated)

```jsx
// ❌ Old complex form
<TextInput placeholder="Bank Name" />
<TextInput placeholder="Account Number" />
<TextInput placeholder="Routing Number" />      // USD
<TextInput placeholder="IBAN" />                // EUR
<TextInput placeholder="BIC/SWIFT" />           // EUR
<TextInput placeholder="Sort Code" />           // GBP
<TextInput placeholder="Institution Number" />  // CAD
<TextInput placeholder="Transit Number" />      // CAD
```

#### After (New)

```jsx
// ✅ New simplified form
<Picker>
  <Picker.Item label="🇨🇦 CAD (Interac)" value="CAD" />
  <Picker.Item label="🇺🇸 USD (Zelle)" value="USD" />
  <Picker.Item label="🇬🇧 GBP (Bank)" value="GBP" />
</Picker>

<TextInput placeholder="Account Name" />

{/* For CAD/USD */}
{isEmailBased && (
  <TextInput
    placeholder="Email"
    keyboardType="email-address"
  />
)}

{/* For GBP */}
{currency === 'GBP' && (
  <>
    <TextInput placeholder="Bank Name" />
    <TextInput
      placeholder="Account Number (8 digits)"
      keyboardType="numeric"
      maxLength={8}
    />
  </>
)}
```

### 📋 Currency Requirements

| Currency | System        | Required Fields                | Example              |
| -------- | ------------- | ------------------------------ | -------------------- |
| 🇨🇦 CAD   | Interac       | Account Name + Email           | `john@example.com`   |
| 🇺🇸 USD   | Zelle         | Account Name + Email           | `jane@example.com`   |
| 🇬🇧 GBP   | Bank Transfer | Account Name + Bank + Account# | `Barclays, 12345678` |
| 🇪🇺 EUR   | ❌ Removed    | -                              | -                    |

### 🔄 API Changes

#### Request Format

```typescript
// Before ❌
POST /api/v1/p2p/payment-methods
{
  "currency": "USD",
  "bankName": "Chase Bank",
  "accountNumber": "1234567890",
  "accountName": "John Doe",
  "details": {
    "routingNumber": "021000021"
  }
}

// After ✅
POST /api/v1/p2p/payment-methods
{
  "currency": "USD",
  "accountName": "John Doe",
  "email": "john@example.com"
}
```

#### Response Format

```json
{
    "success": true,
    "message": "Payment method added successfully",
    "data": {
        "id": "uuid",
        "currency": "USD",
        "bankName": "Zelle", // Auto-set
        "accountName": "John Doe",
        "accountNumber": "", // Empty for email-based
        "details": {
            "email": "john@example.com" // Stored here
        },
        "isPrimary": true
    }
}
```

---

## 2️⃣ Profile Updates - Security Enhanced

### 🔴 Breaking Changes

#### Name Changes Blocked

```jsx
// Before ❌
<TextInput
  placeholder="First Name"
  value={firstName}
  onChangeText={setFirstName}
/>
<TextInput
  placeholder="Last Name"
  value={lastName}
  onChangeText={setLastName}
/>

// After ✅
<View style={styles.infoBox}>
  <Text>To change your name, please contact support</Text>
  <Button title="Contact Support" onPress={contactSupport} />
</View>
```

#### Address Updates Require Proof

```jsx
// Before ❌
<TextInput
  placeholder="Address"
  value={address}
  onChangeText={setAddress}
/>

// After ✅
// Separate screen with file upload
<AddressUpdateScreen />
```

### 🟢 New Feature: Address Update with Proof

#### New Screen Required

```jsx
// screens/AddressUpdateScreen.tsx
import * as DocumentPicker from 'expo-document-picker';

const AddressUpdateScreen = () => {
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [proofDocument, setProofDocument] = useState(null);

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

        const response = await fetch('/api/v1/user/profile/address', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });
    };

    return (
        <View>
            <TextInput placeholder="Address" value={address} onChangeText={setAddress} />
            <TextInput placeholder="City" value={city} onChangeText={setCity} />

            <View style={styles.documentSection}>
                <Text>📄 Proof of Address Required</Text>
                <Text>Upload utility bill or bank statement</Text>
                <Button
                    title={proofDocument ? `✓ ${proofDocument.name}` : 'Upload Document'}
                    onPress={pickDocument}
                />
            </View>

            <Button title="Update Address" onPress={updateAddress} disabled={!proofDocument} />
        </View>
    );
};
```

### 🔄 API Changes

#### New Endpoint

```typescript
PUT /api/v1/user/profile/address
Content-Type: multipart/form-data

// Form Fields
address: "123 Main Street"
city: "Lagos"
state: "Lagos"
country: "Nigeria"
postalCode: "100001"
proofOfAddress: [FILE]  // JPG, PNG, PDF (max 5MB)
```

#### Response

```json
{
  "success": true,
  "message": "Address updated successfully. Your proof of address is pending review.",
  "data": {
    "user": { ... },
    "kycInfo": {
      "address": "123 Main Street",
      "city": "Lagos",
      "state": "Lagos",
      "country": "Nigeria",
      "postalCode": "100001"
    }
  }
}
```

---

## 📦 Dependencies

### New Dependencies Required

```bash
npx expo install expo-document-picker
```

### Package.json

```json
{
    "dependencies": {
        "expo-document-picker": "^11.x.x"
    }
}
```

---

## 🎨 UI/UX Changes

### Payment Methods Screen

**Before:**

```
┌─────────────────────────┐
│ Add Payment Method      │
├─────────────────────────┤
│ Currency: [USD ▼]       │
│ Bank Name: [_______]    │
│ Account #: [_______]    │
│ Routing #: [_______]    │ ← Remove
│ Account Name: [____]    │
│                         │
│ [Add Method]            │
└─────────────────────────┘
```

**After:**

```
┌─────────────────────────┐
│ Add Payment Method      │
├─────────────────────────┤
│ Currency: [USD ▼]       │
│ 💰 Zelle                │ ← Auto-shown
│                         │
│ Account Name: [____]    │
│ Email: [___________]    │ ← New
│                         │
│ [Add Method]            │
└─────────────────────────┘
```

### Profile Screen

**Before:**

```
┌─────────────────────────┐
│ Edit Profile            │
├─────────────────────────┤
│ First Name: [_____]     │ ← Remove
│ Last Name: [______]     │ ← Remove
│ Email: john@example.com │
│ Phone: +234...          │
│ Address: [_________]    │ ← Remove
│ City: [___________]     │ ← Remove
│                         │
│ [Update Profile]        │
└─────────────────────────┘
```

**After:**

```
┌─────────────────────────┐
│ Edit Profile            │
├─────────────────────────┤
│ Name: John Doe          │ ← Read-only
│ ℹ️ Contact support to    │ ← New info
│   change your name      │
│                         │
│ Email: john@example.com │
│ Phone: +234...          │
│                         │
│ [Update Address] ────►  │ ← New button
│ [Change Avatar]         │
│ [Change Password]       │
└─────────────────────────┘

┌─────────────────────────┐
│ Update Address          │ ← New screen
├─────────────────────────┤
│ Address: [_________]    │
│ City: [___________]     │
│ State: [__________]     │
│ Country: [________]     │
│ Postal: [_________]     │
│                         │
│ 📄 Proof of Address     │
│ [Upload Document]       │
│ ✓ utility-bill.pdf      │
│                         │
│ [Update Address]        │
└─────────────────────────┘
```

---

## 🔍 Validation Changes

### Payment Methods

```typescript
// New validation logic
const validatePaymentMethod = (currency, data) => {
    if (!data.accountName) {
        return { valid: false, error: 'Account name required' };
    }

    switch (currency) {
        case 'CAD':
        case 'USD':
            if (!data.email || !isValidEmail(data.email)) {
                return {
                    valid: false,
                    error: `Email required for ${currency === 'CAD' ? 'Interac' : 'Zelle'}`,
                };
            }
            break;

        case 'GBP':
            if (!data.accountNumber || !/^\d{8}$/.test(data.accountNumber)) {
                return {
                    valid: false,
                    error: 'Account number must be 8 digits',
                };
            }
            if (!data.bankName) {
                return { valid: false, error: 'Bank name required' };
            }
            break;

        default:
            return { valid: false, error: 'Unsupported currency' };
    }

    return { valid: true };
};
```

### Address Updates

```typescript
// New validation logic
const validateAddressUpdate = (addressData, proofDocument) => {
    // At least one address field required
    const hasAddressField = Object.values(addressData).some(v => v);
    if (!hasAddressField) {
        return { valid: false, error: 'At least one address field required' };
    }

    // Proof document required
    if (!proofDocument) {
        return {
            valid: false,
            error: 'Proof of address document required',
        };
    }

    // File size check (max 5MB)
    if (proofDocument.size > 5 * 1024 * 1024) {
        return { valid: false, error: 'File too large (max 5MB)' };
    }

    // File type check
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(proofDocument.mimeType)) {
        return { valid: false, error: 'Invalid file type (JPG, PNG, PDF only)' };
    }

    return { valid: true };
};
```

---

## 🧪 Testing Checklist

### Payment Methods

- [ ] CAD with valid email → Success
- [ ] CAD with invalid email → Error
- [ ] CAD without email → Error
- [ ] USD with valid email → Success
- [ ] USD with invalid email → Error
- [ ] GBP with valid account number → Success
- [ ] GBP with invalid account number → Error
- [ ] GBP without bank name → Error
- [ ] EUR currency → Error (not supported)
- [ ] Display payment methods correctly
- [ ] Delete payment method
- [ ] Set primary payment method

### Profile Updates

- [ ] Attempt to change first name → Error
- [ ] Attempt to change last name → Error
- [ ] Update address with valid proof → Success
- [ ] Update address without proof → Error
- [ ] Update address with invalid file type → Error
- [ ] Update address with file > 5MB → Error
- [ ] Update only city with proof → Success
- [ ] Update avatar → Success (unchanged)
- [ ] Change password → Success (unchanged)

---

## 📊 Migration Timeline

| Phase     | Task                         | Duration      | Status     |
| --------- | ---------------------------- | ------------- | ---------- |
| 1         | Install dependencies         | 1 hour        | ⏳ Pending |
| 2         | Update payment method forms  | 4 hours       | ⏳ Pending |
| 3         | Create address update screen | 4 hours       | ⏳ Pending |
| 4         | Update validation logic      | 2 hours       | ⏳ Pending |
| 5         | Update API service calls     | 2 hours       | ⏳ Pending |
| 6         | Testing                      | 4 hours       | ⏳ Pending |
| 7         | Bug fixes                    | 2 hours       | ⏳ Pending |
| **Total** |                              | **~19 hours** |            |

---

## 🚀 Deployment Checklist

- [ ] Backend API deployed
- [ ] Mobile app updated
- [ ] Dependencies installed
- [ ] All tests passing
- [ ] Error handling tested
- [ ] User notifications configured
- [ ] Documentation updated
- [ ] Team briefed
- [ ] Rollback plan ready

---

## 📞 Support

**Questions?**

- Check: `MOBILE_INTEGRATION_GUIDE.md` (full examples)
- Check: `MOBILE_API_CHANGES_SUMMARY.md` (quick reference)
- Contact: Backend team

**Issues?**

- Report bugs with screenshots
- Include API error messages
- Provide device/OS info

---

**Last Updated:** 2026-01-28  
**Next Review:** After mobile app update
