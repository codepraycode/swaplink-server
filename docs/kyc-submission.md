# KYC Verification Payload Specification

**Endpoint:** `POST /account/auth/kyc`
**Content-Type:** `multipart/form-data`

## Text Fields

| Field Name             | Type   | Description                  | Example                                                    |
| ---------------------- | ------ | ---------------------------- | ---------------------------------------------------------- |
| `firstName`            | String | User's legal first name      | `John`                                                     |
| `lastName`             | String | User's legal last name       | `Doe`                                                      |
| `dateOfBirth`          | String | Date of birth in ISO format  | `1990-01-01`                                               |
| `address[street]`      | String | Residential street address   | `123 Baker St`                                             |
| `address[city]`        | String | City of residence            | `London`                                                   |
| `address[state]`       | String | State or province (optional) | `Greater London`                                           |
| `address[country]`     | String | Country of residence         | `United Kingdom`                                           |
| `address[postalCode]`  | String | Postal or ZIP code           | `SW1A 1AA`                                                 |
| `governmentId[type]`   | String | Type of ID document          | `international_passport`, `residence_permit`, `foreign_id` |
| `governmentId[number]` | String | ID document number           | `A12345678`                                                |

## File Uploads

| Field Name        | Type         | Description                                                 |
| ----------------- | ------------ | ----------------------------------------------------------- |
| `idDocumentFront` | File (Image) | Front image of the identity document                        |
| `idDocumentBack`  | File (Image) | Back image of the identity document (Optional for Passport) |
| `proofOfAddress`  | File (Image) | Image of utility bill or bank statement                     |
| `selfie`          | File (Image) | Liveness check selfie image                                 |
