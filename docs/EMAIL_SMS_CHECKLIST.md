# Email & SMS Service Setup Checklist

Use this checklist to set up SendGrid and Twilio services for your SwapLink backend.

## ✅ Pre-Setup

-   [ ] Read the [Complete Setup Guide](./docs/EMAIL_SMS_SETUP.md)
-   [ ] Read the [Quick Start Guide](./docs/EMAIL_SMS_QUICKSTART.md)
-   [ ] Decide on your environment (Development, Staging, or Production)

---

## 📧 SendGrid Email Service Setup

### Account Creation

-   [ ] Go to https://sendgrid.com/
-   [ ] Sign up for an account (free tier: 100 emails/day)
-   [ ] Verify your email address

### API Key Generation

-   [ ] Log in to SendGrid dashboard
-   [ ] Navigate to **Settings** → **API Keys**
-   [ ] Click **Create API Key**
-   [ ] Select **Full Access** or **Restricted Access** (with Mail Send permission)
-   [ ] Name your key (e.g., "SwapLink Production")
-   [ ] Copy the API key (save it securely - you won't see it again!)

### Sender Verification

#### Option 1: Single Sender Verification (Easier, Good for Testing)

-   [ ] Go to **Settings** → **Sender Authentication**
-   [ ] Click **Verify a Single Sender**
-   [ ] Fill in your details (use the email you want to send from)
-   [ ] Check your email and click the verification link
-   [ ] Wait for verification confirmation

#### Option 2: Domain Authentication (Recommended for Production)

-   [ ] Go to **Settings** → **Sender Authentication**
-   [ ] Click **Authenticate Your Domain**
-   [ ] Follow the DNS setup instructions
-   [ ] Add the provided DNS records to your domain registrar
-   [ ] Wait for verification (can take up to 48 hours)
-   [ ] Verify the domain is authenticated

### Environment Configuration

-   [ ] Add `SENDGRID_API_KEY` to your `.env` file
-   [ ] Add `FROM_EMAIL` to your `.env` file (must match verified email/domain)
-   [ ] Verify the values are correct (no extra spaces)

---

## 📱 Twilio SMS Service Setup

### Account Creation

-   [ ] Go to https://www.twilio.com/
-   [ ] Sign up for a trial account
-   [ ] Verify your email address
-   [ ] Verify your phone number

### Get Credentials

-   [ ] Log in to [Twilio Console](https://console.twilio.com/)
-   [ ] Locate **Account SID** on the dashboard
-   [ ] Click to reveal **Auth Token** on the dashboard
-   [ ] Copy both values (save them securely)

### Get Phone Number

-   [ ] In Twilio Console, go to **Phone Numbers** → **Manage** → **Buy a number**
-   [ ] Choose a phone number with SMS capabilities
-   [ ] Purchase the number (uses trial credit)
-   [ ] Copy the phone number (in E.164 format: +1234567890)

### Verify Test Numbers (Trial Account Only)

-   [ ] Go to **Phone Numbers** → **Manage** → **Verified Caller IDs**
-   [ ] Click **Add a new Caller ID**
-   [ ] Enter test phone numbers you want to send SMS to
-   [ ] Verify each number via SMS or call
-   [ ] Wait for verification confirmation

### Environment Configuration

-   [ ] Add `TWILIO_ACCOUNT_SID` to your `.env` file
-   [ ] Add `TWILIO_AUTH_TOKEN` to your `.env` file
-   [ ] Add `TWILIO_PHONE_NUMBER` to your `.env` file (in E.164 format)
-   [ ] Verify the values are correct (no extra spaces)

---

## 🔧 Backend Configuration

### Environment Variables

-   [ ] Open your `.env` file
-   [ ] Verify all required variables are set:

    ```bash
    # SendGrid
    SENDGRID_API_KEY=SG.your_actual_key_here
    FROM_EMAIL=noreply@yourdomain.com

    # Twilio
    TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    TWILIO_AUTH_TOKEN=your_actual_token_here
    TWILIO_PHONE_NUMBER=+1234567890
    ```

-   [ ] Save the `.env` file

### For Staging Environment

-   [ ] Set `NODE_ENV=production`
-   [ ] Set `STAGING=true`
-   [ ] Verify all credentials are for staging accounts

### For Production Environment

-   [ ] Set `NODE_ENV=production`
-   [ ] Remove or set `STAGING=false`
-   [ ] Verify all credentials are for production accounts
-   [ ] Consider upgrading to paid plans

---

## 🧪 Testing

### Start the Server

-   [ ] Run `pnpm run dev` (or appropriate command)
-   [ ] Check server logs for initialization messages:
    ```
    🧪 Staging mode: Initializing SendGrid Email Service
    ✅ Using SendGrid Email Service (Staging)
    🚀 Initializing Twilio SMS Service
    ✅ Using Twilio SMS Service
    ```
-   [ ] Verify no error messages appear

### Test Email Service

-   [ ] Trigger an email-sending action (e.g., user registration)
-   [ ] Check SendGrid dashboard for email activity
-   [ ] Verify email was received in inbox
-   [ ] Check spam folder if not received
-   [ ] Review server logs for any errors

### Test SMS Service

-   [ ] Trigger an SMS-sending action (e.g., phone verification)
-   [ ] Check Twilio dashboard for SMS logs
-   [ ] Verify SMS was received on phone
-   [ ] Review server logs for any errors

### Run Unit Tests

-   [ ] Run `pnpm test:unit src/shared/lib/services/__tests__/sms.service.unit.test.ts`
-   [ ] Verify all tests pass
-   [ ] Check for any warnings or errors

---

## 🔍 Verification

### SendGrid Verification

-   [ ] Log in to SendGrid dashboard
-   [ ] Go to **Activity** → **Email Activity**
-   [ ] Verify test emails appear in the list
-   [ ] Check delivery status (Delivered/Bounced/Dropped)
-   [ ] Review any error messages

### Twilio Verification

-   [ ] Log in to Twilio Console
-   [ ] Go to **Monitor** → **Logs** → **Messaging**
-   [ ] Verify test SMS appear in the list
-   [ ] Check delivery status (Delivered/Failed/Undelivered)
-   [ ] Review any error messages

### Server Logs

-   [ ] Review server logs for service initialization
-   [ ] Check for any error or warning messages
-   [ ] Verify services are using correct providers (not fallbacks)

---

## 🚀 Production Readiness

### SendGrid Production Checklist

-   [ ] Upgrade from free tier if needed (based on volume)
-   [ ] Set up domain authentication (not single sender)
-   [ ] Configure SPF, DKIM, and DMARC records
-   [ ] Set up email templates (optional)
-   [ ] Configure webhook for bounce/spam tracking (optional)
-   [ ] Set up monitoring and alerts

### Twilio Production Checklist

-   [ ] Upgrade from trial account
-   [ ] Add payment method
-   [ ] Remove verified number restrictions
-   [ ] Consider getting a dedicated phone number
-   [ ] Set up usage alerts
-   [ ] Configure webhook for delivery status (optional)
-   [ ] Set up monitoring and alerts

### Backend Production Checklist

-   [ ] Set `NODE_ENV=production`
-   [ ] Remove or set `STAGING=false`
-   [ ] Use production credentials (not staging/test)
-   [ ] Enable error monitoring (Sentry, etc.)
-   [ ] Set up logging and monitoring
-   [ ] Configure rate limiting
-   [ ] Test failover scenarios

---

## 📊 Monitoring & Maintenance

### Daily Checks

-   [ ] Monitor email delivery rates in SendGrid
-   [ ] Monitor SMS delivery rates in Twilio
-   [ ] Check for any failed deliveries
-   [ ] Review error logs

### Weekly Checks

-   [ ] Review usage and costs
-   [ ] Check for any service degradation
-   [ ] Update credentials if needed (rotation)
-   [ ] Review and optimize email/SMS templates

### Monthly Checks

-   [ ] Review total costs vs. budget
-   [ ] Analyze delivery metrics
-   [ ] Consider plan upgrades/downgrades
-   [ ] Update documentation if needed

---

## 🆘 Troubleshooting

If you encounter issues, refer to:

-   [ ] [Troubleshooting Section](./docs/EMAIL_SMS_SETUP.md#troubleshooting) in the setup guide
-   [ ] Server logs for specific error messages
-   [ ] SendGrid Activity logs
-   [ ] Twilio Messaging logs
-   [ ] [SendGrid Documentation](https://docs.sendgrid.com/)
-   [ ] [Twilio Documentation](https://www.twilio.com/docs)

---

## ✅ Completion

-   [ ] All services are configured and tested
-   [ ] Documentation is updated
-   [ ] Team members are informed
-   [ ] Monitoring is in place
-   [ ] Production deployment is complete

**Congratulations! Your email and SMS services are ready to use! 🎉**

---

**Last Updated**: 2026-01-02
**Status**: Ready for Production
