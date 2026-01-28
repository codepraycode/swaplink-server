# Email Testing Guide

## Overview

This guide explains how to test all email templates in the BCDees Global application.

## Prerequisites

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env`:

```env
# Email Service (choose one)
RESEND_API_KEY=your_resend_api_key
# OR
SENDGRID_API_KEY=your_sendgrid_api_key
# OR
MAILTRAP_API_TOKEN=your_mailtrap_token

# From email address
FROM_EMAIL=onboarding@resend.dev  # or your verified domain

# Frontend URL (for links in emails)
FRONTEND_URL=http://localhost:3000

# Test email address
TEST_EMAIL=your-test-email@example.com
```

## Running the Test Script

### Basic Usage

Run all email tests:

```bash
npm run test:emails
```

### With Custom Email

Test with a specific email address:

```bash
TEST_EMAIL=myemail@example.com npm run test:emails
```

### Expected Output

The script will test the following emails:

1. ✅ OTP Email (verification code)
2. ✅ Welcome Email
3. ✅ Password Reset Email
4. ⚠️ KYC Submitted Email (to be implemented)
5. ⚠️ KYC Success Email with Wallet Details (to be implemented)
6. ⚠️ KYC Failed Email (to be implemented)
7. ⚠️ Transaction Email (to be implemented)

## Manual Testing

### 1. Using LocalEmailService (Development)

Set `NODE_ENV=development` in your `.env` file. Emails will be logged to the console.

**Steps:**

1. Start the development server:

```bash
npm run dev
```

2. Trigger an email (e.g., register a new user)
3. Check the console output for the email content

### 2. Using Resend (Production/Staging)

**Steps:**

1. Sign up for Resend: https://resend.com
2. Get your API key from the dashboard
3. Set `RESEND_API_KEY` in `.env`
4. For testing, use `FROM_EMAIL=onboarding@resend.dev`
5. Run the test script or trigger emails through the API
6. Check your inbox for the emails

### 3. Using Mailtrap (Staging)

**Steps:**

1. Sign up for Mailtrap: https://mailtrap.io
2. Get your API token from the dashboard
3. Set `MAILTRAP_API_TOKEN` in `.env`
4. Set `STAGING=true` in `.env`
5. Run the test script or trigger emails through the API
6. Check your Mailtrap inbox for the emails

## Testing Individual Emails

### OTP Email

**Trigger:** Register a new user or request email verification

**Expected Content:**

- Subject: "Verify Your Email - BCDees Global"
- 6-digit OTP code
- "Valid for 10 minutes" message
- BCDees Global branding

**Template:** `verify-otp.hbs`

### Welcome Email

**Trigger:** Successful user registration (sent by onboarding worker)

**Expected Content:**

- Subject: "Welcome to BCDees Global!"
- Welcome message
- "Get Started" button linking to login page
- BCDees Global branding

**Template:** `welcome.hbs`

### Password Reset Email

**Trigger:** Request password reset

**Expected Content:**

- Subject: "Password Reset Request - BCDees Global"
- Reset password link
- Link expiration time (30 minutes)
- BCDees Global branding

**Template:** `password-reset.hbs`

### KYC Status Emails

**Trigger:** KYC submission, approval, or rejection

**Expected Content (Submitted):**

- Subject: "Your KYC Status - BCDees Global"
- "Documents received" message
- "Review in progress" message

**Expected Content (Success):**

- Subject: "Your KYC Status - BCDees Global"
- "Congratulations! 🎉" message
- Wallet details (account number, account name, bank name)
- "Go to Dashboard" button

**Expected Content (Failed):**

- Subject: "Your KYC Status - BCDees Global"
- "Action Required ⚠️" message
- Rejection reason
- "Retry KYC" button

**Template:** `kyc-status.hbs`

### Transaction Email

**Trigger:** Deposit, withdrawal, or transfer

**Expected Content:**

- Subject: "Transaction Alert - BCDees Global"
- Transaction type (CREDIT/DEBIT)
- Amount and currency
- Date and time
- Description
- Reference number
- BCDees Global branding

**Template:** `transaction.hbs`

## Troubleshooting

### Email not received

1. **Check spam folder**: Emails might be filtered as spam
2. **Verify FROM_EMAIL**: Ensure the domain is verified in Resend/SendGrid
3. **Check logs**: Look for error messages in the console
4. **Test with LocalEmailService**: Set `NODE_ENV=development` to see console output

### Template rendering failed

1. **Check template files**: Ensure all `.hbs` files exist in `src/templates/emails/`
2. **Check template data**: Ensure all required data is passed to the template
3. **Check logs**: Look for template rendering errors in the console
4. **Fallback HTML**: Some emails have fallback HTML if template rendering fails

### Email service not initialized

1. **Check environment variables**: Ensure API keys are set correctly
2. **Check service priority**: Resend > SendGrid > Mailtrap > Local
3. **Check logs**: Look for email service initialization messages

## Email Template Development

### Editing Templates

1. Templates are located in `src/templates/emails/`
2. Layout is in `src/templates/emails/layouts/base.hbs`
3. Edit templates using Handlebars syntax
4. In development, templates are not cached (changes take effect immediately)
5. In production, templates are cached (restart server to see changes)

### Testing Template Changes

1. Edit the template file
2. Run the test script: `npm run test:emails`
3. Check the console output or inbox for the updated email
4. Iterate until satisfied

### Template Variables

Each template has access to:

- `title`: Email title (shown in header)
- `name`: User's name
- `year`: Current year (for footer)
- Template-specific variables (see template files)

## Best Practices

1. **Always test emails before deploying**: Use the test script or manual testing
2. **Test in multiple email clients**: Gmail, Outlook, Apple Mail, etc.
3. **Check mobile rendering**: Emails should be responsive
4. **Verify links**: Ensure all links work correctly
5. **Check branding**: Ensure BCDees Global branding is consistent
6. **Test error cases**: Test with missing data, invalid data, etc.

## Next Steps

After testing emails:

1. Update templates as needed
2. Implement remaining email types (KYC, transaction)
3. Add email queue and worker for async sending
4. Add audit logging for email failures
5. Monitor email delivery rates
