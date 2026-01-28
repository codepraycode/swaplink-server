# Profile Update Changes Summary

## Changes Made

### 1. **Service Layer** (`user.service.ts`)

#### New Method: `updateAddress()`

- Accepts address fields and proof of address document URL
- Validates at least one address field is provided
- Updates or creates KycInfo record with new address
- Creates KycDocument record for proof of address (status: PENDING)
- Returns updated user with KYC info
- Logs audit trail

#### Updated Method: `updateProfile()`

- **Blocks name changes** (`firstName`, `lastName`)
- Marked as `@deprecated` with recommendation to use `updateAddress()`
- Only allows non-sensitive field updates (e.g., `avatarUrl`)

---

### 2. **Controller Layer** (`user.controller.ts`)

#### New Method: `updateAddress()`

- Extracts address fields from request body
- Validates proof of address file is uploaded
- Uploads document to storage (folder: `proof-of-address`)
- Calls service layer to update address
- Returns success message indicating pending review

---

### 3. **Middleware** (`upload.middleware.ts`)

#### New Uploader: `uploadProofOfAddress`

- Accepts: JPG, PNG, PDF
- Max size: 5MB
- Uses KYC config (same as ID documents)
- Single file upload

---

### 4. **Routes** (`user.routes.ts`)

#### New Route

```typescript
PUT /api/v1/user/profile/address
- Middleware: authenticate, uploadProofOfAddress, handleUploadError
- Handler: UserController.updateAddress
```

---

## API Changes

### ❌ Blocked Operations

**1. Name Changes via Profile Update**

```json
PUT /api/v1/user/profile
{
  "firstName": "NewName"  // ❌ Will throw error
}
```

**Error:**

```json
{
    "success": false,
    "message": "Name changes are not allowed. Please contact support if you need to update your name."
}
```

---

### ✅ New Address Update Flow

**Endpoint:** `PUT /api/v1/user/profile/address`

**Request (multipart/form-data):**

```
address: "123 Main Street"
city: "Lagos"
state: "Lagos"
country: "Nigeria"
postalCode: "100001"
proofOfAddress: [FILE] (utility bill or bank statement)
```

**Response:**

```json
{
  "success": true,
  "message": "Address updated successfully. Your proof of address is pending review.",
  "data": {
    "user": { ... },
    "kycInfo": {
      "id": "uuid",
      "userId": "uuid",
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

## Database Impact

### Tables Modified

**1. KycInfo**

- Address fields updated via `upsert` operation
- Creates new record if doesn't exist
- Updates existing record if exists

**2. KycDocument** (New Record Created)

```typescript
{
  kycInfoId: "uuid",
  documentType: "PROOF_OF_ADDRESS",
  documentUrl: "https://storage.../proof-of-address/file.pdf",
  status: "PENDING",  // Awaits admin review
  createdAt: "2026-01-28T..."
}
```

**3. AuditLog** (New Entry)

```typescript
{
  userId: "uuid",
  action: "ADDRESS_UPDATED",
  resource: "User",
  resourceId: "uuid",
  details: {
    addressData: { ... },
    proofOfAddressUrl: "..."
  },
  status: "SUCCESS"
}
```

---

## File Upload Specifications

### Proof of Address Document

| Property           | Value               |
| ------------------ | ------------------- |
| **Field Name**     | `proofOfAddress`    |
| **Allowed Types**  | JPG, PNG, PDF       |
| **Max Size**       | 5MB                 |
| **Storage Folder** | `proof-of-address/` |
| **Required**       | Yes                 |

### Accepted Documents

- Utility bills (electricity, water, gas, internet)
- Bank statements
- Government-issued documents with address

### Document Requirements

- Must show user's full name
- Must show complete address
- Should be recent (within 3 months)
- Must be clear and legible

---

## Security Enhancements

### 1. **Name Change Prevention**

- **Why**: Prevent identity fraud and ensure KYC compliance
- **How**: Validation in service layer throws error if name fields present
- **Alternative**: Users must contact support with legal documentation

### 2. **Address Verification**

- **Why**: Comply with KYC/AML regulations
- **How**: Require proof of address document for all address updates
- **Process**: Admin reviews document before approval

### 3. **Audit Trail**

- All address updates logged with:
    - User ID
    - Timestamp
    - Address changes
    - Proof document URL
    - Action status

---

## Admin Workflow

### Document Review Process

1. **User uploads** proof of address
2. **System creates** KycDocument with status `PENDING`
3. **Admin reviews** document in admin panel
4. **Admin approves/rejects** with optional reason
5. **User notified** of decision

### Admin Actions Required

- View uploaded proof of address documents
- Verify name matches KYC records
- Verify address matches submitted data
- Approve or reject with reason
- (Future) Automated OCR verification

---

## Error Handling

### Common Errors

**1. Missing Proof of Address**

```json
{
    "success": false,
    "message": "Proof of address document is required (utility bill or bank statement showing name and new address)"
}
```

**2. No Address Fields**

```json
{
    "success": false,
    "message": "At least one address field must be provided"
}
```

**3. Invalid File Type**

```json
{
    "success": false,
    "message": "Invalid file type: image/gif. Allowed: jpeg, png, jpg, pdf"
}
```

**4. File Too Large**

```json
{
    "success": false,
    "message": "File is too large. Please upload a smaller file."
}
```

**5. Name Change Attempt**

```json
{
    "success": false,
    "message": "Name changes are not allowed. Please contact support if you need to update your name."
}
```

---

## Testing Checklist

- [ ] Update address with all fields and valid proof (should succeed)
- [ ] Update address with only one field and valid proof (should succeed)
- [ ] Update address without proof of address (should fail)
- [ ] Update address with invalid file type (should fail)
- [ ] Update address with file > 5MB (should fail)
- [ ] Attempt to change firstName via profile update (should fail)
- [ ] Attempt to change lastName via profile update (should fail)
- [ ] Update avatar (should still work)
- [ ] Update other allowed fields (should work)
- [ ] Verify KycDocument created with PENDING status
- [ ] Verify AuditLog entry created
- [ ] Verify file uploaded to correct storage folder

---

## Files Modified

1. ✅ `src/api/modules/account/user/user.service.ts`
    - Added `updateAddress()` method
    - Updated `updateProfile()` to block name changes

2. ✅ `src/api/modules/account/user/user.controller.ts`
    - Added `updateAddress()` controller method

3. ✅ `src/api/modules/account/user/user.routes.ts`
    - Added `PUT /profile/address` route

4. ✅ `src/api/middlewares/upload.middleware.ts`
    - Added `uploadProofOfAddress` multer configuration

5. ✅ `docs/PROFILE_UPDATE_RESTRICTIONS.md` (NEW)
    - Comprehensive documentation

6. ✅ `docs/PROFILE_UPDATE_SUMMARY.md` (THIS FILE)
    - Change summary

---

## Migration Guide

### For Existing Users

- No migration required
- Existing addresses remain valid
- New address updates require proof of address

### For Frontend Developers

Update your forms to:

1. Remove name edit fields from profile update
2. Create new address update form with file upload
3. Show document upload requirements
4. Handle pending review status
5. Display review outcomes to users

### Example Frontend Changes

**Before:**

```jsx
// Old profile update form
<form onSubmit={updateProfile}>
    <input name="firstName" /> {/* Remove */}
    <input name="lastName" /> {/* Remove */}
    <input name="address" /> {/* Move to separate form */}
    <button>Update Profile</button>
