# Auth Module - Postman Testing Guide

This guide details the endpoints for the Authentication Module of the SwapLink Server. You can use this reference to configure your Postman collection for testing.

## 🌍 Base URL

All endpoints are prefixed with:
`http://localhost:3000/api/v1/auth`

## 🔐 Authentication

Most endpoints require a Bearer Token.

-   **Header Key**: `Authorization`
-   **Header Value**: `Bearer <your_access_token>`

---

## 📱 Mobile Development Notes (Expo/React Native)

If you are consuming this API from an Expo app:

1.  **Base URL**:

    -   **Android Emulator**: Use `http://10.0.2.2:3000/api/v1/auth` instead of `localhost`.
    -   **iOS Simulator**: `http://localhost:3000/api/v1/auth` works fine.
    -   **Physical Device**: Use your computer's local IP (e.g., `http://192.168.1.x:3000/api/v1/auth`).

2.  **Token Storage**:

    -   Do **NOT** use `AsyncStorage` for tokens.
    -   Use `expo-secure-store` for storing the `accessToken` and `refreshToken`.

3.  **File Uploads (KYC)**:
    -   React Native requires a specific format for `FormData` file objects. See the [KYC Section](#4-kyc--compliance) for an example.

---

## 1. Onboarding & Authentication

### 1.1 Register User

Creates a new user account and a corresponding NGN wallet.

-   **Method**: `POST`
-   **URL**: `/register`
-   **Body** (`application/json`):

```json
{
    "email": "user@example.com",
    "phone": "+2348012345678",
    "password": "StrongPassword123!",
    "firstName": "John",
    "lastName": "Doe"
}
```

-   **Response** (`201 Created`):

```json
{
    "success": true,
    "message": "User registered successfully",
    "data": {
        "user": {
            "id": "uuid-string",
            "email": "user@example.com",
            "phone": "+2348012345678",
            "firstName": "John",
            "lastName": "Doe",
            "kycLevel": "NONE",
            "isVerified": false,
            "createdAt": "2023-10-27T10:00:00.000Z"
        },
        "tokens": {
            "accessToken": "jwt-token-string",
            "refreshToken": "refresh-token-string",
            "expiresIn": 86400
        }
    }
}
```

### 1.2 Login

Authenticates a user and returns access tokens.

-   **Method**: `POST`
-   **URL**: `/login`
-   **Body** (`application/json`):

```json
{
    "email": "user@example.com",
    "password": "StrongPassword123!"
}
```

-   **Response** (`200 OK`):

```json
{
    "success": true,
    "message": "User logged in successfully",
    "data": {
        "user": {
            "id": "uuid-string",
            "email": "user@example.com",
            "firstName": "John",
            "lastName": "Doe",
            "kycLevel": "NONE",
            "isVerified": false
        },
        "tokens": {
            "accessToken": "jwt-token-string",
            "refreshToken": "refresh-token-string",
            "expiresIn": 86400
        }
    }
}
```

### 1.3 Get Current User Profile

Retrieves the profile of the currently authenticated user.

-   **Method**: `GET`
-   **URL**: `/me`
-   **Headers**: `Authorization: Bearer <token>`
-   **Response** (`200 OK`):

```json
{
    "success": true,
    "message": "User profile retrieved successfully",
    "data": {
        "user": {
            "id": "uuid-string",
            "email": "user@example.com",
            "phone": "+2348012345678",
            "firstName": "John",
            "lastName": "Doe",
            "kycLevel": "NONE",
            "isVerified": false,
            "wallet": {
                "id": "wallet-uuid",
                "balance": "0",
                "lockedBalance": "0"
            }
        }
    }
}
```

---

### 1.4 Refresh Token

Refreshes the access token using a valid refresh token.

-   **Method**: `POST`
-   **URL**: `/refresh-token`
-   **Body** (`application/json`):

```json
{
    "refreshToken": "refresh-token-string"
}
```

-   **Response** (`200 OK`):

```json
{
    "success": true,
    "message": "Token refreshed successfully",
    "data": {
        "token": "new-jwt-token-string",
        "refreshToken": "new-refresh-token-string",
        "expiresIn": 86400
    }
}
```

---

## 2. OTP Services

### 2.1 Send Phone OTP

Sends a verification OTP to the user's phone number.

-   **Method**: `POST`
-   **URL**: `/otp/phone`
-   **Body** (`application/json`):

```json
{
    "phone": "+2348012345678"
}
```

-   **Response** (`200 OK`):

```json
{
    "success": true,
    "message": "OTP sent successfully",
    "data": {
        "expiresIn": 600
    }
}
```

### 2.2 Verify Phone OTP

Verifies the OTP sent to the phone.

-   **Method**: `POST`
-   **URL**: `/verify/phone`
-   **Body** (`application/json`):

```json
{
    "phone": "+2348012345678",
    "otp": "123456"
}
```

-   **Response** (`200 OK`):

```json
{
    "success": true,
    "message": "Phone verified successfully",
    "data": {
        "success": true
    }
}
```

### 2.3 Send Email OTP

Sends a verification OTP to the user's email.

-   **Method**: `POST`
-   **URL**: `/otp/email`
-   **Body** (`application/json`):

```json
{
    "email": "user@example.com"
}
```

-   **Response** (`200 OK`):

```json
{
    "success": true,
    "message": "OTP sent successfully",
    "data": {
        "expiresIn": 600
    }
}
```

### 2.4 Verify Email OTP

Verifies the OTP sent to the email.

-   **Method**: `POST`
-   **URL**: `/verify/email`
-   **Body** (`application/json`):

```json
{
    "email": "user@example.com",
    "otp": "123456"
}
```

-   **Response** (`200 OK`):

```json
{
    "success": true,
    "message": "Email verified successfully",
    "data": {
        "success": true
    }
}
```

---

## 3. Password Management

### 3.1 Request Password Reset

Initiates the password reset flow by sending an OTP to the email.

-   **Method**: `POST`
-   **URL**: `/password/reset-request`
-   **Body** (`application/json`):

```json
{
    "email": "user@example.com"
}
```

-   **Response** (`200 OK`):

```json
{
    "success": true,
    "message": "Password reset initiated",
    "data": {
        "message": "If email exists, OTP sent"
    }
}
```

### 3.2 Verify Reset OTP

Verifies the OTP for password reset and returns a temporary reset token.

-   **Method**: `POST`
-   **URL**: `/password/verify-otp`
-   **Body** (`application/json`):

```json
{
    "email": "user@example.com",
    "otp": "123456"
}
```

-   **Response** (`200 OK`):

```json
{
    "success": true,
    "message": "OTP verified",
    "data": {
        "resetToken": "jwt-reset-token-string"
    }
}
```

### 3.3 Reset Password

Sets a new password using the reset token.

-   **Method**: `POST`
-   **URL**: `/password/reset`
-   **Body** (`application/json`):

```json
{
    "resetToken": "jwt-reset-token-string",
    "newPassword": "NewStrongPassword123!"
}
```

-   **Response** (`200 OK`):

```json
{
    "success": true,
    "message": "Password reset successful",
    "data": null
}
```

---

## 4. KYC & Compliance

### 4.1 Submit KYC Document

Uploads a KYC document.

-   **Method**: `POST`
-   **URL**: `/kyc`
-   **Headers**:
    -   `Authorization: Bearer <token>`
    -   `Content-Type: multipart/form-data`
-   **Body** (`form-data`):
    -   `document`: [File] (e.g., image.png or doc.pdf)
    -   `documentType`: "passport" (text)
    -   `documentNumber`: "A12345678" (text)

> **React Native / Expo Note:**
> When constructing `FormData` in React Native, the file object must include `uri`, `name`, and `type`.
>
> ```javascript
> const formData = new FormData();
> formData.append('document', {
>     uri: imageUri, // e.g. 'file:///data/user/0/...'
>     name: 'passport.jpg',
>     type: 'image/jpeg', // Mime type is required
> });
> formData.append('documentType', 'passport');
> formData.append('documentNumber', 'A12345678');
> ```

-   **Response** (`200 OK`):

```json
{
    "success": true,
    "message": "KYC submitted successfully",
    "data": {
        "kycLevel": "BASIC",
        "status": "APPROVED"
    }
}
```

### 4.2 Get Verification Status

Checks the user's current KYC and verification status.

-   **Method**: `GET`
-   **URL**: `/verification-status`
-   **Headers**: `Authorization: Bearer <token>`
-   **Response** (`200 OK`):

```json
{
    "success": true,
    "message": "Verification status retrieved",
    "data": {
        "kycLevel": "BASIC",
        "kycStatus": "APPROVED",
        "isVerified": true
    }
}
```
