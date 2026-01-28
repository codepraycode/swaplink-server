# KYC Information Integration Guide for Mobile App

**Date:** 2026-01-28  
**Version:** 1.0  
**Status:** Ready for Implementation

---

## 📌 Overview

The backend now returns **complete KYC information** in the user object for both `login` and `me` endpoints. This includes all personal details, identity information, and document URLs submitted during KYC verification.

---

## 🎯 What's New

### Complete KYC Object

The user object now includes a `kyc` property containing:

1. **Personal Information**
    - Date of birth
    - Full address (address, city, state, country, postal code)

2. **Identity Information**
    - BVN (Bank Verification Number)
    - NIN (National Identification Number)
    - Government ID number

3. **Document URLs**
    - Selfie photo URL
    - Video verification URL

4. **Document Details Array**
    - All uploaded documents (ID cards, proof of address, etc.)
    - Document status (PENDING, APPROVED, REJECTED)
    - Verification timestamps
    - Rejection reasons (if applicable)

---

## 📡 API Endpoints Affected

### 1. Login Endpoint

```
POST /api/v1/auth/login
```

**Response includes complete user object with KYC data**

### 2. Get Current User (Me)

```
GET /api/v1/auth/me
```

**Response includes complete user object with KYC data**

---

## 📝 TypeScript Interface

```typescript
interface UserResponse {
    // ... other user fields ...

    kyc: {
        // Personal Information
        dob: string | null; // ISO Date String (e.g., "1990-05-15T00:00:00.000Z")
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
            documentType: string; // "NIN", "BVN_SLIP", "PASSPORT", "PROOF_OF_ADDRESS", etc.
            documentUrl: string;
            status: 'PENDING' | 'APPROVED' | 'REJECTED';
            rejectionReason: string | null;
            verifiedAt: string | null; // ISO Date String
            createdAt: string; // ISO Date String
        }>;
    } | null; // null if user hasn't submitted KYC
}
```

---

## 💡 Usage Examples

### Example 1: Display User Address

```typescript
const user = await fetchCurrentUser();

if (user.kyc?.address) {
    const fullAddress = `${user.kyc.address}, ${user.kyc.city}, ${user.kyc.state}, ${user.kyc.country}`;
    console.log(fullAddress);
    // Output: "123 Main Street, Lagos, Lagos, Nigeria"
}
```

### Example 2: Display User's Selfie

```typescript
const user = await fetchCurrentUser();

if (user.kyc?.selfieUrl) {
  return (
    <Image
      source={{ uri: user.kyc.selfieUrl }}
      style={styles.selfie}
    />
  );
}
```

### Example 3: Show Document Verification Status

```typescript
const user = await fetchCurrentUser();

if (user.kyc?.documents) {
    user.kyc.documents.forEach(doc => {
        console.log(`${doc.documentType}: ${doc.status}`);

        if (doc.status === 'REJECTED' && doc.rejectionReason) {
            console.log(`Reason: ${doc.rejectionReason}`);
        }
    });
}
```

### Example 4: Check if KYC is Complete

```typescript
const user = await fetchCurrentUser();

const hasCompletedKYC =
    user.kyc !== null &&
    user.kyc.address !== null &&
    user.kyc.bvn !== null &&
    user.kyc.nin !== null &&
    user.kyc.selfieUrl !== null;

if (hasCompletedKYC) {
    // Show verified badge
} else {
    // Prompt user to complete KYC
}
```

---

## 📱 Mobile Implementation Steps

### Step 1: Update User Type/Interface

Update your user type definition to include the `kyc` object:

```typescript
// types/user.ts
export interface User {
    id: string;
    email: string | null;
    phone: string | null;
    firstName: string;
    lastName: string;
    // ... other fields ...

    // Add this
    kyc: KycInfo | null;
}

export interface KycInfo {
    dob: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postalCode: string | null;
    bvn: string | null;
    nin: string | null;
    governmentId: string | null;
    selfieUrl: string | null;
    videoUrl: string | null;
    documents: KycDocument[];
}

export interface KycDocument {
    id: string;
    documentType: string;
    documentUrl: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejectionReason: string | null;
    verifiedAt: string | null;
    createdAt: string;
}
```

### Step 2: Update Profile Screen

Display KYC information in the user's profile:

