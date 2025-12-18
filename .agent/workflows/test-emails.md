---
description: Test Email Notifications
---

# Test Email Notifications

This workflow helps verify the email notification system.

## 1. Test Welcome Email (Registration)

To test the welcome email, register a new user:

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

Check the server logs (or your email if using Resend) for the "Welcome" email.

## 2. Test Verification Success Email

To test the verification success email, you need to verify both email and phone for a user.

1. **Send Email OTP:**

```bash
curl -X POST http://localhost:8000/api/v1/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{ "identifier": "test_welcome@example.com", "type": "email" }'
```

2. **Verify Email OTP:** (Get code from logs/email)

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

4. **Verify Phone OTP:** (Get code from logs/SMS)

```bash
curl -X POST http://localhost:8000/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{ "identifier": "+1234567890", "type": "phone", "code": "123456" }'
```

After the second verification (whichever is last), check logs/email for "Verification Complete" email.
