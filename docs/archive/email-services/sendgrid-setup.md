# SendGrid Email Service Setup for Staging

## Overview

SendGrid has been integrated as the **recommended email service for staging environments**, especially when deploying to cloud platforms like Railway, Heroku, or Render. SendGrid uses an HTTP API instead of SMTP, which avoids port blocking issues common with cloud deployments.

## Why SendGrid for Staging?

### The Problem with Mailtrap on Railway

Railway (and many cloud platforms) block outbound SMTP connections on ports like 25, 587, and 2525 to prevent spam. This causes Mailtrap's SMTP service to timeout with errors like:

```
Connection timeout
at SMTPConnection._formatError
```

### The Solution: SendGrid HTTP API

SendGrid uses HTTPS (port 443) for sending emails, which is never blocked by cloud platforms. This makes it perfect for staging deployments.

## Setup Instructions

### 1. Create a SendGrid Account

1. Go to [SendGrid](https://sendgrid.com/)
2. Sign up for a free account (100 emails/day free tier)
3. Verify your email address

### 2. Create an API Key

1. Log in to your SendGrid dashboard
2. Navigate to **Settings** → **API Keys**
3. Click **Create API Key**
4. Choose **Restricted Access** and enable:
    - **Mail Send** → Full Access
5. Copy the generated API key (you'll only see it once!)

### 3. Configure Your Environment

#### For Railway Deployment

Add the following environment variable in your Railway project:

```bash
SENDGRID_API_KEY=SG.your_actual_api_key_here
STAGING=true
NODE_ENV=production
FROM_EMAIL=noreply@yourdomain.com  # Use a verified sender
```

#### For Local Staging Testing

Update your `.env.staging` file:

```bash
# Copy from .env.staging.example
SENDGRID_API_KEY=SG.your_actual_api_key_here
STAGING=true
FROM_EMAIL=noreply@yourdomain.com
```

### 4. Verify Sender Email (Important!)

SendGrid requires sender verification:

#### Option A: Single Sender Verification (Quick - Recommended for Testing)

1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Add your email address (e.g., `noreply@yourdomain.com`)
4. Check your email and click the verification link
5. Use this verified email as your `FROM_EMAIL`

#### Option B: Domain Authentication (Production-Ready)

1. Go to **Settings** → **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Follow the DNS setup instructions
4. Once verified, you can use any email from that domain

## Email Service Priority

The system automatically selects the email service in this order:

### Production (NODE_ENV=production, STAGING=false)

1. **Resend** (if `RESEND_API_KEY` is set)
2. **LocalEmailService** (fallback - logs to console)

### Staging (STAGING=true or NODE_ENV=staging)

1. **SendGrid** (if `SENDGRID_API_KEY` is set) ✅ **Recommended**
2. **Mailtrap** (if `MAILTRAP_USER` and `MAILTRAP_PASSWORD` are set)
3. **LocalEmailService** (fallback - logs to console)

### Development (NODE_ENV=development)

1. **LocalEmailService** (logs to console)

## Testing Your Setup

### 1. Check the Logs

When your app starts, you should see:

```
🧪 Staging mode: Initializing SendGrid Email Service
✅ Using SendGrid Email Service (Staging)
📧 FROM_EMAIL configured as: noreply@yourdomain.com
```

### 2. Send a Test Email

Trigger any email-sending flow (e.g., user registration). Check the logs for:

```
[SendGrid] Attempting to send email to user@example.com from noreply@yourdomain.com
[SendGrid] ✅ Email sent successfully to user@example.com. Status: 202
```

### 3. Check SendGrid Dashboard

1. Go to **Activity** in your SendGrid dashboard
2. You should see the sent email with status "Delivered"

## Troubleshooting

### Error: "SENDGRID_API_KEY is required"

**Solution**: Make sure you've set the `SENDGRID_API_KEY` environment variable.

### Error: "The from address does not match a verified Sender Identity"

**Solution**:

1. Verify your sender email in SendGrid (see step 4 above)
2. Make sure `FROM_EMAIL` matches exactly with your verified sender

### Error: "SendGrid Error: Forbidden"

**Solution**:

1. Check that your API key has "Mail Send" permissions
2. Regenerate the API key if needed

### Still Using Mailtrap?

If you see this in logs:

```
🧪 Staging mode: Initializing Mailtrap Email Service
```

It means `SENDGRID_API_KEY` is not set. Add it to prioritize SendGrid.

## Cost Considerations

### SendGrid Free Tier

-   **100 emails/day** forever free
-   Perfect for staging environments
-   No credit card required

### When to Upgrade

-   If you need more than 100 emails/day in staging
-   SendGrid Essentials: $19.95/month for 50,000 emails

## Migration from Mailtrap

If you're currently using Mailtrap:

1. **Keep Mailtrap for local development** (it's great for testing!)
2. **Use SendGrid for Railway/cloud deployments** (avoids connection issues)
3. **No code changes needed** - the system automatically selects the right service

Simply add `SENDGRID_API_KEY` to your Railway environment variables, and the app will automatically prefer SendGrid over Mailtrap.

## Security Best Practices

1. ✅ **Never commit API keys** to version control
2. ✅ **Use environment variables** for all sensitive data
3. ✅ **Rotate API keys** periodically
4. ✅ **Use restricted API keys** with minimal permissions
5. ✅ **Monitor SendGrid activity** for suspicious behavior

## Additional Resources

-   [SendGrid Documentation](https://docs.sendgrid.com/)
-   [SendGrid Node.js Library](https://github.com/sendgrid/sendgrid-nodejs)
-   [Sender Authentication Guide](https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication)

## Support

If you encounter issues:

1. Check the [SendGrid Status Page](https://status.sendgrid.com/)
2. Review your SendGrid Activity logs
3. Check your application logs for detailed error messages
