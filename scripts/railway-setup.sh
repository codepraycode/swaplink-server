#!/bin/bash

# Railway Deployment Setup Script
# This script helps generate secrets and prepare for Railway deployment

set -e

echo "=================================================="
echo "Railway Deployment Setup for SwapLink Server"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to generate random secret
generate_secret() {
    openssl rand -base64 32
}

echo -e "${BLUE}Generating JWT Secrets...${NC}"
JWT_SECRET=$(generate_secret)
JWT_REFRESH_SECRET=$(generate_secret)

echo ""
echo -e "${GREEN}✓ Secrets Generated!${NC}"
echo ""
echo "=================================================="
echo "Copy these to your Railway environment variables:"
echo "=================================================="
echo ""
echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo ""

# Create a temporary file with all the variables
TEMP_FILE="railway_env_vars.txt"

cat > "$TEMP_FILE" << EOF
# Railway Environment Variables
# Generated on: $(date)
# Copy these to your Railway service settings

# ============================================
# GENERATED SECRETS
# ============================================
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET

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
DATABASE_URL=\${{Postgres.DATABASE_URL}}

# ============================================
# REDIS (Auto-provided by Railway)
# ============================================
REDIS_URL=\${{Redis.REDIS_URL}}
REDIS_PORT=6379

# ============================================
# JWT CONFIGURATION
# ============================================
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# ============================================
# EMAIL CONFIGURATION (RESEND)
# ============================================
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
# STORAGE CONFIGURATION
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
# GLOBUS BANK (OPTIONAL)
# ============================================
GLOBUS_SECRET_KEY=
GLOBUS_WEBHOOK_SECRET=
GLOBUS_BASE_URL=
GLOBUS_CLIENT_ID=
EOF

echo -e "${GREEN}✓ Full environment variables saved to: ${TEMP_FILE}${NC}"
echo ""
echo "=================================================="
echo "Next Steps:"
echo "=================================================="
echo ""
echo "1. Review the generated file: ${TEMP_FILE}"
echo "2. Replace all 'REPLACE_WITH_*' values with your actual credentials"
echo "3. Copy the variables to Railway:"
echo "   - Go to your Railway project"
echo "   - Select your service"
echo "   - Go to 'Variables' tab"
echo "   - Add each variable"
echo ""
echo "4. For DATABASE_URL and REDIS_URL, use Railway's reference syntax:"
echo "   DATABASE_URL=\${{Postgres.DATABASE_URL}}"
echo "   REDIS_URL=\${{Redis.REDIS_URL}}"
echo ""
echo "5. Follow the complete guide in: RAILWAY_DEPLOYMENT.md"
echo ""
echo -e "${YELLOW}⚠ IMPORTANT: Keep ${TEMP_FILE} secure and delete it after use!${NC}"
echo ""

# Offer to install Railway CLI
echo "=================================================="
echo "Railway CLI Installation"
echo "=================================================="
echo ""
read -p "Do you want to install Railway CLI? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${BLUE}Installing Railway CLI...${NC}"
    npm install -g @railway/cli
    echo -e "${GREEN}✓ Railway CLI installed!${NC}"
    echo ""
    echo "Run 'railway login' to authenticate"
    echo "Run 'railway init' to create a new project"
    echo "Run 'railway link' to link to an existing project"
fi

echo ""
echo -e "${GREEN}Setup complete! 🚀${NC}"
echo ""
