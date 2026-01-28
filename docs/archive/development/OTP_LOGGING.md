# OTP Logging for Development & Testing

## Overview

In development and test environments, all OTP codes and password reset tokens are **automatically logged to the console** with prominent formatting. This allows you to easily access verification codes without needing to integrate with real SMS/Email providers.

## Features

### 📱 SMS OTP Logging

When an SMS OTP is sent in development/test mode, you'll see:

```
═══════════════════════════════════════
📱 SMS OTP for +2348012345678
🔑 CODE: 123456
⏰ Valid for: 10 minutes
═══════════════════════════════════════
```

### 📧 Email OTP Logging

When an Email OTP is sent in development/test mode, you'll see:

```
═══════════════════════════════════════
📧 EMAIL OTP for user@example.com
🔑 CODE: 654321
⏰ Valid for: 10 minutes
═══════════════════════════════════════
```

### 🔐 Password Reset Token Logging

When a password reset email is sent in development/test mode, you'll see:

```
═══════════════════════════════════════
📧 PASSWORD RESET for user@example.com
🔑 Reset Token: reset_token_abc123xyz
🔗 Reset Link: http://localhost:3000/reset-password?token=reset_token_abc123xyz
⏰ Valid for: 15 minutes
═══════════════════════════════════════
```

## When Does Logging Happen?

OTP codes are logged **only** when:

-   `NODE_ENV=development` OR
-   `NODE_ENV=test`

In production (`NODE_ENV=production`), OTPs are **never logged** for security reasons.

## How to Use

### During Development

1. Start your development server:

    ```bash
    pnpm run dev
    ```

2. Trigger an OTP (e.g., register a user, request password reset)

3. Check your console/terminal for the prominently displayed OTP code

4. Copy the code and use it in your application

### During Testing

When running tests, OTPs are automatically logged:

```bash
# Run tests
pnpm test:unit

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e
```

The OTP codes will appear in the test output.

### Demo Script

Run the demo script to see OTP logging in action:

```bash
NODE_ENV=development npx ts-node src/test/demo-otp-logging.ts
```

## Example Usage Flow

### User Registration Flow

1. User submits registration form with phone number
2. Backend generates OTP and calls `smsService.sendOtp()`
3. Console displays:
    ```
    ═══════════════════════════════════════
    📱 SMS OTP for +2348012345678
    🔑 CODE: 123456
    ⏰ Valid for: 10 minutes
    ═══════════════════════════════════════
    ```
4. Copy `123456` from console
5. Enter in your app's OTP verification screen
6. User is verified ✅

### Password Reset Flow

1. User requests password reset
2. Backend generates reset token and calls `emailService.sendPasswordResetLink()`
3. Console displays:
    ```
    ═══════════════════════════════════════
    📧 PASSWORD RESET for user@example.com
    🔑 Reset Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    🔗 Reset Link: http://localhost:3000/reset-password?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ⏰ Valid for: 15 minutes
    ═══════════════════════════════════════
    ```
4. Copy the reset link from console
5. Open in browser or use the token in your app
6. User can reset password ✅

## Integration with Real Providers

When you're ready to integrate with real SMS/Email providers:

### For SMS (Twilio, Termii, etc.)

1. Update `src/lib/services/sms.service.ts`
2. Replace the mock implementation in `sendSms()` with actual provider API calls
3. The OTP logging will **still work** in development/test
4. In production, only real SMS will be sent (no logging)

```typescript
async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    try {
        if (process.env.NODE_ENV === 'production') {
            // Send via real SMS provider
            await twilioClient.messages.create({
                to: phoneNumber,
                from: process.env.TWILIO_PHONE_NUMBER,
                body: message
            });
        } else {
            // Development/Test: Log to console
            logger.info(`[SMS Service] 📱 SMS to ${phoneNumber}`);
            logger.info(`[SMS Service] Message: ${message}`);
        }
        return true;
    } catch (error) {
        logger.error(`[SMS Service] Failed to send SMS:`, error);
        throw new Error('Failed to send SMS');
    }
}
```

### For Email (SendGrid, AWS SES, etc.)

1. Update `src/lib/services/email.service.ts`
2. Replace the mock implementation in `sendEmail()` with actual provider API calls
3. The OTP logging will **still work** in development/test
4. In production, only real emails will be sent (no logging)

```typescript
async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    try {
        if (process.env.NODE_ENV === 'production') {
            // Send via real email provider
            await sendgridClient.send({
                to,
                from: process.env.FROM_EMAIL,
                subject,
                html: body
            });
        } else {
            // Development/Test: Log to console
            logger.info(`[Email Service] 📧 Email to ${to}`);
            logger.info(`[Email Service] Subject: ${subject}`);
        }
        return true;
    } catch (error) {
        logger.error(`[Email Service] Failed to send email:`, error);
        throw new Error('Failed to send email');
    }
}
```

## Security Considerations

### ✅ Safe Practices

-   OTPs are **only logged** in development/test environments
-   Production logs **never** contain OTP codes
-   Logging is controlled by `NODE_ENV` environment variable
-   All OTPs expire after 10 minutes
-   OTPs are marked as used after verification (prevents replay attacks)

### ⚠️ Important Notes

1. **Never commit `.env` files** with real credentials
2. **Always use `.env.example`** as a template
3. **Rotate secrets** when moving to production
4. **Monitor logs** in production to ensure no sensitive data is logged
5. **Use separate databases** for development, test, and production

## Troubleshooting

### OTPs Not Showing in Logs

**Problem:** OTP codes are not appearing in console

**Solution:**

1. Check `NODE_ENV` is set to `development` or `test`:
    ```bash
    echo $NODE_ENV
    ```
2. Verify logger is configured correctly in `src/lib/utils/logger.ts`
3. Check log level allows `info` level logs

### OTPs Showing in Production

**Problem:** OTP codes appearing in production logs

**Solution:**

1. **IMMEDIATELY** check `NODE_ENV` is set to `production`
2. Review `sms.service.ts` and `email.service.ts` for logging conditions
3. Audit production logs and rotate any exposed secrets
4. Update logging configuration to prevent sensitive data logging

## Related Files

-   `src/lib/services/sms.service.ts` - SMS service with OTP logging
-   `src/lib/services/email.service.ts` - Email service with OTP logging
-   `src/lib/services/otp.service.ts` - OTP generation and verification
-   `src/test/demo-otp-logging.ts` - Demo script
-   `src/lib/utils/logger.ts` - Logger configuration

## Testing

All OTP logging functionality is tested:

```bash
# Run SMS service tests
pnpm test:unit -- sms.service.unit.test

# Run Email service tests
pnpm test:unit -- email.service.unit.test

# Run OTP service tests
pnpm test:unit -- otp.service.unit.test
```

## Summary

✅ OTPs are automatically logged in development/test  
✅ Easy to copy codes from console  
✅ Works for SMS, Email, and Password Reset  
✅ Secure - never logs in production  
✅ Ready for real provider integration  
✅ Fully tested

This feature makes development and testing much easier without requiring real SMS/Email provider integration!
