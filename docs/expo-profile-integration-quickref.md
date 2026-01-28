# Profile & Settings Integration - Quick Reference

This is a quick reference guide for integrating profile and settings features into your Expo app. For detailed implementation, see `expo-profile-integration.md`.

## ✅ Features Covered

### 1. **Edit Profile Information**

-   **Endpoint**: `PUT /api/v1/account/user/profile`
-   **Fields**: firstName, lastName, phone
-   **Hook**: `useProfile()`
-   **Screen**: `EditProfileScreen.tsx`

### 2. **Upload/Update Profile Picture**

-   **Endpoint**: `POST /api/v1/account/user/profile-picture` ⚠️ **TO BE IMPLEMENTED**
-   **Method**: Multipart form data
-   **Hook**: `useProfile().uploadProfilePicture()`
-   **Screen**: `ProfilePictureScreen.tsx`
-   **Note**: Backend endpoint needs to be created

### 3. **List Ads Created by User**

-   **Endpoint**: `GET /api/v1/p2p/ads?userId=me`
-   **Hook**: `useMyAds()`
-   **Screen**: `MyAdsScreen.tsx`
-   **Features**: View all ads, close active ads

### 4. **List and Add Payment Methods**

-   **Endpoints**:
    -   List: `GET /api/v1/p2p/payment-methods`
    -   Create: `POST /api/v1/p2p/payment-methods`
    -   Delete: `DELETE /api/v1/p2p/payment-methods/:id`
-   **Hook**: `usePaymentMethods()`
-   **Screen**: `PaymentMethodsScreen.tsx`

### 5. **Change Password**

-   **Endpoint**: `POST /api/v1/account/user/change-password`
-   **Fields**: oldPassword, newPassword
-   **Hook**: `useProfile().changePassword()`
-   **Screen**: `ChangePasswordScreen.tsx`

### 6. **Set/Update Transaction PIN**

-   **Endpoint**: `POST /api/v1/wallet/pin`
-   **Fields**: newPin, oldPin (for update)
-   **Hook**: `useTransactionPin()`
-   **Screen**: `TransactionPinScreen.tsx`
-   **Validation**: 4-digit numeric PIN

### 7. **Get Notification Settings** ⚠️ **TO BE IMPLEMENTED**

-   **Status**: Backend not implemented yet
-   **Suggested Endpoint**: `GET /api/v1/account/user/notification-settings`
-   **See**: Section 6.1 in main document for implementation details

### 8. **Send Message to Admin** ⚠️ **TO BE IMPLEMENTED**

-   **Status**: Backend not implemented yet
-   **Suggested Endpoint**: `POST /api/v1/support/tickets`
-   **See**: Section 6.2 in main document for implementation details

---

## 📁 File Structure

```
src/
├── lib/
│   ├── api/
│   │   ├── types.ts                    # Type definitions
│   │   ├── client.ts                   # API client (axios)
│   │   └── services/
│   │       ├── user.service.ts         # Profile & password
│   │       ├── p2p.service.ts          # Ads & payment methods
│   │       └── wallet.service.ts       # Transaction PIN
│   ├── hooks/
│   │   ├── useProfile.ts               # Profile management
│   │   ├── usePaymentMethods.ts        # Payment methods
│   │   ├── useMyAds.ts                 # User's ads
│   │   └── useTransactionPin.ts        # PIN management
│   └── stores/
│       └── accountStore.ts             # User state management
└── screens/
    ├── EditProfileScreen.tsx
    ├── ProfilePictureScreen.tsx
    ├── MyAdsScreen.tsx
    ├── PaymentMethodsScreen.tsx
    ├── ChangePasswordScreen.tsx
    └── TransactionPinScreen.tsx
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install axios zustand expo-image-picker
```

### 2. Set Up API Client