</form>
```

**After:**

```jsx
// Profile update (no names)
<form onSubmit={updateProfile}>
  <input name="avatarUrl" />
  {/* Other non-sensitive fields */}
  <button>Update Profile</button>
</form>

// Separate address update form
<form onSubmit={updateAddress} encType="multipart/form-data">
  <input name="address" />
  <input name="city" />
  <input name="state" />
  <input name="country" />
  <input name="postalCode" />
  <input type="file" name="proofOfAddress" accept=".jpg,.png,.pdf" />
  <button>Update Address</button>
</form>
```

---

## Backward Compatibility

### Existing Endpoints

- `PUT /profile` - Still works but blocks name/address changes
- `POST /profile/avatar` - Unchanged
- `PUT /push-token` - Unchanged
- `POST /change-password` - Unchanged

### Breaking Changes

- ❌ Cannot update `firstName` or `lastName` via API
- ❌ Cannot update address without proof of address

### Non-Breaking Changes

- ✅ New endpoint for address updates
- ✅ Existing addresses remain valid
- ✅ Avatar updates unchanged

---

## Next Steps

### Immediate

1. Update frontend forms
2. Add admin review interface
3. Test all scenarios
4. Update API documentation (Swagger)

### Short-term

1. Add user notifications for review outcomes
2. Implement document status tracking in UI
3. Add retry mechanism for rejected documents
4. Create admin dashboard for document review

### Long-term

1. Automated OCR verification
2. Real-time address validation
3. Integration with government databases
4. Blockchain-based proof of address

---

## Support Process

### Name Change Requests

Users who need to change their name:

1. Contact support via email/chat
2. Provide legal documentation:
    - Marriage certificate
    - Deed poll
    - Court order
    - Other legal name change documents
3. Support team manually verifies and updates
4. Audit log created for compliance

### Address Update Support

If proof of address is rejected:

1. User receives notification with reason
2. User can upload new document
3. Admin re-reviews
4. Process repeats until approved or user gives up

---

## Compliance Notes

### KYC/AML Requirements

- ✅ Name changes require manual verification
- ✅ Address changes require proof of residence
- ✅ All changes logged for audit trail
- ✅ Documents stored securely
- ✅ Admin review process in place

### Data Protection

- User data encrypted in transit (HTTPS)
- Documents stored in secure cloud storage
- Access controlled via authentication
- Audit logs for all changes
- GDPR-compliant data handling

---

## Performance Considerations

### File Upload

- Max 5MB per file (reasonable for documents)
- Multer memory storage (temporary)
- Async upload to cloud storage
- No blocking operations

### Database Operations

- `upsert` for KycInfo (efficient)
- Single transaction for address update
- Indexed queries on userId
- Minimal database calls

### Storage

- Cloud storage (S3/Cloudinary)
- Organized folder structure
- Automatic cleanup (future enhancement)
- CDN for fast retrieval

---

## Monitoring Recommendations

### Metrics to Track

- Address update requests per day
- Document upload success/failure rate
- Average file size
- Review turnaround time
- Rejection rate and reasons

### Alerts to Set

- High rejection rate (> 30%)
- Slow review times (> 48 hours)
- Upload failures (> 5%)
- Unusual activity patterns
- Storage quota warnings

---

## Known Limitations

1. **Manual Review Required**: No automated verification yet
2. **Single Document**: Only one proof of address per update
3. **No Partial Approval**: All or nothing for address fields
4. **No Version History**: Previous addresses not tracked
5. **No Expiry**: Documents don't expire automatically

---

## Future Improvements

- [ ] OCR-based document verification
- [ ] Real-time address validation APIs
- [ ] Support for multiple document uploads
- [ ] Address history tracking
- [ ] Document expiry and renewal reminders
- [ ] Automated approval for low-risk changes
- [ ] Integration with postal services
- [ ] Geolocation verification
