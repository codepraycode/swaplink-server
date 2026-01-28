# Mobile App Integration Guide - API Updates

**Last Updated:** 2026-01-28  
**Target Platform:** React Native / Expo  
**API Version:** v1

---

## 📋 Table of Contents

1. [Payment Methods (P2P)](#1-payment-methods-p2p)
2. [Profile Updates & Address Verification](#2-profile-updates--address-verification)
3. [Breaking Changes](#3-breaking-changes)
4. [Migration Checklist](#4-migration-checklist)

---

## 1. Payment Methods (P2P)

### 🔄 What Changed

The payment method system now uses **modern, email-based payment systems** instead of complex banking details:

- **CAD** → Interac e-Transfer (email-based)
- **USD** → Zelle (email-based)
- **GBP** → UK Bank Transfer (account number-based)
- **EUR** → Removed (can be added later)

---

### 📱 Mobile Implementation

#### **1.1 Create Payment Method Form**

**Old Form (Deprecated):**

```jsx
// ❌ Don't use this anymore
<TextInput placeholder="Routing Number" />
<TextInput placeholder="IBAN" />
<TextInput placeholder="Sort Code" />
```

**New Form (Use This):**

```jsx
import React, { useState } from 'react';
import { View, TextInput, Button, Picker, Alert } from 'react-native';

const AddPaymentMethodForm = () => {
    const [currency, setCurrency] = useState('CAD');
    const [accountName, setAccountName] = useState('');
    const [email, setEmail] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [bankName, setBankName] = useState('');

    const addPaymentMethod = async () => {
        try {
            let payload = {
                currency,
                accountName,
                isPrimary: true,
            };

            // Add currency-specific fields
            if (currency === 'CAD' || currency === 'USD') {
                // Email-based (Interac/Zelle)
                if (!email) {
                    Alert.alert('Error', 'Email is required');
                    return;
                }
                payload.email = email;
            } else if (currency === 'GBP') {
                // Account number-based
                if (!accountNumber || !bankName) {
                    Alert.alert('Error', 'Account number and bank name are required');
                    return;
                }
                payload.accountNumber = accountNumber;
                payload.bankName = bankName;
            }

            const response = await fetch('/api/v1/p2p/payment-methods', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (data.success) {
                Alert.alert('Success', 'Payment method added successfully');
            } else {
                Alert.alert('Error', data.message);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to add payment method');
        }
    };

    return (
        <View>
            {/* Currency Selector */}
            <Picker selectedValue={currency} onValueChange={value => setCurrency(value)}>
                <Picker.Item label="🇨🇦 CAD (Interac)" value="CAD" />
                <Picker.Item label="🇺🇸 USD (Zelle)" value="USD" />
                <Picker.Item label="🇬🇧 GBP (Bank Transfer)" value="GBP" />
            </Picker>

            {/* Account Name (Always Required) */}
            <TextInput
                placeholder="Account Name"
                value={accountName}
                onChangeText={setAccountName}
            />

            {/* Email (for CAD/USD) */}
            {(currency === 'CAD' || currency === 'USD') && (
                <TextInput
                    placeholder={currency === 'CAD' ? 'Interac Email' : 'Zelle Email'}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
            )}

            {/* Account Number & Bank Name (for GBP) */}
            {currency === 'GBP' && (
                <>
                    <TextInput
                        placeholder="Bank Name"
                        value={bankName}
                        onChangeText={setBankName}
                    />
                    <TextInput
                        placeholder="Account Number (8 digits)"
                        value={accountNumber}
                        onChangeText={setAccountNumber}
                        keyboardType="numeric"
                        maxLength={8}
                    />
                </>
            )}

            <Button title="Add Payment Method" onPress={addPaymentMethod} />
        </View>
    );
};

export default AddPaymentMethodForm;
```

---

#### **1.2 API Endpoints**

**Create Payment Method**

```typescript
POST /api/v1/p2p/payment-methods

// CAD Request
{
  "currency": "CAD",
  "accountName": "John Doe",
  "email": "john@example.com",
  "isPrimary": true
}

// USD Request
{
  "currency": "USD",
  "accountName": "Jane Smith",
  "email": "jane@example.com",
  "isPrimary": true
}

// GBP Request
{
  "currency": "GBP",
  "bankName": "Barclays",
  "accountName": "Robert Johnson",
  "accountNumber": "12345678",
  "isPrimary": false
}
```

**Get Payment Methods**

```typescript
GET /api/v1/p2p/payment-methods

// Response
{
  "success": true,
  "message": "Payment methods retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "currency": "CAD",
      "bankName": "Interac",
      "accountName": "John Doe",
      "accountNumber": "",
      "details": { "email": "john@example.com" },
      "isPrimary": true
    }
  ]
}
```

**Delete Payment Method**

```typescript
DELETE /api/v1/p2p/payment-methods/:id
```

---

#### **1.3 Display Payment Methods**

```jsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';

const PaymentMethodsList = () => {
    const [methods, setMethods] = useState([]);

    useEffect(() => {
        fetchPaymentMethods();
    }, []);

    const fetchPaymentMethods = async () => {
        const response = await fetch('/api/v1/p2p/payment-methods', {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
            setMethods(data.data);
        }
    };

    const renderMethod = ({ item }) => {
        const isEmailBased = item.currency === 'CAD' || item.currency === 'USD';

        return (
            <View style={styles.methodCard}>
                <Text style={styles.currency}>
                    {item.currency} - {item.bankName}
                </Text>
                <Text style={styles.accountName}>{item.accountName}</Text>

                {isEmailBased ? (
                    <Text style={styles.detail}>📧 {item.details?.email}</Text>
                ) : (
                    <Text style={styles.detail}>🏦 {item.accountNumber}</Text>
                )}

                {item.isPrimary && <Text style={styles.primaryBadge}>PRIMARY</Text>}
            </View>
        );
    };

    return <FlatList data={methods} renderItem={renderMethod} keyExtractor={item => item.id} />;
};
```

---

#### **1.4 Validation Helpers**

```typescript
// utils/paymentMethodValidation.ts

export const validatePaymentMethod = (currency: string, data: any) => {
    // Account name always required
    if (!data.accountName || data.accountName.trim() === '') {
        return { valid: false, error: 'Account name is required' };
    }

    switch (currency) {
        case 'CAD':
        case 'USD':
            // Email required for Interac/Zelle
            if (!data.email || !isValidEmail(data.email)) {
                const system = currency === 'CAD' ? 'Interac' : 'Zelle';
                return { valid: false, error: `Valid email is required for ${system}` };
            }
            break;

        case 'GBP':
            // Account number required for UK transfers
            if (!data.accountNumber || data.accountNumber.trim() === '') {
                return { valid: false, error: 'Account number is required' };
            }
            // Validate 8 digits
            if (!/^\d{8}$/.test(data.accountNumber.replace(/\s/g, ''))) {
                return { valid: false, error: 'Account number must be 8 digits' };
            }
            if (!data.bankName || data.bankName.trim() === '') {
                return { valid: false, error: 'Bank name is required' };
            }
            break;

        default:
            return { valid: false, error: 'Unsupported currency' };
    }

    return { valid: true };
};

const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
```

---

## 2. Profile Updates & Address Verification

### 🔄 What Changed

1. **Name changes blocked** - Cannot update `firstName` or `lastName` via API
2. **Address updates require proof** - Must upload utility bill or bank statement
3. **New dedicated endpoint** - `PUT /api/v1/user/profile/address`

---

### 📱 Mobile Implementation

#### **2.1 Update Profile Form (Remove Name Fields)**

**Old Form (Deprecated):**

```jsx
// ❌ Remove these fields
<TextInput placeholder="First Name" value={firstName} />
<TextInput placeholder="Last Name" value={lastName} />
<TextInput placeholder="Address" value={address} />
```

**New Form (Use This):**

```jsx
// ✅ Profile update (no names, no address)
const UpdateProfileForm = () => {
    // Only allow non-sensitive fields
    // Names and address removed

    return (
        <View>
            {/* Avatar update handled separately */}
            <Text>To change your name, please contact support</Text>
            <Text>To update your address, use the Address Update form</Text>
        </View>
    );
};
```

---

#### **2.2 Address Update Form (New)**

```jsx
import React, { useState } from 'react';
import { View, TextInput, Button, Alert, Text } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

const UpdateAddressForm = () => {
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [proofDocument, setProofDocument] = useState(null);

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/jpeg', 'image/png', 'application/pdf'],
                copyToCacheDirectory: true,
            });

            if (result.type === 'success') {
                setProofDocument(result);
                Alert.alert('Success', `Selected: ${result.name}`);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick document');
        }
    };

    const updateAddress = async () => {
        // Validate at least one address field
        if (!address && !city && !state && !country && !postalCode) {
            Alert.alert('Error', 'Please provide at least one address field');
            return;
        }

        // Validate proof of address
        if (!proofDocument) {
            Alert.alert('Error', 'Please upload proof of address (utility bill or bank statement)');
            return;
        }

        try {
            const formData = new FormData();

            // Add address fields (only if provided)
            if (address) formData.append('address', address);
            if (city) formData.append('city', city);
            if (state) formData.append('state', state);
            if (country) formData.append('country', country);
            if (postalCode) formData.append('postalCode', postalCode);

            // Add proof of address document
            formData.append('proofOfAddress', {
                uri: proofDocument.uri,
                type: proofDocument.mimeType || 'application/pdf',
                name: proofDocument.name,
            });

            const response = await fetch('/api/v1/user/profile/address', {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    // Don't set Content-Type, let fetch handle it for FormData
                },
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                Alert.alert('Success', 'Address updated! Your proof of address is pending review.');
                // Navigate back or refresh
            } else {
                Alert.alert('Error', data.message);
            }
        } catch (error) {
            console.error('Address update error:', error);
            Alert.alert('Error', 'Failed to update address');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Update Address</Text>

            <Text style={styles.label}>Street Address</Text>
            <TextInput
                style={styles.input}
                placeholder="123 Main Street"
                value={address}
                onChangeText={setAddress}
            />

            <Text style={styles.label}>City</Text>
            <TextInput
                style={styles.input}
                placeholder="Lagos"
                value={city}
                onChangeText={setCity}
            />

            <Text style={styles.label}>State/Province</Text>
            <TextInput
                style={styles.input}
                placeholder="Lagos"
                value={state}
                onChangeText={setState}
            />

            <Text style={styles.label}>Country</Text>
            <TextInput
                style={styles.input}
                placeholder="Nigeria"
                value={country}
                onChangeText={setCountry}
            />

            <Text style={styles.label}>Postal Code</Text>
            <TextInput
                style={styles.input}
                placeholder="100001"
                value={postalCode}
                onChangeText={setPostalCode}
                keyboardType="numeric"
            />

            <View style={styles.documentSection}>
                <Text style={styles.documentTitle}>Proof of Address Required</Text>
                <Text style={styles.documentSubtitle}>
                    Upload utility bill or bank statement showing your name and address
                </Text>

                <Button
                    title={proofDocument ? `✓ ${proofDocument.name}` : 'Upload Document'}
                    onPress={pickDocument}
                />

                {proofDocument && (
                    <Text style={styles.documentInfo}>
                        📄 {proofDocument.name} ({(proofDocument.size / 1024).toFixed(0)} KB)
                    </Text>
                )}
            </View>

            <Button title="Update Address" onPress={updateAddress} disabled={!proofDocument} />

            <Text style={styles.note}>
                Note: Your proof of address will be reviewed by our team. You'll be notified once
                it's approved.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', marginTop: 15, marginBottom: 5 },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    documentSection: {
        marginTop: 20,
        padding: 15,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
    },
    documentTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
    documentSubtitle: { fontSize: 12, color: '#666', marginBottom: 15 },
    documentInfo: { marginTop: 10, fontSize: 12, color: '#666' },
    note: {
        marginTop: 20,
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
    },
});

export default UpdateAddressForm;
```

---

#### **2.3 API Endpoints**

**Update Address (New)**

```typescript
PUT /api/v1/user/profile/address
Content-Type: multipart/form-data

// Form Data:
address: "123 Main Street"
city: "Lagos"
state: "Lagos"
country: "Nigeria"
postalCode: "100001"
proofOfAddress: [FILE] // Utility bill or bank statement

// Response
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

**Update Profile (Restricted)**

```typescript
PUT /api/v1/user/profile
Content-Type: application/json

// ❌ These will fail:
{
  "firstName": "NewName"  // Error: Name changes not allowed
}

{
  "address": "123 Main St"  // Error: Use address endpoint
}

// ✅ Only non-sensitive fields allowed (if any)
```

**Update Avatar (Unchanged)**

```typescript
POST /api/v1/user/profile/avatar
Content-Type: multipart/form-data

avatar: [FILE]
```

---

#### **2.4 Document Picker Setup**

**Install Dependencies:**

```bash
npx expo install expo-document-picker
```

**Usage:**

```typescript
import * as DocumentPicker from 'expo-document-picker';

const pickProofOfAddress = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['image/jpeg', 'image/png', 'application/pdf'],
            copyToCacheDirectory: true,
            multiple: false,
        });

        if (result.type === 'success') {
            // Validate file size (max 5MB)
            if (result.size > 5 * 1024 * 1024) {
                Alert.alert('Error', 'File too large. Maximum size is 5MB');
                return null;
            }

            return result;
        }
    } catch (error) {
        console.error('Document picker error:', error);
        Alert.alert('Error', 'Failed to pick document');
        return null;
    }
};
```

---

#### **2.5 Error Handling**

```typescript
// utils/profileErrors.ts