```tsx
// screens/ProfileScreen.tsx
import { format } from 'date-fns';

export function ProfileScreen() {
    const { user } = useAuth();

    return (
        <View>
            {/* Basic Info */}
            <Text>
                {user.firstName} {user.lastName}
            </Text>

            {/* KYC Information */}
            {user.kyc && (
                <View style={styles.kycSection}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>

                    {user.kyc.dob && (
                        <Text>Date of Birth: {format(new Date(user.kyc.dob), 'MMM dd, yyyy')}</Text>
                    )}

                    {user.kyc.address && (
                        <View>
                            <Text>Address:</Text>
                            <Text>{user.kyc.address}</Text>
                            <Text>
                                {user.kyc.city}, {user.kyc.state}
                            </Text>
                            <Text>
                                {user.kyc.country} {user.kyc.postalCode}
                            </Text>
                        </View>
                    )}

                    {/* Identity Info */}
                    {user.kyc.bvn && <Text>BVN: {user.kyc.bvn}</Text>}
                    {user.kyc.nin && <Text>NIN: {user.kyc.nin}</Text>}
                </View>
            )}
        </View>
    );
}
```

### Step 3: Display Documents

Show user's uploaded documents with status:

```tsx
// components/DocumentsList.tsx
export function DocumentsList({ documents }: { documents: KycDocument[] }) {
    return (
        <View>
            <Text style={styles.title}>Uploaded Documents</Text>

            {documents.map(doc => (
                <View key={doc.id} style={styles.documentCard}>
                    <Text>{doc.documentType}</Text>

                    <Badge
                        status={doc.status}
                        color={
                            doc.status === 'APPROVED'
                                ? 'green'
                                : doc.status === 'REJECTED'
                                  ? 'red'
                                  : 'orange'
                        }
                    />

                    {doc.status === 'REJECTED' && doc.rejectionReason && (
                        <Text style={styles.error}>{doc.rejectionReason}</Text>
                    )}

                    <TouchableOpacity onPress={() => openDocument(doc.documentUrl)}>
                        <Text>View Document</Text>
                    </TouchableOpacity>
                </View>
            ))}
        </View>
    );
}
```

### Step 4: Handle Null KYC

Always check if KYC data exists before accessing:

```tsx
// Always use optional chaining
const userAddress = user.kyc?.address;
const userCity = user.kyc?.city;

// Or check explicitly
if (user.kyc) {
    // Safe to access kyc properties
    console.log(user.kyc.address);
} else {
    // User hasn't submitted KYC yet
    showKycPrompt();
}
```

---

## ⚠️ Important Notes

### 1. Privacy & Security

- **Never log sensitive KYC data** (BVN, NIN, etc.) in production
- **Secure document URLs** - they contain sensitive information
- **Handle document display carefully** - ensure proper authentication

### 2. Null Handling

- The entire `kyc` object can be `null` if user hasn't submitted KYC
- Individual fields within `kyc` can also be `null`
- Always use optional chaining (`?.`) or null checks

### 3. Document Status

Documents can have three statuses:

- **PENDING**: Awaiting admin review
- **APPROVED**: Verified and accepted
- **REJECTED**: Rejected with reason in `rejectionReason`

### 4. Date Formatting

- All dates are in ISO 8601 format
- Use a date library (like `date-fns`) for formatting
- Example: `"1990-05-15T00:00:00.000Z"`

---

## 🧪 Testing

### Test Cases

1. **User with complete KYC**
    - Verify all fields are displayed correctly
    - Check document URLs are accessible
    - Verify document statuses are shown

2. **User without KYC**
    - Ensure app doesn't crash when `kyc` is `null`
    - Show appropriate prompt to complete KYC

3. **User with partial KYC**
    - Handle cases where some fields are `null`
    - Display available information only

4. **Document statuses**
    - Test PENDING status display
    - Test APPROVED status display
    - Test REJECTED status with rejection reason

---

## 📚 Related Documentation

- **API Changes Summary**: `MOBILE_API_CHANGES_SUMMARY.md`
- **Profile Update Restrictions**: `PROFILE_UPDATE_RESTRICTIONS.md`
- **Mobile Integration Guide**: `MOBILE_INTEGRATION_GUIDE.md`

---

## 🆘 Support

If you encounter any issues:

1. Check that you're using the latest API version
2. Verify your user type definitions match the backend
3. Test with different KYC states (null, partial, complete)
4. Contact the backend team for clarification

---

## ✅ Implementation Checklist

- [ ] Update user type/interface to include `kyc` object
- [ ] Update profile screen to display KYC information
- [ ] Add null checks for `kyc` object
- [ ] Display address information
- [ ] Display date of birth (if needed)
- [ ] Show identity information (BVN, NIN)
- [ ] Display selfie and video (if needed)
- [ ] Show documents list with statuses
- [ ] Handle rejected documents with reasons
- [ ] Test with users who have no KYC data
- [ ] Test with users who have partial KYC data
- [ ] Test with users who have complete KYC data
- [ ] Ensure sensitive data is not logged

---

**Last Updated:** 2026-01-28  
**Backend Version:** Latest  
**Questions?** Contact the backend team
