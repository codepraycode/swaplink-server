# Quick Fix: Railway Email Deployment Guide

## The Problem

You're seeing this error on Railway:

```
[Mailtrap] Exception sending email: Connection timeout
```

**Root Cause**: Railway blocks SMTP ports (25, 587, 2525) to prevent spam.

## The Solution

Use **SendGrid** instead of Mailtrap for Railway deployments.

## Setup Steps (5 minutes)

### 1. Get SendGrid API Key

1. Sign up at [SendGrid](https://sendgrid.com/) (free tier: 100 emails/day)
2. Go to **Settings** → **API Keys** → **Create API Key**
3. Name it "SwapLink Staging"
4. Enable **Mail Send** → **Full Access**
5. Copy the API key (starts with `SG.`)

### 2. Verify Your Sender Email

1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Enter your email (e.g., `noreply@yourdomain.com`)
4. Check your inbox and verify

### 3. Add to Railway Environment Variables

In your Railway project dashboard:

```bash
SENDGRID_API_KEY=SG.your_actual_api_key_here
FROM_EMAIL=noreply@yourdomain.com  # Must match verified sender
STAGING=true
```

### 4. Redeploy

Railway will automatically redeploy with the new environment variables.

## Verify It's Working

Check your Railway logs for:

```
✅ Using SendGrid Email Service (Staging)
[SendGrid] ✅ Email sent successfully to user@example.com. Status: 202
```

## What Changed?

-   **Before**: Mailtrap (SMTP) → ❌ Connection timeout on Railway
-   **After**: SendGrid (HTTP API) → ✅ Works perfectly on Railway

## Cost

-   **Free**: 100 emails/day (perfect for staging)
-   **Paid**: $19.95/month for 50,000 emails (if you need more)

## Need Help?

See the full guide: [docs/email-services/sendgrid-setup.md](./sendgrid-setup.md)