export const handleProfileUpdateError = (error: any) => {
    const message = error.message || 'Unknown error';

    if (message.includes('Name changes are not allowed')) {
        return {
            title: 'Name Change Not Allowed',
            message: 'Please contact support to change your name',
            action: 'Contact Support',
        };
    }

    if (message.includes('Proof of address')) {
        return {
            title: 'Proof Required',
            message: 'Please upload a utility bill or bank statement',
            action: 'Upload Document',
        };
    }

    if (message.includes('File too large')) {
        return {
            title: 'File Too Large',
            message: 'Please upload a file smaller than 5MB',
            action: 'Try Again',
        };
    }

    if (message.includes('Invalid file type')) {
        return {
            title: 'Invalid File',
            message: 'Please upload JPG, PNG, or PDF only',
            action: 'Try Again',
        };
    }

    return {
        title: 'Error',
        message: message,
        action: 'OK',
    };
};
```

---

## 3. Breaking Changes

### ⚠️ Critical Changes

#### **3.1 Payment Methods**

**Before:**

```typescript
// ❌ Old format (no longer works)
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

**After:**

```typescript
// ✅ New format (required)
{
  "currency": "USD",
  "accountName": "John Doe",
  "email": "john@example.com"  // Email required for USD/CAD
}
```

---

