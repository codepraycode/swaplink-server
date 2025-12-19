---
description: Test Email Notifications
---

# Test Email Notifications

This workflow helps verify the email notification system across different environments.

## Email Service Overview

The application uses different email services based on environment:

-   **Production**: Resend (real emails)
-   **Staging**: Mailtrap (sandbox testing)
-   **Development**: LocalEmailService (console logs)

## Setup

### Option 1: Test with Mailtrap (Recommended for Staging)

1. **Get Mailtrap Credentials:**

    - Sign up at [mailtrap.io](https://mailtrap.io)
    - Go to Email Testing → Inboxes
    - Copy SMTP credentials

2. **Configure Environment:**

    ```bash
    # Copy staging example
    cp .env.staging.example .env.staging

    # Edit .env.staging and add your credentials:
    MAILTRAP_USER=your_username
    MAILTRAP_PASSWORD=your_password
    STAGING=true
    NODE_ENV=staging
    ```

3. **Start Server:**

    ```bash
    NODE_ENV=staging STAGING=true pnpm run dev
    ```

4. **Check Logs:** You should see:
    ```
    🧪 Staging mode: Initializing Mailtrap Email Service
    ✅ Using Mailtrap Email Service (Staging)
    ```

### Option 2: Test with Local Logging (Development)

1. **Start Server:**

    ```bash
    pnpm run dev
    ```

2. **Check Logs:** You should see:
    ```
    💻 Development mode: Using Local Email Service (console logging)
    ```

## Test Cases

### 1. Test Welcome Email (Registration)

Register a new user:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test_welcome@example.com",
    "phone": "+1234567890",
    "password": "Password123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Expected Result:**

-   **Mailtrap**: Check your inbox at mailtrap.io
-   **Local**: Check console logs for email content

### 2. Test Verification Email

Send an email verification code:

```bash
curl -X POST http://localhost:8000/api/v1/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{ "identifier": "test_welcome@example.com", "type": "email" }'
```

**Expected Result:**

-   **Mailtrap**: Email with verification code in inbox
-   **Local**: Console log showing verification code

### 3. Test Verification Success Email

Complete both email and phone verification:

1. **Send Email OTP:**

    ```bash
    curl -X POST http://localhost:8000/api/v1/auth/otp/send \
      -H "Content-Type: application/json" \
      -d '{ "identifier": "test_welcome@example.com", "type": "email" }'
    ```

2. **Verify Email OTP:** (Get code from Mailtrap/logs)

    ```bash
    curl -X POST http://localhost:8000/api/v1/auth/otp/verify \
      -H "Content-Type: application/json" \
      -d '{ "identifier": "test_welcome@example.com", "type": "email", "code": "123456" }'
    ```

3. **Send Phone OTP:**

    ```bash
    curl -X POST http://localhost:8000/api/v1/auth/otp/send \
      -H "Content-Type: application/json" \
      -d '{ "identifier": "+1234567890", "type": "phone" }'
    ```

4. **Verify Phone OTP:** (Get code from logs)
    ```bash
    curl -X POST http://localhost:8000/api/v1/auth/otp/verify \
      -H "Content-Type: application/json" \
      -d '{ "identifier": "+1234567890", "type": "phone", "code": "123456" }'
    ```

**Expected Result:**
After the second verification, you should receive a "Verification Complete" email.

### 4. Test Password Reset Email

Request a password reset:

```bash
curl -X POST http://localhost:8000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{ "email": "test_welcome@example.com" }'
```

**Expected Result:**

-   **Mailtrap**: Email with password reset link
-   **Local**: Console log with reset token

## Verification Checklist

-   [ ] Server starts with correct email service (check logs)
-   [ ] Welcome email sent on registration
-   [ ] Verification code email sent on OTP request
-   [ ] Verification success email sent after complete verification
-   [ ] Password reset email sent on forgot password
-   [ ] Emails appear in Mailtrap inbox (if using staging)
-   [ ] Email content is properly formatted (HTML rendering)
-   [ ] All links in emails work correctly

## Troubleshooting

### Mailtrap Not Receiving Emails

1. Check environment variables:

    ```bash
    echo $STAGING  # Should be 'true'
    echo $NODE_ENV  # Should be 'staging'
    ```

2. Check server logs for:

    ```
    🧪 Staging mode: Initializing Mailtrap Email Service
    [Mailtrap] ✅ Email sent successfully
    ```

3. Verify credentials in `.env.staging`

### Emails Going to Wrong Service

Check the initialization logs:

-   `🚀 Production mode` = Using Resend
-   `🧪 Staging mode` = Using Mailtrap
-   `💻 Development mode` = Using LocalEmailService

Set correct environment variables to change service.

## Additional Resources

-   [Email Service Guide](../docs/EMAIL_SERVICE_GUIDE.md)
-   [Mailtrap Setup](../docs/MAILTRAP_EMAIL_SETUP.md)
-   [Resend Setup](../docs/RESEND_EMAIL_SETUP.md)
