# 🚀 Railway Email Setup - Updated Guide

## Problem Solved! ✅

Your Railway deployment was failing with:

```
[Mailtrap] Exception sending email: Connection timeout
```

**Both SendGrid and Mailtrap now use HTTP APIs** - no more SMTP port blocking issues!

---

## Quick Setup (Choose One)

### Option 1: SendGrid (Recommended for Production-Like Staging)

**Best for**: Actual email delivery, testing real-world scenarios

#### Setup (3 minutes)

1. Sign up at https://sendgrid.com (free: 100 emails/day)
2. **Settings** → **API Keys** → **Create API Key**
3. Enable **Mail Send** permissions
4. **Settings** → **Sender Authentication** → **Verify a Single Sender**
5. Add to Railway:
    ```bash
    SENDGRID_API_KEY=SG.your_key_here
    FROM_EMAIL=noreply@yourdomain.com  # Must be verified
    STAGING=true
    ```

---

### Option 2: Mailtrap API (Recommended for Testing/Debugging)

**Best for**: Email template testing, debugging, inbox preview

#### Setup (3 minutes)

1. Sign up at https://mailtrap.io (free: 500 emails/month)
2. **Settings** → **API Tokens** → **Create Token**
3. Enable **Email Sending** permissions
4. Add to Railway:
    ```bash
    MAILTRAP_API_TOKEN=your_token_here
    FROM_EMAIL=noreply@yourdomain.com
    STAGING=true
    ```

---

## What Changed?

| Before                           | After                           |
| -------------------------------- | ------------------------------- |
| ❌ Mailtrap SMTP (port 2525)     | ✅ Mailtrap HTTP API (port 443) |
| ❌ Connection timeout on Railway | ✅ Works perfectly on Railway   |
| ❌ 4 environment variables       | ✅ 1 environment variable       |

---

## Email Service Priority

Railway will automatically use services in this order:

1. **SendGrid** (if `SENDGRID_API_KEY` set) ⭐ Recommended
2. **Mailtrap API** (if `MAILTRAP_API_TOKEN` set) ✅ Also works!
3. **LocalEmailService** (fallback - console logs)

**You can use either or both!** The system picks the first available.

---

## Verify It's Working

Check Railway logs for either:

```
✅ Using SendGrid Email Service (Staging)
[SendGrid] ✅ Email sent successfully
```

Or:

```
✅ Using Mailtrap Email Service (Staging - API)
[Mailtrap] ✅ Email sent successfully
```

---

## Quick Comparison

| Feature                | SendGrid                | Mailtrap API         |
| ---------------------- | ----------------------- | -------------------- |
| **Free Tier**          | 100 emails/day          | 500 emails/month     |
| **Real Delivery**      | ✅ Yes                  | ❌ No (testing only) |
| **Inbox Preview**      | ❌ No                   | ✅ Yes               |
| **Best For**           | Production-like staging | Testing/debugging    |
| **Setup Time**         | 3 minutes               | 3 minutes            |
| **Railway Compatible** | ✅ Yes                  | ✅ Yes               |

---

## Cost

Both are **FREE** for staging:

-   **SendGrid**: 100 emails/day forever
-   **Mailtrap**: 500 emails/month forever

---

## Need More Help?

-   **SendGrid Guide**: `docs/email-services/sendgrid-setup.md`
-   **Mailtrap Guide**: `docs/email-services/mailtrap-setup.md`
-   **Migration Details**: `docs/MAILTRAP_API_MIGRATION.md`

---

**Status**: ✅ Both email services now work perfectly on Railway!

Choose the one that fits your needs, or use both! 🎉