#### **3.2 Profile Updates**

**Before:**

```typescript
// ❌ These no longer work
PUT /api/v1/user/profile
{
  "firstName": "NewName",  // Blocked
  "lastName": "NewName",   // Blocked
  "address": "123 Main St" // Blocked
}
```

**After:**

```typescript
// ✅ Use dedicated endpoint
PUT /api/v1/user/profile/address
FormData {
  address: "123 Main St",
  proofOfAddress: [FILE]  // Required
}
```

---

### 🔄 Migration Required

1. **Update Payment Method Forms**
    - Remove routing number, IBAN, sort code fields
    - Add email field for CAD/USD
    - Add conditional rendering based on currency

2. **Update Profile Forms**
    - Remove first name and last name edit fields
    - Create separate address update form
    - Add document picker for proof of address

3. **Update API Calls**
    - Change payment method payload structure
    - Use new address update endpoint
    - Handle FormData for file uploads

---

## 4. Migration Checklist

### ✅ Payment Methods

- [ ] Update payment method creation form
- [ ] Add currency-specific field rendering
- [ ] Add email validation for CAD/USD
- [ ] Add account number validation for GBP
- [ ] Update payment method display to show email/account number
- [ ] Test all three currencies (CAD, USD, GBP)
- [ ] Handle validation errors properly
- [ ] Update payment method selection in P2P flows

