# Quick Start: Email & SMS Services

## Overview

SwapLink backend now supports:

-   **Email**: SendGrid (production/staging) or Mock (development)
-   **SMS**: Twilio (production/staging) or Mock (development)

## Quick Setup

### 1. Get Your API Keys

**SendGrid:**

-   Sign up at https://sendgrid.com/
-   Get API key from Settings → API Keys
-   Verify sender email

**Twilio:**

-   Sign up at https://www.twilio.com/
-   Get Account SID and Auth Token from Console
-   Get a phone number with SMS capability

### 2. Update .env File

```bash
# For Staging/Production
NODE_ENV=production
STAGING=true  # Set to true for staging

# SendGrid
SENDGRID_API_KEY=SG.your_key_here
FROM_EMAIL=noreply@yourdomain.com

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### 3. Start the Server

```bash
pnpm run dev
```

You should see:

```
🧪 Staging mode: Initializing SendGrid Email Service
✅ Using SendGrid Email Service (Staging)
🚀 Initializing Twilio SMS Service
✅ Using Twilio SMS Service
```

## Usage in Code

### Sending Emails

```typescript
import { emailService } from '@/shared/lib/services/email-service/email.service';

// Send verification email
await emailService.sendVerificationEmail('user@example.com', '123456');

// Send welcome email
await emailService.sendWelcomeEmail('user@example.com', 'John Doe');

// Send password reset
await emailService.sendPasswordResetLink('user@example.com', 'reset-token');

// Send custom email
await emailService.sendEmail({
    to: 'user@example.com',
    subject: 'Custom Subject',
    html: '<h1>Hello!</h1><p>This is a custom email.</p>',
    text: 'Hello! This is a custom email.',
});
```

### Sending SMS

```typescript
import { smsService } from '@/shared/lib/services/sms-service/sms.service';

// Send OTP
await smsService.sendOtp('+1234567890', '123456');

// Send custom SMS
await smsService.sendSms('+1234567890', 'Your custom message here');
```

## Environment Modes

### Development Mode

-   **Email**: Logs to console (no actual emails sent)
-   **SMS**: Logs to console (no actual SMS sent)
-   **Cost**: Free
-   **Setup**: No API keys needed

```bash
NODE_ENV=development
```

### Staging Mode

-   **Email**: Uses SendGrid
-   **SMS**: Uses Twilio
-   **Cost**: SendGrid free tier (100/day), Twilio trial ($15 credit)
-   **Setup**: Requires API keys

```bash
NODE_ENV=production
STAGING=true
SENDGRID_API_KEY=SG.xxx
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx
```

### Production Mode

-   **Email**: Uses Resend (preferred) or SendGrid
-   **SMS**: Uses Twilio
-   **Cost**: Based on usage
-   **Setup**: Requires API keys

```bash
NODE_ENV=production
RESEND_API_KEY=re_xxx  # Preferred
# OR
SENDGRID_API_KEY=SG.xxx

TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx
```

## Testing

### Test Email Service

```bash
# Register a new user (triggers verification email)
curl -X POST http://localhost:3001/api/v1/account/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Test SMS Service

```bash
# Request phone verification (triggers OTP SMS)
curl -X POST http://localhost:3001/api/v1/account/auth/verify-phone \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890"
  }'
```

## Common Issues

### SendGrid: "Unauthorized"

-   Check your `SENDGRID_API_KEY` is correct
-   Ensure API key has "Mail Send" permission

### SendGrid: "Sender Not Verified"

-   Verify your `FROM_EMAIL` in SendGrid dashboard
-   Use Single Sender Verification for testing

### Twilio: "Authentication Failed"

-   Verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`
-   Check for extra spaces in .env file

### Twilio: "Phone Number Not Verified" (Trial)

-   Verify recipient numbers in Twilio Console
-   Or upgrade to paid account

### Services Not Loading

-   Check server logs for initialization messages
-   Verify all required env vars are set
-   Ensure .env file is in project root

## Cost Optimization

### Development

-   Use mock services (free)
-   No API keys needed

### Staging

-   SendGrid: Free tier (100 emails/day)
-   Twilio: Trial ($15 credit)
-   Verify only test numbers

### Production

-   SendGrid: $19.95/month for 50K emails
-   Twilio: ~$0.0079 per SMS
-   Monitor usage regularly

## Next Steps

1. ✅ Set up accounts (SendGrid + Twilio)
2. ✅ Get API keys
3. ✅ Update .env file
4. ✅ Test in development
5. ✅ Test in staging
6. ✅ Deploy to production
7. ✅ Monitor usage and costs

For detailed setup instructions, see [EMAIL_SMS_SETUP.md](./EMAIL_SMS_SETUP.md)
