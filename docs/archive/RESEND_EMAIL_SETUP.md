# Resend Email Service Setup Guide

## Quick Start (Testing Without Domain)

Resend allows you to send emails **without verifying a domain** using their testing email address.

### Configuration

In your `.env` file:

```bash
# Use Resend's testing email (no domain verification needed)
FROM_EMAIL=onboarding@resend.dev
RESEND_API_KEY=re_your_actual_api_key_here
```

### Important Notes

-   ✅ **Works immediately** - No domain verification required
-   ✅ **Free tier** - 100 emails/day, 3,000 emails/month
-   ⚠️ **Limitation** - Can only send to verified email addresses in development
-   ⚠️ **Emails may go to spam** - Recipients should check spam folder

### Testing Email Delivery

1. **Start your server**:

    ```bash
    npm run dev
    ```

2. **Register a new user** with your email address

3. **Check your inbox** (and spam folder)

4. **Verify in Resend Dashboard**:
    - Go to https://resend.com/emails
    - Check the status of sent emails
    - View delivery logs and any errors

---

## Production Setup (With Custom Domain)

For production use with your own domain (`@swaplink.com`), you need to verify your domain.

### Step 1: Add Domain to Resend

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click **"Add Domain"**
3. Enter your domain: `swaplink.com`

### Step 2: Add DNS Records

Resend will provide you with DNS records to add to your domain:

#### Required Records:

1. **SPF Record** (TXT):

    ```
    Type: TXT
    Name: @
    Value: v=spf1 include:_spf.resend.com ~all
    ```

2. **DKIM Record** (TXT):

    ```
    Type: TXT
    Name: resend._domainkey
    Value: [Provided by Resend - unique to your domain]
    ```

3. **DMARC Record** (TXT) - Optional but recommended:
    ```
    Type: TXT
    Name: _dmarc
    Value: v=DMARC1; p=none; rua=mailto:dmarc@swaplink.com
    ```

### Step 3: Verify Domain

1. After adding DNS records, click **"Verify Domain"** in Resend dashboard
2. Verification can take a few minutes to 48 hours
3. Once verified, you'll see a green checkmark

### Step 4: Update Environment Variables

```bash
FROM_EMAIL=no-reply@swaplink.com
# or
FROM_EMAIL=noreply@swaplink.com
# or any email @swaplink.com
```

---

## Troubleshooting

### Emails Not Being Delivered

1. **Check FROM_EMAIL format**:

    - ✅ `onboarding@resend.dev` (testing)
    - ✅ `no-reply@verified-domain.com` (production with verified domain)
    - ❌ `no-reply@unverified-domain.com` (will fail)

2. **Check Resend API Key**:

    ```bash
    # Verify your API key is set
    echo $RESEND_API_KEY
    ```

3. **Check Server Logs**:

    ```bash
    # Look for Resend-related errors
    npm run dev
    # Should see: "✅ Using Resend Email Service"
    ```

4. **Check Resend Dashboard**:
    - Go to https://resend.com/emails
    - Look for failed deliveries
    - Check error messages

### Common Errors

#### Error: "Domain not verified"

**Solution**: Use `onboarding@resend.dev` for testing, or verify your domain

#### Error: "Invalid API key"

**Solution**:

1. Go to https://resend.com/api-keys
2. Generate a new API key
3. Update `RESEND_API_KEY` in `.env`

#### Emails going to spam

**Solution**:

-   For testing: This is normal with `onboarding@resend.dev`
-   For production: Verify your domain and set up SPF/DKIM/DMARC records

---

## Email Limits

### Free Tier

-   **100 emails/day**
-   **3,000 emails/month**
-   Perfect for development and testing

### Paid Plans

-   Start at $20/month for 50,000 emails
-   See https://resend.com/pricing

---

## Best Practices

1. **Development**: Use `onboarding@resend.dev`
2. **Staging**: Use verified domain with staging subdomain (e.g., `noreply@staging.swaplink.com`)
3. **Production**: Use verified domain (e.g., `noreply@swaplink.com`)

4. **Environment-specific configuration**:

    ```bash
    # .env.development
    FROM_EMAIL=onboarding@resend.dev

    # .env.production
    FROM_EMAIL=noreply@swaplink.com
    ```

---

## Additional Resources

-   [Resend Documentation](https://resend.com/docs)
-   [Resend API Reference](https://resend.com/docs/api-reference)
-   [Domain Verification Guide](https://resend.com/docs/dashboard/domains/introduction)
-   [Email Best Practices](https://resend.com/docs/knowledge-base/email-best-practices)
