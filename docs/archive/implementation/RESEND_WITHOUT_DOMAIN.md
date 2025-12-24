# Using Resend Without a Custom Domain

## 🎯 For Staging/Testing

You don't need a custom domain to use Resend! Here are your options:

## Option 1: Resend Testing Domain (Easiest)

Perfect for initial testing and staging.

### Setup Steps

1. **Sign up at [resend.com](https://resend.com)**

    - Use your email address
    - Verify your account

2. **Generate API Key**

    - Go to "API Keys" in dashboard
    - Click "Create API Key"
    - Name: "SwapLink Staging"
    - Permissions: "Sending access"
    - Copy the key (starts with `re_`)

3. **Configure in Render**
    ```bash
    RESEND_API_KEY=re_your_api_key_here
    FROM_EMAIL=onboarding@resend.dev
    ```

### Limitations

-   ✅ **Works immediately** - No domain setup needed
-   ✅ **Perfect for testing** - Test the email flow
-   ✅ **Free** - No cost
-   ⚠️ **Can only send to your signup email** - The email you used to create Resend account
-   ❌ **Not for production** - Cannot send to other users

### Testing Flow

1. Register with **your email** (the one used for Resend)
2. Receive OTP verification email
3. Test password reset
4. Test all email flows

This is perfect for verifying that:

-   ✅ Email service is working
-   ✅ Templates render correctly
-   ✅ Deployment is successful
-   ✅ Integration is correct

## Option 2: Add Test Recipients

If you need to test with multiple email addresses:

1. Go to Resend dashboard
2. Navigate to "Audiences"
3. Click "Add Email"
4. Add email addresses you want to test with
5. Those addresses can receive emails even without a custom domain

**Limitation:** Still limited to a small number of test emails.

## Option 3: Use a Free Subdomain

If you want to test with real users but don't have a domain yet:

### Using Vercel (Free)

1. Deploy a simple landing page to Vercel
2. You get a free subdomain: `yourproject.vercel.app`
3. Verify this subdomain with Resend
4. Use `no-reply@yourproject.vercel.app`

### Using Netlify (Free)

1. Deploy to Netlify
2. Get free subdomain: `yourproject.netlify.app`
3. Verify with Resend
4. Use `no-reply@yourproject.netlify.app`

### DNS Records for Subdomain

Add these to your DNS provider:

```
Type: TXT
Name: yourproject.vercel.app
Value: v=spf1 include:_spf.resend.com ~all

Type: TXT
Name: resend._domainkey.yourproject.vercel.app
Value: [Provided by Resend]

Type: TXT
Name: _dmarc.yourproject.vercel.app
Value: v=DMARC1; p=none
```

## Recommended Approach for Staging

**Start with Option 1 (Testing Domain):**

```bash
# In Render environment variables
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=onboarding@resend.dev
```

**Test with your own email:**

-   Register using your email
-   Verify all email flows work
-   Confirm deployment is successful

**When ready for more testing:**

-   Add test recipients in Resend dashboard
-   Or set up a free subdomain
-   Or get your custom domain

## Configuration Examples

### For Testing Domain

```bash
# .env or Render environment variables
RESEND_API_KEY=re_abc123xyz...
FROM_EMAIL=onboarding@resend.dev
```

### For Free Subdomain

```bash
# .env or Render environment variables
RESEND_API_KEY=re_abc123xyz...
FROM_EMAIL=no-reply@yourproject.vercel.app
```

### For Custom Domain (Later)

```bash
# .env or Render environment variables
RESEND_API_KEY=re_abc123xyz...
FROM_EMAIL=no-reply@yourdomain.com
```

## Email Sending Limits

### Free Tier (Testing Domain)

-   3,000 emails/month
-   100 emails/day
-   Only to verified recipients

### Free Tier (Verified Domain)

-   3,000 emails/month
-   100 emails/day
-   Can send to anyone

### Paid Plans

-   Starting at $20/month
-   50,000 emails/month
-   Higher daily limits

## Testing Checklist

-   [ ] Resend account created
-   [ ] API key generated
-   [ ] `RESEND_API_KEY` added to Render
-   [ ] `FROM_EMAIL` set to `onboarding@resend.dev`
-   [ ] Services redeployed
-   [ ] Test registration with your email
-   [ ] Verify OTP email received
-   [ ] Test password reset email
-   [ ] Check Resend dashboard for delivery status

## Troubleshooting

### "Email not delivered"

**Check:**

1. Is the recipient your signup email?
2. Is the API key correct?
3. Check Resend dashboard logs
4. Check spam folder

### "Domain not verified"

**Solution:**

-   Use `onboarding@resend.dev` for testing
-   No verification needed!

### "Rate limit exceeded"

**Solution:**

-   Free tier: 100 emails/day
-   Wait 24 hours or upgrade plan

## When to Get a Custom Domain

Get a custom domain when:

-   ✅ Ready to invite real users
-   ✅ Want professional email addresses
-   ✅ Need to send to anyone
-   ✅ Moving to production

For now, the testing domain is perfect for staging! 🚀

## Next Steps

1. **Use testing domain for now:**

    ```bash
    FROM_EMAIL=onboarding@resend.dev
    ```

2. **Test with your email**

3. **When ready, get a domain:**
    - Buy from Namecheap, Google Domains, etc.
    - Or use free subdomain from Vercel/Netlify
    - Verify with Resend
    - Update `FROM_EMAIL`

---

**For staging, you're good to go with `onboarding@resend.dev`!** No domain needed! 🎉
