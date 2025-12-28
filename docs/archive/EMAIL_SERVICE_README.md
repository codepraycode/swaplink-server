# SwapLink Email Service - Complete Setup

## 🎯 Overview

SwapLink now supports **environment-specific email services**:

-   **Production**: Resend (real email delivery)
-   **Staging**: Mailtrap (safe email testing)
-   **Development**: LocalEmailService (console logging)

![Email Service Architecture](../artifacts/email_service_architecture.png)

## 📦 What's Included

### Services

-   ✅ **ResendEmailService** - Production email delivery via Resend API
-   ✅ **MailtrapEmailService** - Staging email testing via Mailtrap SMTP
-   ✅ **LocalEmailService** - Development console logging

### Configuration

-   ✅ Environment-based automatic service selection
-   ✅ Comprehensive environment variable support
-   ✅ Type-safe configuration with TypeScript

### Documentation

-   ✅ Complete setup guides for each service
-   ✅ Testing workflows and examples
-   ✅ Troubleshooting guides

## 🚀 Quick Start Guide

### Step 1: Choose Your Environment

#### For Development (Local Testing)

```bash
# No setup needed! Just run:
pnpm run dev

# Emails will be logged to console
```

#### For Staging (Mailtrap Testing)

```bash
# 1. Copy staging template
cp .env.staging.example .env.staging

# 2. Sign up at https://mailtrap.io and get credentials

# 3. Edit .env.staging and add:
MAILTRAP_USER=your_username
MAILTRAP_PASSWORD=your_password

# 4. Run in staging mode
NODE_ENV=staging STAGING=true pnpm run dev
```

#### For Production (Real Emails)

```bash
# 1. Sign up at https://resend.com

# 2. Verify your domain

# 3. Get API key

# 4. Set in .env.production:
RESEND_API_KEY=re_your_key_here
FROM_EMAIL=noreply@yourdomain.com

# 5. Deploy with production env
NODE_ENV=production pnpm start
```

### Step 2: Verify Setup

Check your server logs on startup:

**Development:**

```
💻 Development mode: Using Local Email Service (console logging)
```

**Staging:**

```
🧪 Staging mode: Initializing Mailtrap Email Service
✅ Using Mailtrap Email Service (Staging)
📧 FROM_EMAIL configured as: noreply@swaplink.com
🔧 Mailtrap Host: sandbox.smtp.mailtrap.io:2525
```

**Production:**

```
🚀 Production mode: Initializing Resend Email Service
✅ Using Resend Email Service
📧 FROM_EMAIL configured as: noreply@yourdomain.com
```

### Step 3: Test Email Functionality

Use the `/test-emails` workflow:

```bash
# Register a test user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "+1234567890",
    "password": "Password123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Check for welcome email:
# - Development: Check console logs
# - Staging: Check Mailtrap inbox
# - Production: Check actual email inbox
```

## 📋 Environment Variables Reference

### Core Variables

| Variable     | Required | Default                 | Description               |
| ------------ | -------- | ----------------------- | ------------------------- |
| `NODE_ENV`   | Yes      | `development`           | Environment mode          |
| `STAGING`    | No       | -                       | Set to `true` for staging |
| `FROM_EMAIL` | Yes      | `onboarding@resend.dev` | Sender email address      |

### Resend (Production)

| Variable         | Required | Default | Description    |
| ---------------- | -------- | ------- | -------------- |
| `RESEND_API_KEY` | Yes      | -       | Resend API key |

### Mailtrap (Staging)

| Variable            | Required | Default                    | Description   |
| ------------------- | -------- | -------------------------- | ------------- |
| `MAILTRAP_HOST`     | Yes      | `sandbox.smtp.mailtrap.io` | SMTP host     |
| `MAILTRAP_PORT`     | Yes      | `2525`                     | SMTP port     |
| `MAILTRAP_USER`     | Yes      | -                          | SMTP username |
| `MAILTRAP_PASSWORD` | Yes      | -                          | SMTP password |

## 📚 Documentation Index

### Setup Guides

1. **[EMAIL_SERVICE_GUIDE.md](./EMAIL_SERVICE_GUIDE.md)** - Complete guide covering all services
2. **[MAILTRAP_EMAIL_SETUP.md](./MAILTRAP_EMAIL_SETUP.md)** - Mailtrap setup instructions
3. **[RESEND_EMAIL_SETUP.md](./RESEND_EMAIL_SETUP.md)** - Resend setup instructions
4. **[EMAIL_SERVICE_SETUP_SUMMARY.md](./EMAIL_SERVICE_SETUP_SUMMARY.md)** - Quick summary