```typescript
// src/lib/api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
    baseURL: 'https://api.swaplink.app/api/v1',
    timeout: 10000,
});

// Add auth interceptor
apiClient.interceptors.request.use(config => {
    const token = getAuthToken(); // Your token retrieval logic
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

### 3. Copy Services

Copy the service files from the main document:

-   `user.service.ts`
-   `p2p.service.ts`
-   `wallet.service.ts`

### 4. Copy Hooks

Copy the hook files from the main document:

-   `useProfile.ts`
-   `usePaymentMethods.ts`
-   `useMyAds.ts`
-   `useTransactionPin.ts`

### 5. Implement Screens

Copy and customize the screen components from the main document.

---

## 🔑 Key API Endpoints

| Feature               | Method | Endpoint                        | Auth Required |
| --------------------- | ------ | ------------------------------- | ------------- |
| Update Profile        | PUT    | `/account/user/profile`         | ✅            |
| Upload Picture        | POST   | `/account/user/profile-picture` | ✅ ⚠️         |
| Change Password       | POST   | `/account/user/change-password` | ✅            |
| List Payment Methods  | GET    | `/p2p/payment-methods`          | ✅            |
| Add Payment Method    | POST   | `/p2p/payment-methods`          | ✅            |
| Delete Payment Method | DELETE | `/p2p/payment-methods/:id`      | ✅            |
| List My Ads           | GET    | `/p2p/ads?userId=me`            | ✅            |
| Close Ad              | PATCH  | `/p2p/ads/:id/close`            | ✅            |
| Set/Update PIN        | POST   | `/wallet/pin`                   | ✅            |
| Verify PIN            | POST   | `/wallet/verify-pin`            | ✅            |

⚠️ = Needs backend implementation

---

## ⚠️ Backend Tasks Required

### High Priority

1. **Profile Picture Upload Endpoint**
    - Create multipart upload handler
    - Integrate with cloud storage (Cloudinary/S3)
    - Update User model's `avatarUrl` field

### Medium Priority

2. **Notification Settings**

    - Create `NotificationSettings` model
    - Implement GET/PUT endpoints
    - Add default settings on user registration

3. **Support Ticket System**
    - Create `SupportTicket` and `SupportResponse` models
    - Implement ticket creation and listing
    - Add admin dashboard for ticket management

---

## 📝 Implementation Checklist

-   [ ] Set up API client with authentication
-   [ ] Add type definitions
-   [ ] Implement user service
-   [ ] Implement P2P service
-   [ ] Implement wallet service
-   [ ] Create custom hooks
-   [ ] Build Edit Profile screen
-   [ ] Build Profile Picture screen (after backend ready)
-   [ ] Build My Ads screen
-   [ ] Build Payment Methods screen
-   [ ] Build Change Password screen
-   [ ] Build Transaction PIN screen
-   [ ] Add navigation routes
-   [ ] Test all features
-   [ ] Handle error cases
-   [ ] Add loading states
-   [ ] Implement offline support

---

## 🐛 Common Issues

### Issue: "Network Error" or "Request Failed"

**Solution**: Check that your API base URL is correct and the server is running.

### Issue: "Unauthorized" (401)

**Solution**: Ensure the auth token is being sent in the Authorization header.

### Issue: "Invalid old password"

**Solution**: Verify the user is entering their current password correctly.

### Issue: Profile picture upload fails

**Solution**: This endpoint needs to be implemented on the backend first.

---

## 📚 Related Documentation

-   [Account Module](./modules/account.md) - Authentication & KYC
-   [Wallet Module](./modules/wallet.md) - Wallet & Transactions
-   [P2P Module](./modules/p2p.md) - P2P Trading
-   [Notification Module](./modules/notification.md) - Push Notifications
-   [KYC Integration](./kyc-expo-integration.md) - KYC Verification

---

## 💡 Tips

1. **Use TypeScript**: Leverage type safety for better development experience
2. **Error Handling**: Always show user-friendly error messages
3. **Loading States**: Provide visual feedback during API calls
4. **Validation**: Validate input on the client side before API calls
5. **Caching**: Cache user data to reduce unnecessary API calls
6. **Security**: Never log sensitive data (passwords, PINs)
7. **Testing**: Test all edge cases and error scenarios

---

For detailed implementation code and examples, refer to the main document: **`expo-profile-integration.md`**
