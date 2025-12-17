# 🚀 Quick Start - Staging Deployment

## Deploy in 3 Steps (No Globus Credentials Needed!)

### 1️⃣ Push to GitHub

```bash
git add .
git commit -m "Deploy to Render staging"
git push origin main
```

### 2️⃣ Deploy on Render

1. Go to https://dashboard.render.com
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Wait for auto-deployment ⏳

### 3️⃣ Configure Resend

1. Sign up at https://resend.com
2. Verify your domain (add DNS records)
3. Generate API key
4. In Render dashboard, add: `RESEND_API_KEY=re_your_key_here`

## ✅ That's It!

Your staging environment is live with:

-   ✅ Production infrastructure (Render)
-   ✅ Real email delivery (Resend)
-   ✅ All features except payment processing
-   ✅ $0/month cost

## 📧 Resend DNS Records

Add these to your domain:

```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all

Type: TXT
Name: resend._domainkey
Value: [Get from Resend dashboard]

Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none
```

## 🔍 Verify Deployment

```bash
curl https://swaplink-api-staging.onrender.com/api/v1/health
```

Should return:

```json
{ "status": "ok", "environment": "production" }
```

## 📚 Full Guides

-   **Staging:** [STAGING_DEPLOYMENT.md](./STAGING_DEPLOYMENT.md)
-   **Production:** [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)
-   **Variables:** [ENV_VARIABLES.md](./ENV_VARIABLES.md)

## 🎯 What Works

✅ User registration & auth
✅ Email verification
✅ Wallet operations
✅ Internal transfers
✅ P2P features
✅ Chat
✅ Admin features

❌ Real payments (mocked in staging)

## 🔄 Upgrade to Production Later

When you get Globus credentials:

1. Add Globus env vars in Render
2. Set `STAGING=false`
3. Redeploy

Done! 🎉

---

**Need help?** See [STAGING_DEPLOYMENT.md](./STAGING_DEPLOYMENT.md)
