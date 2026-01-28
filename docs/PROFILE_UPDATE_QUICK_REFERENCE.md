# Profile Update - Quick Reference

## 🚫 What's Blocked

```
❌ Cannot update firstName
❌ Cannot update lastName
❌ Cannot update address without proof
```

## ✅ What's Allowed

```
✅ Update avatar
✅ Update address (with proof of address document)
✅ Change password
✅ Update push token
```

---

## 📍 Update Address

### Endpoint

```
PUT /api/v1/user/profile/address
```

### Required Fields

- **At least one address field**: `address`, `city`, `state`, `country`, or `postalCode`
- **Proof of address file**: Utility bill or bank statement (JPG, PNG, PDF, max 5MB)

### cURL Example

```bash
curl -X PUT http://localhost:3000/api/v1/user/profile/address \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "address=123 Main Street" \
  -F "city=Lagos" \
  -F "state=Lagos" \
  -F "country=Nigeria" \
  -F "postalCode=100001" \
  -F "proofOfAddress=@utility-bill.pdf"
```

### Success Response

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

## 🔄 Update Other Profile Fields

### Endpoint

```
PUT /api/v1/user/profile
```

### Allowed Fields

- `avatarUrl` (use avatar endpoint instead)
- Other non-sensitive fields

### Blocked Fields

- `firstName` ❌
- `lastName` ❌
- `address`, `city`, `state`, `country`, `postalCode` ❌ (use address endpoint)

---

## 🖼️ Update Avatar

### Endpoint

```
POST /api/v1/user/profile/avatar
```

### Example

```bash
curl -X POST http://localhost:3000/api/v1/user/profile/avatar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "avatar=@profile-pic.jpg"
```

---

## 🔐 Change Password

### Endpoint

```
POST /api/v1/user/change-password
```

### Example

```bash
curl -X POST http://localhost:3000/api/v1/user/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "current123",
    "newPassword": "newSecure456"
  }'
```

---

## 📄 Proof of Address Requirements

### Accepted Documents

- ✅ Utility bill (electricity, water, gas, internet)
- ✅ Bank statement
- ✅ Government-issued document with address

### Document Must Show

- ✅ Your full name (matching KYC)
- ✅ Complete address
- ✅ Recent date (within 3 months)
- ✅ Clear and readable

### File Requirements

- **Formats**: JPG, PNG, PDF
- **Max Size**: 5MB
- **Quality**: High resolution

---

## ❌ Common Errors

### Missing Proof of Address

```json
{
    "success": false,
    "message": "Proof of address document is required..."
}
```

### Name Change Attempt

```json
{
    "success": false,
    "message": "Name changes are not allowed. Please contact support..."
}
```

### Invalid File Type

```json
{
    "success": false,
    "message": "Invalid file type: image/gif. Allowed: jpeg, png, jpg, pdf"
}
```

### File Too Large

```json
{
    "success": false,
    "message": "File is too large. Please upload a smaller file."
}
```

---

## 📱 React Native Example

```javascript
import DocumentPicker from 'react-native-document-picker';

const updateAddress = async addressData => {
    // Pick document
    const doc = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
    });

    // Create form data
    const formData = new FormData();
    formData.append('address', addressData.address);
    formData.append('city', addressData.city);
    formData.append('state', addressData.state);
    formData.append('country', addressData.country);
    formData.append('postalCode', addressData.postalCode);
    formData.append('proofOfAddress', {
        uri: doc[0].uri,
        type: doc[0].type,
        name: doc[0].name,
    });

    // Send request
    const response = await fetch('/api/v1/user/profile/address', {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    return response.json();
};
```

---

## 🔄 Review Process

1. **User uploads** proof of address → Status: `PENDING`
2. **Admin reviews** document
3. **Admin approves/rejects** → User notified
4. If rejected → User can re-upload

---

## 📞 Need to Change Name?

Contact support with:

- Legal documentation (marriage certificate, deed poll, etc.)
- Reason for name change
- New name details

Support will manually verify and update.

---

## 📚 Full Documentation

- **Detailed Guide**: `docs/PROFILE_UPDATE_RESTRICTIONS.md`
- **Change Summary**: `docs/PROFILE_UPDATE_SUMMARY.md`
