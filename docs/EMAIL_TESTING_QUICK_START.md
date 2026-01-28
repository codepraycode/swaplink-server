# 📧 Email Testing - Quick Start Guide

## ✅ What's Been Implemented

1. **Template Renderer Service** - Renders Handlebars templates with caching
2. **Email Type Definitions** - Type-safe interfaces for all email data
3. **Updated Email Services** - Resend service now uses templates
4. **Automated Test Script** - Test all emails with one command
5. **Testing Documentation** - Comprehensive guide in `docs/EMAIL_TESTING_GUIDE.md`

---

## 🚀 How to Test Emails

### Option 1: Automated Test Script (Recommended)

Run all email tests at once:

```bash
npm run test:emails
```

This will test:

- ✅ OTP Email (verification code)
- ✅ Welcome Email
- ✅ Password Reset Email
- ⚠️ KYC Status Emails (to be implemented after queue/worker setup)
- ⚠️ Transaction Emails (to be implemented after queue/worker setup)

**Output**: Emails will be logged to console (LocalEmailService in development mode)

---

### Option 2: Manual Testing via API

1. **Start the server**:

```bash
npm run dev
```

2. **Trigger emails through API**:
    - Register a user → OTP email sent
    - Complete registration → Welcome email sent (via onboarding worker)
    - Request password reset → Password reset email sent

3. **Check console** for email output

---

## 📋 Testing Checklist

### Before Testing

- [ ] Ensure `handlebars` is installed (already in package.json)
- [ ] Check `.env` file has `FROM_EMAIL` configured
- [ ] Check `.env` file has `FRONTEND_URL` configured

### Run Tests

- [ ] Run `npm run test:emails`
- [ ] Verify OTP email renders correctly
- [ ] Verify Welcome email renders correctly
- [ ] Verify Password Reset email renders correctly

### Verify Email Content

- [ ] Check BCDees Global branding (logo, colors, footer)
- [ ] Check all links work correctly
- [ ] Check email layout is responsive
- [ ] Check all dynamic data is populated correctly

---

## 🔧 Configuration

### Environment Variables

```env
# Email Service (LocalEmailService in development)
NODE_ENV=development

# From email (for production/staging with Resend)
FROM_EMAIL=onboarding@resend.dev

# Frontend URL (for links in emails)
FRONTEND_URL=http://localhost:3000

# Test email address (optional)
TEST_EMAIL=test@example.com
```

---

## 📁 Files Created/Modified

### New Files

1. `src/shared/lib/services/email-service/template-renderer.service.ts` - Template renderer
2. `src/shared/lib/services/email-service/email.types.ts` - Type definitions
3. `scripts/test-emails.ts` - Automated test script
4. `docs/EMAIL_TESTING_GUIDE.md` - Comprehensive testing guide

### Modified Files

1. `src/shared/lib/services/email-service/base-email.service.ts` - Added new methods
2. `src/shared/lib/services/email-service/resend-email.service.ts` - Uses templates now
3. `package.json` - Added `test:emails` script

---

## 🎨 Email Templates

All templates are in `src/templates/emails/`:

| Template       | File                 | Status                 |
| -------------- | -------------------- | ---------------------- |
| OTP Email      | `verify-otp.hbs`     | ✅ Working             |
| Welcome Email  | `welcome.hbs`        | ✅ Working             |
| Password Reset | `password-reset.hbs` | ✅ Working             |
| KYC Status     | `kyc-status.hbs`     | ✅ Ready (needs queue) |
| Transaction    | `transaction.hbs`    | ✅ Ready (needs queue) |

**Base Layout**: `layouts/base.hbs` - Used by all templates

---

## 🐛 Troubleshooting

### "Template not found" error

- Check that template files exist in `src/templates/emails/`
- Check file names match exactly (case-sensitive)

### "Cannot find module 'handlebars'"

- Run: `npm install` (handlebars already in package.json)

### Emails not showing in console

- Check `NODE_ENV=development` in `.env`
- Check LocalEmailService is being used (see startup logs)

### Template rendering failed

- Check template syntax (Handlebars)
- Check all required data is passed
- Fallback HTML will be used if template fails

---

## 📝 Next Steps

### Phase 1: Current (Template Integration) ✅

- [x] Create template renderer service
- [x] Update email services to use templates
- [x] Create automated test script
- [x] Test OTP, Welcome, Password Reset emails

### Phase 2: Email Queue & Worker (Next)

- [ ] Create email queue
- [ ] Create email worker with audit logging
- [ ] Create email helper service
- [ ] Integrate with auth service (OTP, welcome)
- [ ] Integrate with KYC worker (status emails with wallet details)
- [ ] Integrate with onboarding worker (welcome email)

### Phase 3: Testing & Verification

- [ ] Test complete email flow (registration → KYC → wallet)
- [ ] Test email retry logic
- [ ] Verify audit logs
- [ ] Test with real email service (Resend/Mailtrap)

---

## 📚 Documentation

- **Full Testing Guide**: `docs/EMAIL_TESTING_GUIDE.md`
- **Implementation Plan**: `brain/implementation_plan.md`
- **Task Checklist**: `brain/task.md`

---

## 💡 Tips

1. **Development**: Use LocalEmailService (logs to console)
2. **Staging**: Use Mailtrap (test inbox)
3. **Production**: Use Resend (real emails)

4. **Template Changes**: In development, changes take effect immediately (no cache)
5. **Production**: Templates are cached, restart server to see changes

6. **Test Early**: Run `npm run test:emails` after any template changes
7. **Check Logs**: Always check console output for errors

---

**Ready to test?** Run: `npm run test:emails`
