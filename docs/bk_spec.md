# Backend Specification for KYC Verification

This document outlines the backend implementation requirements to support the KYC Verification flow in the SwapLink mobile application.

## Overview

The KYC process collects personal information, address details, government ID documents, proof of address, and liveness checks (selfie/video). The backend must handle `multipart/form-data` requests to process both text data and file uploads securely.

## 1. API Endpoints

We recommend a unified endpoint or a step-by-step approach. Given the frontend structure, a unified submission or a grouped submission is efficient. However, for better progress tracking and error handling, splitting by logical steps (Documents vs Data) is often preferred.

### Option A: Unified Submission (Recommended for Simplicity)

**Endpoint:** `POST /account/auth/kyc/submit`
**Content-Type:** `multipart/form-data`
**Auth Required:** Yes (Bearer Token)

**Request Body (FormData):**

| Key                    | Type   | Required    | Description                                                   |
| :--------------------- | :----- | :---------- | :------------------------------------------------------------ |
| `firstName`            | String | Yes         | User's first name (should match profile)                      |
| `lastName`             | String | Yes         | User's last name (should match profile)                       |
| `dateOfBirth`          | String | Yes         | Format: `YYYY-MM-DD`                                          |
| `address[street]`      | String | Yes         | Street address                                                |
| `address[city]`        | String | Yes         | City                                                          |
| `address[state]`       | String | Yes         | State/Region                                                  |
| `address[country]`     | String | Yes         | Country of residence                                          |
| `address[postalCode]`  | String | Yes         | Postal/Zip code                                               |
| `governmentId[type]`   | String | Yes         | `international_passport`, `residence_permit`, or `foreign_id` |
| `governmentId[number]` | String | Yes         | ID Document Number                                            |
| `idDocumentFront`      | File   | Yes         | Image file (JPG/PNG/HEIC)                                     |
| `idDocumentBack`       | File   | Conditional | Image file. Required if type is NOT `international_passport`  |
| `proofOfAddress`       | File   | Yes         | Image file (Utility bill, bank statement)                     |
| `selfie`               | File   | Yes         | Image file                                                    |
| `livenessVideo`        | File   | Optional    | Video file (if liveness check requires it)                    |

**Response (Success - 200 OK):**

```json
{
    "success": true,
    "message": "KYC verification submitted successfully",
    "data": {
        "kycStatus": "PENDING",
        "kycLevel": "TIER_1" // or current level
    }
}
```

**Response (Error - 400 Bad Request):**

```json
{
    "success": false,
    "message": "Validation failed",
    "errors": [{ "field": "address.country", "message": "Country not supported" }]
}
```

---

### Option B: Step-by-Step Submission (Granular Control)

If the backend prefers processing files separately from data:

#### 1. Upload Documents

**Endpoint:** `POST /account/auth/kyc/upload`
**Content-Type:** `multipart/form-data`

**FormData:**

-   `type`: `id_front` | `id_back` | `proof_of_address` | `selfie`
-   `file`: (Binary File)

**Response:**

```json
{
    "success": true,
    "data": {
        "fileId": "uuid-of-uploaded-file",
        "url": "https://secure-storage.com/..."
    }
}
```

#### 2. Submit Data

**Endpoint:** `POST /account/auth/kyc/data`
**Content-Type:** `application/json`

**Body:**

```json
{
  "personal": { ... },
  "address": { ... },
  "governmentId": {
    "type": "...",
    "number": "...",
    "frontImageId": "uuid...",
    "backImageId": "uuid..."
  },
  "proofOfAddressId": "uuid...",
  "selfieId": "uuid..."
}
```

## 2. Database Schema Updates

Ensure the `User` or a separate `KYCProfile` table has the following fields:

**Table: `KYCProfiles` (or columns in `Users`)**

| Column              | Type      | Description                                                          |
| :------------------ | :-------- | :------------------------------------------------------------------- |
| `userId`            | UUID      | Foreign Key to Users table                                           |
| `firstName`         | VARCHAR   |                                                                      |
| `lastName`          | VARCHAR   |                                                                      |
| `dateOfBirth`       | DATE      |                                                                      |
| `addressStreet`     | VARCHAR   |                                                                      |
| `addressCity`       | VARCHAR   |                                                                      |
| `addressState`      | VARCHAR   |                                                                      |
| `addressCountry`    | VARCHAR   |                                                                      |
| `addressPostalCode` | VARCHAR   |                                                                      |
| `idType`            | ENUM      | `PASSPORT`, `RESIDENCE_PERMIT`, `FOREIGN_ID`                         |
| `idNumber`          | VARCHAR   | Encrypted                                                            |
| `idFrontUrl`        | VARCHAR   | Secure URL / S3 Key                                                  |
| `idBackUrl`         | VARCHAR   | Secure URL / S3 Key                                                  |
| `proofOfAddressUrl` | VARCHAR   | Secure URL / S3 Key                                                  |
| `selfieUrl`         | VARCHAR   | Secure URL / S3 Key                                                  |
| `status`            | ENUM      | `NOT_STARTED`, `PENDING`, `APPROVED`, `REJECTED`, `MORE_INFO_NEEDED` |
| `rejectionReason`   | TEXT      | Nullable                                                             |
| `submittedAt`       | TIMESTAMP |                                                                      |
| `reviewedAt`        | TIMESTAMP |                                                                      |

## 3. Business Logic & Validation

1.  **Country Restriction:**

    -   **Strictly Validate:** `address.country` must NOT be "Nigeria" (case-insensitive).
    -   Reject request immediately if country is Nigeria.

2.  **File Validation:**

    -   **Max Size:** Limit file size (e.g., 5MB for images, 15MB for video).
    -   **Formats:** Allow `image/jpeg`, `image/png`, `image/heic`, `application/pdf` (for POA).
    -   **Security:** Scan files for malware if possible.

3.  **Data Consistency:**

    -   Verify `firstName` and `lastName` match the authenticated user's account details.

4.  **Status Updates:**
    -   Upon successful submission, set user's `kycStatus` to `PENDING`.
    -   Send a notification (email/push) to the user confirming receipt.

## 4. Third-Party Integration (Future Proofing)

If using a provider like **Sumsub**, **SmileID**, or **Veriff**:

1.  **Backend Proxy:**

    -   The backend should act as a proxy to generate an SDK Token or Access Token from the provider.
    -   **Endpoint:** `POST /account/auth/kyc/token`
    -   **Response:** `{ "token": "..." }`

2.  **Webhooks:**
    -   Implement a webhook endpoint `POST /webhooks/kyc` to receive status updates from the provider (Approved/Rejected) and update the local database accordingly.

## 5. Security Considerations

-   **Encryption:** Encrypt sensitive fields (ID Number) at rest.
-   **Storage:** Use private S3 buckets (or equivalent) with signed URLs for temporary access. Never make KYC documents public.
-   **Access Control:** Only Admins with specific roles should be able to view KYC documents.
