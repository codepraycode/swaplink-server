# Mailtrap Email Setup for Staging

This guide explains how to set up Mailtrap for email testing in staging environments.

## What is Mailtrap?

Mailtrap is an email testing service that allows you to safely test email functionality without sending emails to real users. It captures all outgoing emails in a sandbox inbox where you can inspect them.

## Why Use Mailtrap for Staging?

-   **Safe Testing**: Emails are captured in a sandbox, preventing accidental sends to real users
-   **Email Inspection**: View email content, HTML rendering, and headers
-   **No Domain Verification**: Unlike production email services, no domain setup required
-   **Team Collaboration**: Share inbox access with your team
-   **Free Tier**: Generous free tier for development and staging

## Setup Instructions

### 1. Create a Mailtrap Account

1. Go to [Mailtrap.io](https://mailtrap.io/)
2. Sign up for a free account
3. Verify your email address

### 2. Get SMTP Credentials

1. Log in to your Mailtrap dashboard
2. Navigate to **Email Testing** → **Inboxes**
3. Select or create an inbox (e.g., "SwapLink Staging")
4. Click on **SMTP Settings**
5. Copy the credentials:
    - **Host**: `sandbox.smtp.mailtrap.io` (or `live.smtp.mailtrap.io` for production testing)
    - **Port**: `2525` (or `587`, `465`)
    - **Username**: Your unique username
    - **Password**: Your unique password

### 3. Configure Environment Variables

Add the following to your `.env.staging` file:

```env
# Mailtrap Configuration (Staging)
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=your_mailtrap_username
MAILTRAP_PASSWORD=your_mailtrap_password

# General Email Configuration
FROM_EMAIL=noreply@swaplink.com

# Environment Flag
STAGING=true
NODE_ENV=staging
```

### 4. Verify Setup

Run your application in staging mode:

```bash
# Set environment to staging
export NODE_ENV=staging
export STAGING=true

# Or use the staging env file
NODE_ENV=staging pnpm run dev
```

You should see in the logs:

```
🧪 Staging mode: Initializing Mailtrap Email Service
✅ Using Mailtrap Email Service (Staging)
📧 FROM_EMAIL configured as: noreply@swaplink.com
🔧 Mailtrap Host: sandbox.smtp.mailtrap.io:2525
```

### 5. Test Email Sending

Trigger an email action (e.g., user registration) and check your Mailtrap inbox to see the captured email.

## Email Service Priority

The application uses the following priority for email services:

1. **Production** (`NODE_ENV=production` and `STAGING!=true`): Uses **Resend**
2. **Staging** (`STAGING=true` or `NODE_ENV=staging`): Uses **Mailtrap**
3. **Development/Fallback**: Uses **LocalEmailService** (console logging)

## Environment Variables Reference

| Variable            | Required      | Default                    | Description                          |
| ------------------- | ------------- | -------------------------- | ------------------------------------ |
| `MAILTRAP_HOST`     | Yes (staging) | `sandbox.smtp.mailtrap.io` | Mailtrap SMTP host                   |
| `MAILTRAP_PORT`     | Yes (staging) | `2525`                     | Mailtrap SMTP port                   |
| `MAILTRAP_USER`     | Yes (staging) | -                          | Your Mailtrap username               |
| `MAILTRAP_PASSWORD` | Yes (staging) | -                          | Your Mailtrap password               |
| `FROM_EMAIL`        | Yes           | `onboarding@resend.dev`    | Sender email address                 |
| `STAGING`           | No            | -                          | Set to `true` to enable staging mode |

## Mailtrap Features

### Email Preview

-   View HTML and plain text versions
-   Check responsive design
-   Inspect email headers

### Spam Analysis

-   Check spam score
-   Get recommendations for improvement

### HTML/CSS Check

-   Validate HTML structure
-   Check CSS compatibility across email clients

### Forwarding

-   Forward test emails to real addresses for manual testing

## Troubleshooting

### Emails Not Appearing in Mailtrap

1. **Check credentials**: Verify `MAILTRAP_USER` and `MAILTRAP_PASSWORD` are correct
2. **Check environment**: Ensure `STAGING=true` or `NODE_ENV=staging` is set
3. **Check logs**: Look for error messages in application logs
4. **Verify inbox**: Make sure you're looking at the correct inbox in Mailtrap

### Connection Errors

```
Error: Connection timeout
```

**Solution**: Check your network connection and firewall settings. Mailtrap uses standard SMTP ports (2525, 587, 465).

### Authentication Failed

```
Error: Invalid login
```

**Solution**: Verify your credentials in Mailtrap dashboard and update your `.env.staging` file.

## Production vs Staging

| Feature             | Production (Resend) | Staging (Mailtrap)   |
| ------------------- | ------------------- | -------------------- |
| Real Email Delivery | ✅ Yes              | ❌ No (sandbox only) |
| Domain Verification | ✅ Required         | ❌ Not required      |
| Email Inspection    | ❌ Limited          | ✅ Full inspection   |
| Spam Testing        | ❌ No               | ✅ Yes               |
| Cost                | Pay per email       | Free tier available  |
| Use Case            | Production users    | Testing & QA         |

## Best Practices

1. **Never use Mailtrap in production** - It's designed for testing only
2. **Use separate inboxes** - Create different inboxes for different environments or features
3. **Clean up regularly** - Mailtrap has inbox limits, clean old emails periodically
4. **Test email templates** - Use Mailtrap to verify email rendering across clients
5. **Share with team** - Invite team members to access staging inbox

## Additional Resources

-   [Mailtrap Documentation](https://mailtrap.io/docs/)
-   [Nodemailer Documentation](https://nodemailer.com/)
-   [Email Testing Best Practices](https://mailtrap.io/blog/email-testing/)

## Support

For issues with:

-   **Mailtrap service**: Contact [Mailtrap Support](https://mailtrap.io/support)
-   **SwapLink integration**: Check application logs and verify environment configuration
