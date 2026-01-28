# Email and SMS Service Setup Guide

This guide will help you set up **Resend** (primary) or **SendGrid** (fallback) for email services and **Twilio** for SMS services in the SwapLink backend.

## Table of Contents

1. [Resend Email Service Setup](#resend-email-service-setup) (Recommended)
2. [SendGrid Email Service Setup](#sendgrid-email-service-setup) (Fallback)
3. [Twilio SMS Service Setup](#twilio-sms-service-setup)
4. [Environment Configuration](#environment-configuration)
5. [Testing the Services](#testing-the-services)
6. [Troubleshooting](#troubleshooting)

---

## Resend Email Service Setup (Recommended)

### 1. Create a Resend Account

1. Go to [Resend](https://resend.com/)
2. Sign up for a free account (100 emails/day free tier, 3,000/month)
3. Verify your email address

### 2. Get Your API Key

1. Log in to your Resend dashboard
2. Navigate to **API Keys**
3. Click **Create API Key**
4. Name your key (e.g., "SwapLink Production")
5. Copy the API key (starts with `re_`)

### 3. Verify Your Domain (Optional for Production)

#### For Testing (No Domain Needed):

-   Use `FROM_EMAIL=onboarding@resend.dev` (Resend's test domain)
-   This works immediately without any setup

#### For Production (Custom Domain):

1. Go to **Domains** in Resend dashboard
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the provided DNS records to your domain registrar:
    - SPF record
    - DKIM record
    - DMARC record (optional but recommended)
5. Wait for verification (usually 5-15 minutes)
6. Use `FROM_EMAIL=noreply@yourdomain.com`

### 4. Configure Environment Variables

Add to your `.env` file:

```bash
# Resend Email Service (Primary)
RESEND_API_KEY=re_your_actual_api_key_here
FROM_EMAIL=onboarding@resend.dev  # For testing, or noreply@yourdomain.com for production
```

---

## SendGrid Email Service Setup (Fallback)

### 1. Create a SendGrid Account

1. Go to [SendGrid](https://sendgrid.com/)
2. Sign up for a free account (100 emails/day free tier)
3. Verify your email address

### 2. Get Your API Key

1. Log in to your SendGrid dashboard
2. Navigate to **Settings** → **API Keys**
3. Click **Create API Key**
4. Choose **Full Access** or **Restricted Access** (with Mail Send permissions)
5. Name your key (e.g., "SwapLink Production")
6. Copy the API key (you won't be able to see it again!)

### 3. Verify Your Sender Email

1. Go to **Settings** → **Sender Authentication**
2. Choose either:
    - **Single Sender Verification** (easier, good for testing)
    - **Domain Authentication** (recommended for production)

#### Single Sender Verification:

1. Click **Verify a Single Sender**
2. Fill in your details (use the email you want to send from)
3. Check your email and click the verification link

#### Domain Authentication (Recommended for Production):

1. Click **Authenticate Your Domain**
2. Follow the DNS setup instructions
3. Add the provided DNS records to your domain registrar
4. Wait for verification (can take up to 48 hours)

### 4. Configure Environment Variables

Add to your `.env` file:

```bash
# SendGrid Email Service
SENDGRID_API_KEY=SG.your_actual_api_key_here
FROM_EMAIL=noreply@yourdomain.com  # Must be verified in SendGrid
```

---

## Twilio SMS Service Setup

### 1. Create a Twilio Account

1. Go to [Twilio](https://www.twilio.com/)
2. Sign up for a free trial account
3. Verify your email and phone number

### 2. Get Your Account Credentials

1. Log in to your [Twilio Console](https://console.twilio.com/)
2. On the dashboard, you'll see:
    - **Account SID**
    - **Auth Token** (click to reveal)
3. Copy both values

### 3. Get a Phone Number

1. In the Twilio Console, go to **Phone Numbers** → **Manage** → **Buy a number**
2. Choose a phone number with SMS capabilities
3. For trial accounts:
    - You get $15 credit
    - You can only send SMS to verified phone numbers
    - Messages will include "Sent from a Twilio trial account"

### 4. Verify Phone Numbers (Trial Account)

If using a trial account, verify recipient phone numbers:

1. Go to **Phone Numbers** → **Manage** → **Verified Caller IDs**
2. Click **Add a new Caller ID**
3. Enter the phone number and verify via SMS or call

### 5. Configure Environment Variables

Add to your `.env` file:

```bash
# Twilio SMS Service
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number
```

---

## Environment Configuration

### Development Environment

For development, the services will use mock implementations that log to the console:

```bash
NODE_ENV=development
# No need to set SendGrid or Twilio credentials
```

### Staging Environment

For staging, set the `STAGING` environment variable and provide credentials:

```bash
NODE_ENV=production
STAGING=true

# Resend (recommended for staging)
RESEND_API_KEY=re_your_staging_api_key
FROM_EMAIL=onboarding@resend.dev  # Or staging@yourdomain.com if domain verified

# Twilio (required for staging)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_staging_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Production Environment

For production:

```bash
NODE_ENV=production

# Resend for email (Primary - Recommended)
RESEND_API_KEY=re_your_production_api_key
FROM_EMAIL=noreply@yourdomain.com  # Must be verified domain

# OR SendGrid (Fallback)
# SENDGRID_API_KEY=SG.your_production_api_key

# Twilio for SMS
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_production_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Complete .env Example

```bash
# Server Configuration
NODE_ENV=production
STAGING=true
PORT=3001
SERVER_URL=https://api.yourdomain.com

# Email Configuration
FROM_EMAIL=onboarding@resend.dev  # Or noreply@yourdomain.com

# Resend Email Service (Primary)
RESEND_API_KEY=re_your_resend_api_key_here

# SendGrid Email Service (Fallback - Optional)
# SENDGRID_API_KEY=SG.your_sendgrid_api_key_here

# Twilio SMS Service
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# ... other configurations
```

---

## Testing the Services

### Test Email Service

The email service is automatically initialized when the server starts. You'll see logs like:

```
🧪 Staging mode: Initializing SendGrid Email Service
✅ Using SendGrid Email Service (Staging)
📧 FROM_EMAIL configured as: noreply@yourdomain.com
```

To test sending an email, trigger any action that sends emails (e.g., user registration):

```bash
# Example: Register a new user
curl -X POST http://localhost:3001/api/v1/account/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Test SMS Service

The SMS service is automatically initialized when the server starts. You'll see logs like:

```
🚀 Initializing Twilio SMS Service
✅ Using Twilio SMS Service
📱 FROM_PHONE_NUMBER configured as: +1234567890
```

To test sending an SMS, trigger any action that sends OTP (e.g., phone verification):

```bash
# Example: Request phone verification OTP
curl -X POST http://localhost:3001/api/v1/account/auth/verify-phone \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890"
  }'
```

### Development Mode Testing

In development mode, emails and SMS will be logged to the console:

```
═══════════════════════════════════════
📧 Email to: test@example.com
📝 Subject: SwapLink - Verification Code
📄 Body: Your verification code is: 123456
═══════════════════════════════════════

═══════════════════════════════════════
📱 MOCK SMS OTP for +1234567890
🔑 CODE: 123456
⏰ Valid for: 10 minutes
═══════════════════════════════════════
```

---

## Troubleshooting

### SendGrid Issues

#### "Unauthorized" Error

-   **Cause**: Invalid API key
-   **Solution**: Double-check your `SENDGRID_API_KEY` in `.env`

#### "Sender Email Not Verified"

-   **Cause**: The `FROM_EMAIL` hasn't been verified in SendGrid
-   **Solution**: Verify your sender email in SendGrid dashboard

#### "Rate Limit Exceeded"

-   **Cause**: Free tier limit (100 emails/day) exceeded
-   **Solution**: Upgrade your SendGrid plan or wait 24 hours

### Twilio Issues

#### "Authentication Failed"

-   **Cause**: Invalid Account SID or Auth Token
-   **Solution**: Verify credentials in Twilio Console

#### "Phone Number Not Verified" (Trial Account)

-   **Cause**: Trying to send to an unverified number on trial account
-   **Solution**: Verify the recipient number in Twilio Console

#### "Invalid Phone Number Format"

-   **Cause**: Phone number not in E.164 format
-   **Solution**: Use format `+[country code][number]` (e.g., `+12345678901`)

#### "Insufficient Funds"

-   **Cause**: Trial credit exhausted or no payment method
-   **Solution**: Add a payment method or upgrade account

### General Issues

#### Services Not Initializing

-   **Cause**: Missing environment variables
-   **Solution**: Check that all required variables are set in `.env`

#### Fallback to Mock Service

-   **Cause**: Service initialization failed
-   **Solution**: Check server logs for specific error messages

---

## Service Architecture

### Email Service Factory

The email service uses a factory pattern that selects the appropriate provider:

1. **Production/Staging**: Resend (if `RESEND_API_KEY` is set) - **Primary**
2. **Fallback**: SendGrid (if `SENDGRID_API_KEY` is set)
3. **Staging Fallback**: Mailtrap (if `MAILTRAP_API_TOKEN` is set)
4. **Development**: Local/Mock service (logs to console)

### SMS Service Factory

The SMS service uses a factory pattern that selects the appropriate provider:

1. **Production/Staging**: Twilio (if `TWILIO_ACCOUNT_SID` is set)
2. **Development**: Mock service (logs to console)

---

## Cost Considerations

### Resend Pricing (Recommended)

-   **Free Tier**: 100 emails/day, 3,000 emails/month forever
-   **Pro**: $20/month for 50,000 emails/month
-   **Business**: Custom pricing for higher volumes
-   **Benefits**: Modern API, better deliverability, easier domain setup

### SendGrid Pricing (Fallback)

-   **Free Tier**: 100 emails/day forever
-   **Essentials**: $19.95/month for 50,000 emails
-   **Pro**: $89.95/month for 100,000 emails

### Twilio Pricing

-   **Trial**: $15 credit (with limitations)
-   **SMS**: ~$0.0079 per message (US)
-   **Phone Number**: ~$1.15/month

### Recommendations

-   **Development**: Use mock services (free)
-   **Staging**: Use Resend free tier + Twilio trial
-   **Production**: Resend Pro + Twilio paid (upgrade based on volume)

---

## Next Steps

1. ✅ Set up SendGrid account and get API key
2. ✅ Set up Twilio account and get credentials
3. ✅ Configure environment variables
4. ✅ Test email sending
5. ✅ Test SMS sending
6. ✅ Monitor usage and costs
7. ✅ Upgrade plans as needed

For additional help, refer to:

-   [SendGrid Documentation](https://docs.sendgrid.com/)
-   [Twilio Documentation](https://www.twilio.com/docs)
