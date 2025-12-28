# 🎉 SwapLink Server - Staging Deployment Ready!

## ✅ What's Been Done

Your SwapLink server is now ready for deployment to Render in **staging mode** - no Globus Bank credentials required!

### 🌟 Key Achievement: Staging Mode

You can now deploy to production infrastructure (Render) without having Globus Bank credentials. Perfect for:

-   Testing the deployment process
-   Verifying email integration with Resend
-   Developing features before payment integration
-   Demo and preview environments

## 📦 What Was Implemented

### 1. **Staging Mode Support**

-   ✅ Added `STAGING` environment variable
-   ✅ Modified validation to skip Globus credentials in staging
-   ✅ Configured `render.yaml` with `STAGING=true`
-   ✅ All services work except actual payment processing

### 2. **Resend Email Integration**

-   ✅ Installed `resend` package
-   ✅ Created production-ready email service
-   ✅ Beautiful HTML email templates (OTP, password reset, welcome)
-   ✅ Auto-selects Resend in production, mock in development

### 3. **Render Deployment**

-   ✅ Complete `render.yaml` blueprint
-   ✅ API Server, Worker, PostgreSQL, Redis configured
-   ✅ Environment variables pre-configured
-   ✅ Health checks and auto-deploy enabled

### 4. **Documentation**

-   ✅ **STAGING_DEPLOYMENT.md** - Staging-specific guide (⭐ Start here!)
-   ✅ **RENDER_DEPLOYMENT.md** - Full production guide
-   ✅ **ENV_VARIABLES.md** - All variables explained
-   ✅ **DEPLOYMENT_CHECKLIST.md** - Step-by-step checklist
-   ✅ **DEPLOYMENT_SUMMARY.md** - Quick reference
-   ✅ Updated **README.md** with deployment info
-   ✅ Health check script

## 🚀 How to Deploy (3 Simple Steps)

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Deploy to Render staging"
git push origin main
```

### Step 2: Deploy on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Blueprint"
3. Connect your repository
4. Render auto-deploys everything!

### Step 3: Configure Resend

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain
3. Generate API key
4. Add `RESEND_API_KEY` to Render

**That's it!** No Globus credentials needed! 🎉

## 📧 What You Need

### Required (Staging Mode)

-   ✅ **Resend API Key** - For email service
    -   Sign up at [resend.com](https://resend.com)
    -   Verify your domain
    -   Generate API key
    -   Free tier: 3,000 emails/month

### Optional

-   ⚪ **AWS/R2 Credentials** - For file uploads
    -   Can skip if not testing file uploads

### NOT Required (Staging Mode)

-   ❌ ~~Globus Bank credentials~~ - Mocked in staging
-   ❌ ~~Payment processing setup~~ - Not needed yet

## 🎯 What Works in Staging

### ✅ Fully Functional

-   User registration and authentication
-   Email verification (via Resend)
-   Phone verification
-   Wallet creation
-   Internal transfers
-   P2P ad creation
-   P2P order flow
-   Chat functionality
-   Admin features
-   File uploads (if AWS/R2 configured)

### 🔄 Mocked (For Testing)

-   Virtual account funding
-   External bank withdrawals
-   Real payment processing
-   Globus Bank webhooks

## 📚 Documentation Guide

**Start here based on your goal:**

1. **Want to deploy to staging?**
   → [STAGING_DEPLOYMENT.md](./STAGING_DEPLOYMENT.md) ⭐

2. **Want full production with payments?**
   → [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)

3. **Need environment variable reference?**
   → [ENV_VARIABLES.md](./ENV_VARIABLES.md)

4. **Want a step-by-step checklist?**
   → [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

5. **Quick overview?**
   → [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)

## 🔄 Upgrading to Production Later

When you get Globus Bank credentials:

1. Add credentials to Render environment variables:

    - `GLOBUS_SECRET_KEY`
    - `GLOBUS_WEBHOOK_SECRET`
    - `GLOBUS_BASE_URL`
    - `GLOBUS_CLIENT_ID`

2. Set `STAGING=false` (or remove it)

3. Redeploy

That's it! Payment processing will be enabled.

## 💰 Cost

**Staging deployment is FREE!**

All services on Render free tier:

-   API Server: Free (750 hours/month)
-   Worker: Free (750 hours/month)
-   PostgreSQL: Free
-   Redis: Free
-   Resend: Free (3,000 emails/month)

**Total: $0/month**

## ✅ Verification

After deployment, verify:

```bash
# Check health
curl https://swaplink-api-staging.onrender.com/api/v1/health

# Or use the script
./scripts/health-check.sh https://swaplink-api-staging.onrender.com
```

Expected logs:

```
✅ Using Resend Email Service for production
ℹ️ Running in STAGING mode - Globus Bank API mocked
```

## 🎯 Next Steps

1. **Deploy to Staging**

    - Follow [STAGING_DEPLOYMENT.md](./STAGING_DEPLOYMENT.md)
    - Only need Resend API key!

2. **Test Everything**

    - User registration
    - Email verification
    - All features except payments

3. **When Ready for Production**
    - Get Globus Bank credentials
    - Update environment variables
    - Set `STAGING=false`
    - Enable real payments

## 📁 New Files

```
swaplink-server/
├── src/shared/lib/services/
│   └── resend-email.service.ts          # Production email service
├── scripts/
│   └── health-check.sh                   # Deployment verification
├── render.yaml                           # Render blueprint (with STAGING=true)
├── STAGING_DEPLOYMENT.md                 # ⭐ Staging guide (start here!)
├── RENDER_DEPLOYMENT.md                  # Full production guide
├── ENV_VARIABLES.md                      # Environment variables
├── DEPLOYMENT_CHECKLIST.md               # Step-by-step checklist
└── DEPLOYMENT_SUMMARY.md                 # Quick reference
```

## 🔧 Modified Files

```
swaplink-server/
├── src/shared/
│   ├── config/env.config.ts             # Added STAGING support
│   └── lib/services/email.service.ts    # Auto-select email service
├── .env.example                          # Added Resend config
├── package.json                          # Added start:worker script
└── README.md                             # Added deployment section
```

## 🆘 Need Help?

1. **Staging deployment:** [STAGING_DEPLOYMENT.md](./STAGING_DEPLOYMENT.md)
2. **Troubleshooting:** Check service logs in Render dashboard
3. **Email issues:** Check Resend dashboard
4. **Environment variables:** [ENV_VARIABLES.md](./ENV_VARIABLES.md)

---

## 🎉 You're Ready!

Your server is configured for staging deployment. You only need:

1. ✅ GitHub repository (you have this)
2. ✅ Render account (free)
3. ✅ Resend account (free)

**No Globus credentials needed for staging!**

Follow [STAGING_DEPLOYMENT.md](./STAGING_DEPLOYMENT.md) to deploy now! 🚀

---

**Questions?** All the answers are in the documentation files listed above!
