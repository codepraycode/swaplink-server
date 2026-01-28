# Email Service Configuration Guide

This guide explains how to configure and use email services in the SwapLink application across different environments.

## Overview

SwapLink supports multiple email service providers based on the environment:

| Environment     | Service           | Purpose                      |
| --------------- | ----------------- | ---------------------------- |
| **Production**  | Resend            | Real email delivery to users |
| **Staging**     | Mailtrap          | Email testing in sandbox     |
| **Development** | LocalEmailService | Console logging only         |

## Architecture

The email service uses a factory pattern to automatically select the appropriate service based on environment variables:

```typescript
// Automatic service selection
const emailService = EmailServiceFactory.create();

// Usage (same interface across all services)
await emailService.sendVerificationEmail(email, code);
await emailService.sendWelcomeEmail(email, name);
await emailService.sendPasswordResetLink(email, token);
```

## Environment Detection

The system uses the following logic to determine which service to use:

```typescript
1. If NODE_ENV=production AND STAGING!=true AND RESEND_API_KEY is set
   → Use ResendEmailService

2. If STAGING=true OR NODE_ENV=staging AND Mailtrap credentials are set
   → Use MailtrapEmailService

3. Otherwise
   → Use LocalEmailService (console logging)
```

## Configuration by Environment

### Production (Resend)

**Required Environment Variables:**

```env
NODE_ENV=production
STAGING=false  # or not set
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=noreply@yourdomain.com
```

**Setup Guide:** See [RESEND_EMAIL_SETUP.md](./RESEND_EMAIL_SETUP.md)

**Features:**

-   ✅ Real email delivery
-   ✅ High deliverability rates
-   ✅ Email analytics
-   ⚠️ Requires domain verification
-   💰 Pay-per-email pricing

### Staging (Mailtrap)

**Required Environment Variables:**

```env
NODE_ENV=staging  # or any value
STAGING=true
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=your_username
MAILTRAP_PASSWORD=your_password
FROM_EMAIL=noreply@swaplink.com
```

**Setup Guide:** See [MAILTRAP_EMAIL_SETUP.md](./MAILTRAP_EMAIL_SETUP.md)

**Features:**

-   ✅ Safe testing (no real emails sent)
-   ✅ Email inspection and debugging
-   ✅ Spam score analysis
-   ✅ No domain verification needed
-   💰 Free tier available

### Development (Local)

**Required Environment Variables:**

```env
NODE_ENV=development
# No email service credentials needed
```

**Features:**

-   ✅ Zero configuration
-   ✅ Console logging only
-   ✅ Fast development
-   ❌ No actual emails sent

## Quick Start

### 1. Choose Your Environment

Copy the appropriate example file:

```bash
# For staging
cp .env.staging.example .env.staging

# For production
cp .env.example .env.production

# For development
cp .env.example .env
```

### 2. Configure Credentials

**For Staging (Mailtrap):**

