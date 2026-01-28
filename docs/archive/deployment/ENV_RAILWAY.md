# Railway Environment Variables Template

# Copy these to your Railway service settings

# ============================================

# APPLICATION CONFIGURATION

# ============================================

NODE_ENV=production
STAGING=true
PORT=3000
SERVER_URL=https://your-app-name.railway.app
ENABLE_FILE_LOGGING=false

# ============================================

# DATABASE (Auto-provided by Railway)

# ============================================

# When you add PostgreSQL to your Railway project,

# use this syntax to reference it:

DATABASE_URL=${{Postgres.DATABASE_URL}}

# ============================================

# REDIS (Auto-provided by Railway)

# ============================================

# When you add Redis to your Railway project,

# use this syntax to reference it:

REDIS_URL=${{Redis.REDIS_URL}}
REDIS_PORT=6379

# ============================================

# JWT CONFIGURATION

# ============================================

# Generate secure random strings for these:

# Use: openssl rand -base64 32

JWT_SECRET=REPLACE_WITH_RANDOM_STRING
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=REPLACE_WITH_DIFFERENT_RANDOM_STRING
JWT_REFRESH_EXPIRATION=7d

# ============================================

# EMAIL CONFIGURATION (RESEND)

# ============================================

# Get API key from: https://resend.com/api-keys

SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=REPLACE_WITH_RESEND_API_KEY
EMAIL_TIMEOUT=10000
FROM_EMAIL=onboarding@swaplink.com
RESEND_API_KEY=REPLACE_WITH_RESEND_API_KEY

# ============================================

# FRONTEND CONFIGURATION

# ============================================

FRONTEND_URL=https://swaplink.app
CORS_URLS=https://swaplink.app,https://app.swaplink.com

# ============================================

# STORAGE CONFIGURATION (AWS S3 / Cloudflare R2)

# ============================================

AWS_ACCESS_KEY_ID=REPLACE_WITH_YOUR_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=REPLACE_WITH_YOUR_SECRET_KEY
AWS_REGION=us-east-1
AWS_BUCKET_NAME=swaplink-staging
AWS_ENDPOINT=REPLACE_WITH_S3_ENDPOINT

# ============================================

# SYSTEM CONFIGURATION

# ============================================

SYSTEM_USER_ID=system-wallet-user

# ============================================

# GLOBUS BANK (OPTIONAL - for payment processing)

# ============================================

# Leave these empty if not using Globus in staging

GLOBUS_SECRET_KEY=
GLOBUS_WEBHOOK_SECRET=
GLOBUS_BASE_URL=
GLOBUS_CLIENT_ID=

# ============================================

# NOTES

# ============================================

# 1. Replace all "REPLACE*WITH*\*" values

# 2. Generate JWT secrets using: openssl rand -base64 32

# 3. Get Resend API key from: https://resend.com

# 4. Configure S3/R2 bucket before deployment

# 5. Update SERVER_URL after Railway assigns your domain

# 6. Use ${{ServiceName.VARIABLE}} syntax for Railway references
