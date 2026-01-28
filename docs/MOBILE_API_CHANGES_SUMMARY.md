# API Changes Summary for Mobile Team

**Date:** 2026-01-28  
**Impact:** Breaking Changes  
**Action Required:** Update mobile app before next release

---

## 🚨 Breaking Changes

### 1. User Object Update

#### What Changed

- **kyc** object added to the user object returned by `me` and `login` endpoints.
- This object contains **all KYC information** submitted by the user including:
    - Personal details (date of birth, address, city, state, country, postal code)
    - Identity information (BVN, NIN, government ID)
    - Document URLs (selfie, video, and uploaded documents)
    - Document details array with status and verification information

#### Mobile Action Required

- Update user interface to display KYC information where appropriate.
- Use the `kyc` object to show user's address, date of birth, and verification status.
- Access document URLs for displaying user's selfie, video, and uploaded documents.

#### New User Object Structure

```typescript
interface UserResponse {
    id: string;
    email: string | null;
    phone: string | null;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    kycLevel: 'NONE' | 'BASIC' | 'INTERMEDIATE' | 'FULL';
    kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'STALE';
    isVerified: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
    isActive: boolean;
    twoFactorEnabled: boolean;
    pushToken: string | null;
    flagType: 'NONE' | 'KYC_LIMIT' | 'SUSPICIOUS' | 'FRAUD' | 'MANUAL';
    flagReason: string | null;
    flaggedAt: string | null; // ISO Date String
    lastLogin: string | null; // ISO Date String
    createdAt: string; // ISO Date String
    updatedAt: string; // ISO Date String
    transactionPin: string | null;
    pinAttempts: number;
    pinLockedUntil: string | null; // ISO Date String
    deviceId: string | null;
    cumulativeInflow: string; // Decimal string
    role: 'USER' | 'SUPPORT' | 'ADMIN' | 'SUPER_ADMIN';

    // ✅ New KYC Object (includes ALL KYC information)
    kyc: {
        // Personal Information
        dob: string | null; // ISO Date String
        address: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        postalCode: string | null;

        // Identity Information
        bvn: string | null;
        nin: string | null;
        governmentId: string | null;

        // Document URLs
        selfieUrl: string | null;
        videoUrl: string | null;

        // Document Details Array
        documents: Array<{
            id: string;
            documentType: string; // e.g., "NIN", "BVN_SLIP", "PASSPORT", "PROOF_OF_ADDRESS"
            documentUrl: string;
            status: 'PENDING' | 'APPROVED' | 'REJECTED';
            rejectionReason: string | null;
            verifiedAt: string | null; // ISO Date String
            createdAt: string; // ISO Date String
        }>;
    } | null;

    // Wallet object (if included)
    wallet: {
        id: string;
        balance: number;
        lockedBalance: number;
        accountNumber?: string;
        bankName?: string;
        accountName?: string;
    } | null;
}
```

#### Example API Response

```json
// GET /api/v1/auth/me or POST /api/v1/auth/login
{
    "success": true,
    "message": "User profile retrieved successfully",
    "data": {
        "id": "user-123",
        "email": "john.doe@example.com",
        "phone": "+2348012345678",
        "firstName": "John",
        "lastName": "Doe",
        "avatarUrl": "https://cloudinary.com/avatar.jpg",
        "kycLevel": "INTERMEDIATE",
        "kycStatus": "APPROVED",
        "isVerified": true,
        "emailVerified": true,
        "phoneVerified": true,
        "isActive": true,
        "twoFactorEnabled": false,
        "pushToken": "ExponentPushToken[xxx]",
        "flagType": "NONE",
        "flagReason": null,
        "flaggedAt": null,
        "lastLogin": "2026-01-28T13:00:00.000Z",
        "createdAt": "2026-01-01T10:00:00.000Z",
        "updatedAt": "2026-01-28T13:00:00.000Z",
        "transactionPin": null,
        "pinAttempts": 0,
        "pinLockedUntil": null,
        "deviceId": "device-abc-123",
        "cumulativeInflow": "50000.00",
        "role": "USER",
        "kyc": {
            "dob": "1990-05-15T00:00:00.000Z",
            "address": "123 Main Street",
            "city": "Lagos",
            "state": "Lagos",
            "country": "Nigeria",
            "postalCode": "100001",
            "bvn": "22123456789",
            "nin": "12345678901",
            "governmentId": "A12345678",
            "selfieUrl": "https://cloudinary.com/kyc/selfie.jpg",
            "videoUrl": "https://cloudinary.com/kyc/video.mp4",
            "documents": [
                {
                    "id": "doc-1",
                    "documentType": "NIN",
                    "documentUrl": "https://cloudinary.com/kyc/nin-front.jpg",
                    "status": "APPROVED",
                    "rejectionReason": null,
                    "verifiedAt": "2026-01-15T10:00:00.000Z",
                    "createdAt": "2026-01-10T08:00:00.000Z"
                },
                {
                    "id": "doc-2",
                    "documentType": "PROOF_OF_ADDRESS",
                    "documentUrl": "https://cloudinary.com/kyc/utility-bill.pdf",
                    "status": "PENDING",
                    "rejectionReason": null,
                    "verifiedAt": null,
                    "createdAt": "2026-01-20T12:00:00.000Z"
                }
            ]
        },
        "wallet": {
            "id": "wallet-456",
            "balance": 25000.5,
            "lockedBalance": 0,
            "accountNumber": "1234567890",
            "bankName": "Globus Bank",
            "accountName": "John Doe"
        }
    }
}
```

### 2. Payment Methods (P2P)

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

### User Object / KYC Information

- [ ] Update user type/interface to include `kyc` object
- [ ] Update profile screen to display KYC information
- [ ] Handle `kyc.address`, `kyc.city`, `kyc.state`, etc. for address display
- [ ] Display `kyc.dob` (date of birth) if needed
- [ ] Access `kyc.selfieUrl` and `kyc.videoUrl` for displaying user documents
- [ ] Handle `kyc.documents` array for showing uploaded documents
- [ ] Show document status (PENDING, APPROVED, REJECTED) in UI
- [ ] Handle null `kyc` object for users who haven't submitted KYC

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