---

### ✅ Profile Updates

- [ ] Remove first name field from profile edit
- [ ] Remove last name field from profile edit
- [ ] Create new address update screen/modal
- [ ] Install expo-document-picker
- [ ] Implement document picker for proof of address
- [ ] Add file validation (type, size)
- [ ] Update address update API call with FormData
- [ ] Handle pending review status
- [ ] Show document review status to users
- [ ] Add "Contact Support" for name changes
- [ ] Test address update flow end-to-end
- [ ] Handle all error cases

---

### ✅ UI/UX Updates

- [ ] Add info text about name change restrictions
- [ ] Add document upload instructions
- [ ] Show accepted document types (utility bill, bank statement)
- [ ] Display file size limit (5MB)
- [ ] Show upload progress indicator
- [ ] Display pending review status
- [ ] Add notification for review outcomes
- [ ] Update help/FAQ section

---

### ✅ Testing

- [ ] Test CAD payment method creation
- [ ] Test USD payment method creation
- [ ] Test GBP payment method creation
- [ ] Test invalid email for CAD/USD
- [ ] Test invalid account number for GBP
- [ ] Test address update with valid proof
- [ ] Test address update without proof (should fail)
- [ ] Test name change attempt (should fail)
- [ ] Test file upload with invalid type
- [ ] Test file upload with size > 5MB
- [ ] Test partial address update (only city)
- [ ] Test complete address update (all fields)