1. Sign up at [mailtrap.io](https://mailtrap.io)
2. Get SMTP credentials from your inbox
3. Update `.env.staging`:
    ```env
    MAILTRAP_USER=your_actual_username
    MAILTRAP_PASSWORD=your_actual_password
    ```

**For Production (Resend):**

1. Sign up at [resend.com](https://resend.com)
2. Get API key from dashboard
3. Verify your domain
4. Update `.env.production`:
    ```env
    RESEND_API_KEY=re_your_actual_key
    FROM_EMAIL=noreply@yourdomain.com
    ```

### 3. Run Your Application

```bash
# Development (local logging)
pnpm run dev

# Staging (Mailtrap)
NODE_ENV=staging pnpm run dev

# Production (Resend)
NODE_ENV=production pnpm start
```

## Available Email Methods

All email services implement the same interface:

### 1. Send Verification Email

```typescript
await emailService.sendVerificationEmail('user@example.com', '123456');
```

### 2. Send Welcome Email

```typescript
await emailService.sendWelcomeEmail('user@example.com', 'John Doe');
```

### 3. Send Password Reset Link

```typescript
await emailService.sendPasswordResetLink('user@example.com', 'reset_token_here');
```

### 4. Send Verification Success Email

```typescript
await emailService.sendVerificationSuccessEmail('user@example.com', 'John Doe');
```

### 5. Send Custom Email

```typescript
await emailService.sendEmail({
    to: 'user@example.com',
    subject: 'Custom Subject',
    html: '<h1>Hello!</h1>',
    text: 'Hello!',
});
```

## Testing Email Flow

### Using Mailtrap (Staging)

1. Set up staging environment:

    ```bash
    cp .env.staging.example .env.staging
    # Add your Mailtrap credentials
    ```

2. Run in staging mode:

    ```bash
    NODE_ENV=staging STAGING=true pnpm run dev
    ```

3. Trigger an email action (e.g., user registration)

4. Check your Mailtrap inbox at [mailtrap.io/inboxes](https://mailtrap.io/inboxes)

### Using Local Service (Development)

1. Run in development mode:

    ```bash
    pnpm run dev
    ```

2. Trigger an email action

3. Check console logs for email content:
    ```
    ═══════════════════════════════════════
    📧 [LocalEmailService] VERIFICATION EMAIL for user@example.com
    🔑 CODE: 123456
    ═══════════════════════════════════════
    ```

## Troubleshooting

### Email Service Not Initializing

**Symptom:** Application falls back to LocalEmailService unexpectedly

**Solutions:**

1. Check environment variables are set correctly
2. Verify `NODE_ENV` and `STAGING` flags
3. Check application logs for initialization errors
4. Ensure credentials are valid

### Resend Domain Verification Issues

**Symptom:** Emails fail with domain verification error

**Solutions:**

1. Use `FROM_EMAIL=onboarding@resend.dev` for testing
2. Verify your domain in Resend dashboard
3. Check DNS records are properly configured
4. See [RESEND_EMAIL_SETUP.md](./RESEND_EMAIL_SETUP.md)

### Mailtrap Connection Issues

**Symptom:** SMTP connection timeout or authentication failed

**Solutions:**

1. Verify credentials in Mailtrap dashboard
2. Check firewall allows SMTP ports (2525, 587, 465)
3. Ensure `STAGING=true` is set
4. See [MAILTRAP_EMAIL_SETUP.md](./MAILTRAP_EMAIL_SETUP.md)

## Environment Variables Reference

| Variable            | Required   | Default                    | Description                    |
| ------------------- | ---------- | -------------------------- | ------------------------------ |
| `NODE_ENV`          | Yes        | `development`              | Application environment        |
| `STAGING`           | No         | -                          | Set to `true` for staging mode |
| `FROM_EMAIL`        | Yes        | `onboarding@resend.dev`    | Sender email address           |
| `RESEND_API_KEY`    | Production | -                          | Resend API key                 |
| `MAILTRAP_HOST`     | Staging    | `sandbox.smtp.mailtrap.io` | Mailtrap SMTP host             |
| `MAILTRAP_PORT`     | Staging    | `2525`                     | Mailtrap SMTP port             |
| `MAILTRAP_USER`     | Staging    | -                          | Mailtrap username              |
| `MAILTRAP_PASSWORD` | Staging    | -                          | Mailtrap password              |

## Best Practices

### 1. Environment Separation

-   ✅ Use Mailtrap for all non-production environments
-   ✅ Only use Resend in production
-   ✅ Never mix production and staging credentials

### 2. Email Content

-   ✅ Test email templates in Mailtrap before production
-   ✅ Check spam scores using Mailtrap's analysis
-   ✅ Verify responsive design across email clients
-   ✅ Include unsubscribe links in production emails

### 3. Error Handling

-   ✅ Always handle email sending errors gracefully
-   ✅ Log email failures for debugging
-   ✅ Don't block user actions on email failures
-   ✅ Implement retry logic for critical emails

### 4. Security

-   ✅ Never commit `.env` files with real credentials
-   ✅ Use environment-specific configuration files
-   ✅ Rotate API keys regularly
-   ✅ Monitor email sending for abuse

## Migration Guide

### From LocalEmailService to Mailtrap (Staging)

1. Sign up for Mailtrap account
2. Get SMTP credentials
3. Update `.env.staging` with credentials
4. Set `STAGING=true`
5. Restart application
6. Verify emails appear in Mailtrap inbox

### From Mailtrap to Resend (Production)

1. Sign up for Resend account
2. Verify your domain
3. Get API key
4. Update `.env.production` with API key
5. Set `NODE_ENV=production` and `STAGING=false`
6. Test thoroughly in staging first
7. Deploy to production

## Additional Resources

-   [Resend Documentation](https://resend.com/docs)
-   [Mailtrap Documentation](https://mailtrap.io/docs)
-   [Nodemailer Documentation](https://nodemailer.com)
-   [Email Testing Best Practices](https://mailtrap.io/blog/email-testing/)

## Support

For issues with:

-   **Resend**: See [RESEND_EMAIL_SETUP.md](./RESEND_EMAIL_SETUP.md)
-   **Mailtrap**: See [MAILTRAP_EMAIL_SETUP.md](./MAILTRAP_EMAIL_SETUP.md)
-   **SwapLink Integration**: Check application logs and environment configuration
