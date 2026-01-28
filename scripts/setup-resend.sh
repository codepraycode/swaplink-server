#!/bin/bash

# Resend Email Service Quick Setup Script
# This script helps you configure Resend for email delivery

echo "🚀 Resend Email Service Setup"
echo "=============================="
echo ""

# Check if RESEND_API_KEY is already set
CURRENT_KEY=$(grep "^RESEND_API_KEY=" .env | cut -d'=' -f2)

if [ "$CURRENT_KEY" = "re_your_resend_api_key_here" ] || [ -z "$CURRENT_KEY" ]; then
    echo "❌ RESEND_API_KEY is not configured"
    echo ""
    echo "📋 To get your Resend API key:"
    echo "   1. Go to https://resend.com/signup (create account if needed)"
    echo "   2. Navigate to https://resend.com/api-keys"
    echo "   3. Click 'Create API Key'"
    echo "   4. Copy the API key (starts with 're_')"
    echo ""
    echo "💡 Then run:"
    echo "   sed -i 's/RESEND_API_KEY=.*/RESEND_API_KEY=YOUR_ACTUAL_KEY_HERE/' .env"
    echo ""
else
    echo "✅ RESEND_API_KEY is configured"
    echo "   Key: ${CURRENT_KEY:0:10}..."
    echo ""
fi

# Check FROM_EMAIL configuration
FROM_EMAIL=$(grep "^FROM_EMAIL=" .env | cut -d'=' -f2)

echo "📧 FROM_EMAIL Configuration:"
echo "   Current: $FROM_EMAIL"
echo ""

if [[ "$FROM_EMAIL" == *"@resend.dev" ]]; then
    echo "✅ Using Resend testing email (no domain verification needed)"
    echo "   This is perfect for development and testing!"
else
    echo "⚠️  Using custom domain: $FROM_EMAIL"
    echo ""
    echo "   To use this email, you must:"
    echo "   1. Go to https://resend.com/domains"
    echo "   2. Add and verify your domain"
    echo "   3. Add DNS records (SPF, DKIM, DMARC)"
    echo ""
    echo "   OR for quick testing, use:"
    echo "   sed -i 's/FROM_EMAIL=.*/FROM_EMAIL=onboarding@resend.dev/' .env"
    echo ""
fi

echo "=============================="
echo ""
echo "📚 For detailed setup instructions, see:"
echo "   docs/RESEND_EMAIL_SETUP.md"
echo ""