---

## 5. Code Examples Repository

### 📦 Complete Components

#### **5.1 Payment Method Manager**

```typescript
// components/PaymentMethodManager.tsx
import React, { useState, useEffect } from 'react';
import { View, FlatList, Button } from 'react-native';
import AddPaymentMethodForm from './AddPaymentMethodForm';
import PaymentMethodCard from './PaymentMethodCard';
import { paymentMethodService } from '../services/paymentMethodService';

const PaymentMethodManager = () => {
  const [methods, setMethods] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    const data = await paymentMethodService.getAll();
    setMethods(data);
  };

  const handleAdd = async (methodData) => {
    await paymentMethodService.create(methodData);
    await loadPaymentMethods();
    setShowAddForm(false);
  };

  const handleDelete = async (id) => {
    await paymentMethodService.delete(id);
    await loadPaymentMethods();
  };

  return (
    <View>
      {showAddForm ? (
        <AddPaymentMethodForm
          onSubmit={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        <>
          <FlatList
            data={methods}
            renderItem={({ item }) => (
              <PaymentMethodCard
                method={item}
                onDelete={() => handleDelete(item.id)}
              />
            )}
            keyExtractor={(item) => item.id}
          />
          <Button
            title="Add Payment Method"
            onPress={() => setShowAddForm(true)}
          />
        </>
      )}
    </View>
  );
};

export default PaymentMethodManager;
```

---

#### **5.2 Payment Method Service**

