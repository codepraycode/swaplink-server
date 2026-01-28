# Mailtrap Email Service Setup (API)

## Overview

Mailtrap has been updated to use their **official HTTP API** instead of SMTP. This resolves connection timeout issues on cloud platforms like Railway that block SMTP ports.

## What Changed?

### Before (SMTP - Deprecated)

-   ❌ Used nodemailer with SMTP connection
-   ❌ Required: `MAILTRAP_USER`, `MAILTRAP_PASSWORD`, `MAILTRAP_HOST`, `MAILTRAP_PORT`
-   ❌ Failed on Railway with `Connection timeout` errors

### After (API - Current)

-   ✅ Uses official `mailtrap` npm package with HTTP API
-   ✅ Required: `MAILTRAP_API_TOKEN`
-   ✅ Works on all cloud platforms (no port blocking)

## Setup Instructions

### 1. Create a Mailtrap Account

1. Go to [Mailtrap](https://mailtrap.io/)
2. Sign up for a free account
3. Verify your email address

### 2. Get Your API Token

1. Log in to your Mailtrap dashboard
2. Navigate to **Settings** → **API Tokens**
3. Click **Create Token**
4. Name it: `SwapLink Staging`
5. Permissions: Select **Email Sending** (or **Full Access**)
6. **Copy the token** (starts with a long alphanumeric string)

### 3. Configure Your Environment

#### For Railway Deployment

Add the following environment variable in your Railway project:

```bash
MAILTRAP_API_TOKEN=your_actual_api_token_here
STAGING=true
NODE_ENV=production
FROM_EMAIL=noreply@yourdomain.com
```

#### For Local Staging Testing

Update your `.env.staging` file:

```bash
# Copy from .env.staging.example
MAILTRAP_API_TOKEN=your_actual_api_token_here
STAGING=true
FROM_EMAIL=noreply@yourdomain.com
```

### 4. Verify Setup

When your app starts, you should see:

```
🧪 Staging mode: Initializing Mailtrap Email Service (API)
✅ Using Mailtrap Email Service (Staging - API)
📧 FROM_EMAIL configured as: noreply@yourdomain.com
```

## Email Service Priority

Mailtrap is now the **second choice** for staging (after SendGrid):

### Staging (STAGING=true or NODE_ENV=staging)

1. **SendGrid** (if `SENDGRID_API_KEY` is set) ⭐ **Recommended**
2. **Mailtrap API** (if `MAILTRAP_API_TOKEN` is set) ✅ **Works on Railway**
3. **LocalEmailService** (fallback - logs to console)

## Testing Your Setup

### 1. Send a Test Email

Trigger any email-sending flow (e.g., user registration). Check the logs for:

```
[Mailtrap] Attempting to send email to user@example.com from noreply@yourdomain.com
[Mailtrap] ✅ Email sent successfully to user@example.com. Message ID: abc123
```

### 2. Check Mailtrap Inbox

1. Go to your Mailtrap dashboard
2. Navigate to **Email Testing** → **Inboxes**
3. Select your inbox
4. You should see the test email

## Troubleshooting

### Error: "MAILTRAP_API_TOKEN is required"

**Solution**: Make sure you've set the `MAILTRAP_API_TOKEN` environment variable.

### Error: "Mailtrap Error: Unauthorized"

**Solution**:

1. Check that your API token is correct
2. Verify the token has "Email Sending" permissions
3. Regenerate the token if needed

### Error: "Mailtrap Error: Invalid from address"

**Solution**:

1. Make sure `FROM_EMAIL` is set correctly
2. The email should be a valid format (e.g., `noreply@yourdomain.com`)

## Migration from SMTP to API

If you were using the old SMTP configuration:

### Old Configuration (Deprecated)

```bash
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=your_username
MAILTRAP_PASSWORD=your_password
```

### New Configuration (Current)

```bash
MAILTRAP_API_TOKEN=your_api_token_here
```

**Note**: The old SMTP variables are kept for backward compatibility but are no longer used.

## Mailtrap vs SendGrid

| Feature              | Mailtrap                   | SendGrid                  |
| -------------------- | -------------------------- | ------------------------- |
| **Purpose**          | Email testing/debugging    | Production email delivery |
| **Free Tier**        | 500 emails/month           | 100 emails/day            |
| **Best For**         | Local staging, testing     | Railway/cloud deployments |
| **Inbox Preview**    | ✅ Yes (great for testing) | ❌ No                     |
| **Real Delivery**    | ❌ No (testing only)       | ✅ Yes                    |
| **Cloud Compatible** | ✅ Yes (with API)          | ✅ Yes                    |

## When to Use Mailtrap

✅ **Use Mailtrap when:**

-   Testing email templates locally
-   Debugging email content
-   You want to preview emails without sending to real addresses
-   Local staging environment

❌ **Don't use Mailtrap when:**

-   You need actual email delivery to users
-   Deploying to production
-   You need high email volume

## Cost Considerations

### Mailtrap Free Tier

-   **500 emails/month** in testing inboxes
-   **1,000 emails/month** for email sending (API)
-   Perfect for staging and testing

### When to Upgrade

-   If you need more than 500 test emails/month
-   Mailtrap Plus: $14.99/month for 5,000 emails

## Additional Resources

-   [Mailtrap Documentation](https://mailtrap.io/docs/)
-   [Mailtrap API Reference](https://api-docs.mailtrap.io/)
-   [Mailtrap Node.js SDK](https://github.com/railsware/mailtrap-nodejs)

## Support

If you encounter issues:

1. Check the [Mailtrap Status Page](https://status.mailtrap.io/)
2. Review your Mailtrap inbox logs
3. Check your application logs for detailed error messages

---

**Recommendation**: For Railway deployments, we recommend using **SendGrid** as the primary email service, with Mailtrap as a fallback for local testing.
