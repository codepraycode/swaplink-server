# Email Service Update: Resend as Primary Provider

## Summary

The email service configuration has been updated to use **Resend** as the primary email provider, with **SendGrid** as a fallback option.

## What Changed

### Service Priority (New)

```
1. Resend (Primary) - if RESEND_API_KEY is set
2. SendGrid (Fallback) - if SENDGRID_API_KEY is set
3. Mailtrap (Staging Fallback) - if MAILTRAP_API_TOKEN is set
4. LocalEmail (Development) - console logging
```

### Service Priority (Old)

```
1. Resend (Production only) - if RESEND_API_KEY is set
2. SendGrid (Staging) - if SENDGRID_API_KEY is set
3. Mailtrap (Staging Fallback) - if MAILTRAP_API_TOKEN is set
4. LocalEmail (Development) - console logging
```

## Why Resend?

### Advantages over SendGrid

1. **Easier Setup**

    - No domain verification needed for testing (`onboarding@resend.dev`)
    - Faster domain verification (5-15 minutes vs up to 48 hours)
    - Simpler DNS configuration

2. **Better Free Tier**

    - Resend: 100 emails/day + 3,000 emails/month
    - SendGrid: 100 emails/day only

3. **Modern API**

    - Cleaner, more intuitive API
    - Better TypeScript support
    - More detailed error messages

4. **Better Deliverability**

    - Higher inbox placement rates
    - Better spam score handling
    - Modern email infrastructure

5. **Cost-Effective**
    - Resend Pro: $20/month for 50,000 emails
    - SendGrid Essentials: $19.95/month for 50,000 emails
    - Similar pricing but better features

## Quick Start with Resend

### 1. Get API Key

```bash
# Visit https://resend.com/
# Sign up and get your API key
```

### 2. Update .env

```bash
# For testing (no domain needed)
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=onboarding@resend.dev

# For production (with verified domain)
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=noreply@yourdomain.com
```

### 3. Start Server

```bash
pnpm run dev
```

You should see:

```
🚀 Staging mode: Initializing Resend Email Service
✅ Using Resend Email Service
📧 FROM_EMAIL configured as: onboarding@resend.dev
```

## Domain Verification (Production)

### Resend (5-15 minutes)

1. Go to **Domains** in Resend dashboard
2. Click **Add Domain**
3. Add 3 DNS records (SPF, DKIM, DMARC)
4. Wait 5-15 minutes
5. Done! ✅

### SendGrid (up to 48 hours)

1. Go to **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Add multiple DNS records
4. Wait up to 48 hours
5. Done! ✅

## Migration from SendGrid

If you're currently using SendGrid, you have two options:

### Option 1: Switch to Resend (Recommended)

```bash
# Comment out SendGrid
# SENDGRID_API_KEY=SG.xxx

# Add Resend
RESEND_API_KEY=re_xxx
FROM_EMAIL=onboarding@resend.dev  # or your verified domain
```

### Option 2: Keep Both (Resend Primary, SendGrid Fallback)

```bash
# Resend will be tried first
RESEND_API_KEY=re_xxx

# SendGrid will be used if Resend fails
SENDGRID_API_KEY=SG.xxx

FROM_EMAIL=onboarding@resend.dev
```

## Testing

### Test Email Sending

```bash
# Start server
pnpm run dev

# Trigger email (e.g., user registration)
curl -X POST http://localhost:3001/api/v1/account/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Check Logs

```
🚀 Staging mode: Initializing Resend Email Service
✅ Using Resend Email Service
📧 FROM_EMAIL configured as: onboarding@resend.dev
[Resend] Attempting to send email to test@example.com
[Resend] ✅ Email sent successfully to test@example.com. ID: abc123
```

## Troubleshooting

### "Domain Not Verified" Error

**For Testing:**

```bash
# Use Resend's test domain (no verification needed)
FROM_EMAIL=onboarding@resend.dev
```

**For Production:**

1. Go to https://resend.com/domains
2. Add your domain
3. Add DNS records
4. Wait for verification
5. Use `FROM_EMAIL=noreply@yourdomain.com`

### Service Falls Back to SendGrid

Check your logs:

```
Failed to initialize ResendEmailService, trying SendGrid...
```

**Causes:**

-   Missing `RESEND_API_KEY`
-   Invalid API key
-   Domain not verified (when using custom domain)

**Solutions:**

-   Verify `RESEND_API_KEY` is set correctly
-   Use `onboarding@resend.dev` for testing
-   Check Resend dashboard for API key status

## Cost Comparison

| Feature       | Resend Free  | SendGrid Free  |
| ------------- | ------------ | -------------- |
| Daily Limit   | 100 emails   | 100 emails     |
| Monthly Limit | 3,000 emails | ~3,000 emails  |
| Domain Setup  | 5-15 min     | Up to 48 hours |
| Test Domain   | ✅ Yes       | ❌ No          |
| API Quality   | Modern       | Legacy         |
| **Winner**    | 🏆 Resend    | -              |

| Feature    | Resend Pro   | SendGrid Essentials |
| ---------- | ------------ | ------------------- |
| Price      | $20/month    | $19.95/month        |
| Emails     | 50,000/month | 50,000/month        |
| Support    | Email        | Email               |
| API        | Modern       | Legacy              |
| **Winner** | 🏆 Resend    | -                   |

## Documentation

-   **[Complete Setup Guide](./docs/EMAIL_SMS_SETUP.md)** - Updated with Resend instructions
-   **[Quick Start](./docs/EMAIL_SMS_QUICKSTART.md)** - Quick reference
-   **[Resend Documentation](https://resend.com/docs)** - Official Resend docs
-   **[Resend Dashboard](https://resend.com/overview)** - Manage your account

## Next Steps

1. ✅ Get Resend API key from https://resend.com/
2. ✅ Update `.env` with `RESEND_API_KEY`
3. ✅ Use `FROM_EMAIL=onboarding@resend.dev` for testing
4. ✅ Test email sending
5. ✅ (Optional) Verify your domain for production
6. ✅ (Optional) Keep SendGrid as fallback

---

**Status**: ✅ Ready to use
**Last Updated**: 2026-01-02
**Recommended**: Use Resend for all new projects
