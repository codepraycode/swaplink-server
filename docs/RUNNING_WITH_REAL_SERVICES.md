# Running with Real Services (Staging Mode)

## Quick Start

To use **real** Resend email and Twilio SMS services (instead of mock services), run in **staging mode**:

```bash
# Stop your current dev server (Ctrl+C)

# Run in staging mode
pnpm run dev:staging

# Or run both API and Worker in staging mode
pnpm run dev:staging:all
```

## What's the Difference?

### Development Mode (`pnpm dev`)

-   **NODE_ENV**: `development`
-   **Email**: Mock service (logs to console)
-   **SMS**: Mock service (logs to console)
-   **Use for**: Local development without API keys

### Staging Mode (`pnpm run dev:staging`)

-   **NODE_ENV**: `production` + `STAGING=true`
-   **Email**: Resend (real emails)
-   **SMS**: Twilio (real SMS)
-   **Use for**: Testing with real services before production

## Environment Variables Required

Make sure your `.env` file has:

```bash
# For Staging Mode
NODE_ENV=production
STAGING=true

# Resend Email
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=onboarding@resend.dev  # or your verified domain

# Twilio SMS
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

## Verification

When you run `pnpm run dev:staging`, you should see:

```
🚀 Staging mode: Initializing Resend Email Service
✅ Using Resend Email Service
📧 FROM_EMAIL configured as: onboarding@resend.dev

🚀 Initializing Twilio SMS Service
✅ Using Twilio SMS Service
📱 FROM_PHONE_NUMBER configured as: +1234567890
```

If you see "Mock" or "Local" services, you're still in development mode.

## Testing SMS in Non-Production

The Twilio service has a safety feature: in non-production environments, all SMS will be sent to a default test number (`+18777804236`) instead of the actual recipient number. This prevents accidentally sending SMS to real users during testing.

To send to real numbers, make sure:

```bash
NODE_ENV=production  # Not 'development'
```

## Available Scripts

| Command                    | Mode        | Email  | SMS    | Use Case              |
| -------------------------- | ----------- | ------ | ------ | --------------------- |
| `pnpm dev`                 | Development | Mock   | Mock   | Local dev             |
| `pnpm run dev:staging`     | Staging     | Resend | Twilio | Test real services    |
| `pnpm run dev:staging:all` | Staging     | Resend | Twilio | Test with worker      |
| `pnpm start`               | Production  | Resend | Twilio | Production (compiled) |

## Troubleshooting

### Still seeing mock services?

1. **Check your command**: Make sure you're using `pnpm run dev:staging`, not `pnpm dev`
2. **Check environment**: The server logs should say "Staging mode" or "Production mode", not "development mode"
3. **Check .env**: Make sure `RESEND_API_KEY` and `TWILIO_ACCOUNT_SID` are set
4. **Restart server**: Stop and restart after changing `.env`

### Twilio not initializing?

Check that all three variables are set:

```bash
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx
```

### Resend not initializing?

Check that the API key is set:

```bash
RESEND_API_KEY=re_xxx
FROM_EMAIL=onboarding@resend.dev
```

---

**Quick Fix for Your Current Issue:**

```bash
# Stop your server (Ctrl+C in the terminal)
# Then run:
pnpm run dev:staging
```

This will use real Resend and Twilio services! 🚀