### Workflows

-   **[/test-emails](../.agent/workflows/test-emails.md)** - Email testing workflow

### Configuration Files

-   **`.env.example`** - Development environment template
-   **`.env.staging.example`** - Staging environment template
-   **`.env.production`** - Production environment (gitignored)

## 🔧 Available Email Methods

All email services implement the same interface:

```typescript
// Send verification code
await emailService.sendVerificationEmail(email, code);

// Send welcome email
await emailService.sendWelcomeEmail(email, name);

// Send password reset link
await emailService.sendPasswordResetLink(email, token);

// Send verification success
await emailService.sendVerificationSuccessEmail(email, name);

// Send custom email
await emailService.sendEmail({
    to: email,
    subject: 'Subject',
    html: '<h1>Content</h1>',
    text: 'Content',
});
```

## 🎨 Service Comparison

| Feature                 | LocalEmailService | Mailtrap      | Resend        |
| ----------------------- | ----------------- | ------------- | ------------- |
| **Environment**         | Development       | Staging       | Production    |
| **Real Delivery**       | ❌ No             | ❌ No         | ✅ Yes        |
| **Email Inspection**    | Console only      | ✅ Full UI    | ❌ Limited    |
| **Spam Testing**        | ❌ No             | ✅ Yes        | ❌ No         |
| **Domain Verification** | ❌ Not needed     | ❌ Not needed | ✅ Required   |
| **Cost**                | Free              | Free tier     | Pay per email |
| **Setup Time**          | 0 minutes         | 5 minutes     | 15-30 minutes |
| **Best For**            | Quick dev         | QA testing    | Production    |

## 🧪 Testing Checklist

Before deploying to production, verify:

-   [ ] Staging environment configured with Mailtrap
-   [ ] All email templates tested in Mailtrap
-   [ ] Email HTML renders correctly across clients
-   [ ] Spam score is acceptable (check in Mailtrap)
-   [ ] All links in emails work correctly
-   [ ] Resend domain verified for production
-   [ ] Production environment variables set
-   [ ] Email sending works in production (test with real email)

## 🐛 Troubleshooting

### Problem: Wrong email service is being used

**Solution:** Check environment variables:

```bash
# Should show correct values
echo $NODE_ENV
echo $STAGING

# Check server logs for initialization message
```

### Problem: Mailtrap not receiving emails

**Solution:**

1. Verify `STAGING=true` is set
2. Check credentials in `.env.staging`
3. Look for errors in server logs
4. Verify you're checking the correct inbox in Mailtrap

### Problem: Resend domain verification failing

**Solution:**

1. Use `FROM_EMAIL=onboarding@resend.dev` for testing
2. Check DNS records in Resend dashboard
3. Wait 24-48 hours for DNS propagation
4. See [RESEND_EMAIL_SETUP.md](./RESEND_EMAIL_SETUP.md)

### Problem: TypeScript errors

**Solution:**

```bash
# Check for compilation errors
pnpm run build:check

# Should complete without errors
```

## 🔒 Security Best Practices

1. **Never commit credentials**

    - All `.env*` files are gitignored (except examples)
    - Use environment variables in deployment

2. **Separate environments**

    - Use Mailtrap for all non-production testing
    - Never use production credentials in staging

3. **Rotate keys regularly**

    - Change API keys periodically
    - Update in all deployment environments

4. **Monitor usage**
    - Check Resend dashboard for unusual activity
    - Set up alerts for high volume

## 📈 Next Steps

1. **Set up Mailtrap account** for staging testing
2. **Test all email flows** using `/test-emails` workflow
3. **Review email templates** in Mailtrap UI
4. **Optimize for deliverability** using Mailtrap's spam analysis
5. **Set up Resend** when ready for production
6. **Verify domain** for production email sending
7. **Deploy** with confidence!

## 🤝 Support

-   **Mailtrap Issues**: [mailtrap.io/support](https://mailtrap.io/support)
-   **Resend Issues**: [resend.com/docs](https://resend.com/docs)
-   **SwapLink Issues**: Check server logs and documentation

## 📝 Additional Notes

-   Email service selection is **automatic** based on environment
-   All services use the **same interface** (easy to switch)
-   **No code changes** needed to switch environments
-   **Type-safe** configuration with TypeScript
-   **Well-documented** with comprehensive guides

---

**Ready to send emails!** 🚀

Start with development mode, test in staging with Mailtrap, then deploy to production with Resend.