```typescript
// services/paymentMethodService.ts
import { API_URL, getAuthToken } from './config';

export const paymentMethodService = {
    async getAll() {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/p2p/payment-methods`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const data = await response.json();
        return data.success ? data.data : [];
    },

    async create(methodData: any) {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/p2p/payment-methods`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(methodData),
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message);
        }
        return data.data;
    },

    async delete(id: string) {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/p2p/payment-methods/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message);
        }
    },
};
```

---

#### **5.3 Address Update Service**

```typescript
// services/addressService.ts
import { API_URL, getAuthToken } from './config';

export const addressService = {
    async updateAddress(addressData: any, proofDocument: any) {
        const token = await getAuthToken();

        const formData = new FormData();

        // Add address fields
        if (addressData.address) formData.append('address', addressData.address);
        if (addressData.city) formData.append('city', addressData.city);
        if (addressData.state) formData.append('state', addressData.state);
        if (addressData.country) formData.append('country', addressData.country);
        if (addressData.postalCode) formData.append('postalCode', addressData.postalCode);

        // Add proof document
        formData.append('proofOfAddress', {
            uri: proofDocument.uri,
            type: proofDocument.mimeType || 'application/pdf',
            name: proofDocument.name,
        });

        const response = await fetch(`${API_URL}/user/profile/address`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message);
        }
        return data.data;
    },
};
```

---

## 6. Environment Configuration

```typescript
// config/api.ts
export const API_CONFIG = {
    BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
    API_VERSION: 'v1',
    ENDPOINTS: {
        // Payment Methods
        PAYMENT_METHODS: '/api/v1/p2p/payment-methods',

        // Profile
        PROFILE: '/api/v1/user/profile',
        PROFILE_ADDRESS: '/api/v1/user/profile/address',
        PROFILE_AVATAR: '/api/v1/user/profile/avatar',
        CHANGE_PASSWORD: '/api/v1/user/change-password',
    },

    // File upload limits
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ACCEPTED_DOCUMENT_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
};
```

---

## 7. TypeScript Types

```typescript
// types/paymentMethod.ts
export type Currency = 'CAD' | 'USD' | 'GBP';

export interface PaymentMethodBase {
    currency: Currency;
    accountName: string;
    isPrimary?: boolean;
}

export interface CADPaymentMethod extends PaymentMethodBase {
    currency: 'CAD';
    email: string;
}

export interface USDPaymentMethod extends PaymentMethodBase {
    currency: 'USD';
    email: string;
}

export interface GBPPaymentMethod extends PaymentMethodBase {
    currency: 'GBP';
    bankName: string;
    accountNumber: string;
}

export type PaymentMethodCreate = CADPaymentMethod | USDPaymentMethod | GBPPaymentMethod;

export interface PaymentMethod {
    id: string;
    userId: string;
    currency: Currency;
    bankName: string;
    accountNumber: string;
    accountName: string;
    details: {
        email?: string;
    };
    isPrimary: boolean;
    isActive: boolean;
}

// types/address.ts
export interface AddressUpdate {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
}

export interface DocumentFile {
    uri: string;
    name: string;
    size: number;
    mimeType: string;
    type: 'success' | 'cancel';
}
```

---

## 8. Summary

### 🎯 Key Takeaways

1. **Payment Methods**
    - Use email for CAD/USD (Interac/Zelle)
    - Use account number for GBP
    - No more routing numbers, IBANs, etc.

2. **Profile Updates**
    - Name changes blocked (contact support)
    - Address updates require proof of address document
    - Use dedicated endpoint with file upload

3. **File Uploads**
    - Use expo-document-picker
    - FormData for multipart requests
    - Max 5MB, JPG/PNG/PDF only

### 📚 Documentation

- **Full API Docs**: `docs/PROFILE_UPDATE_RESTRICTIONS.md`
- **Payment Methods**: `docs/P2P_PAYMENT_METHODS.md`
- **Quick Reference**: `docs/PROFILE_UPDATE_QUICK_REFERENCE.md`

### 🆘 Support

For questions or issues:

1. Check documentation files
2. Review error messages
3. Test with provided examples
4. Contact backend team if needed

---

**Last Updated:** 2026-01-28  
**Version:** 1.0.0
