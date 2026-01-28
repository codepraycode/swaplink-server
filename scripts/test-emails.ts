/**
 * Email Testing Script
 *
 * This script tests all email templates by sending them to a test email address.
 * It uses the LocalEmailService by default (logs to console) but can be configured
 * to use any email service.
 *
 * Usage:
 *   npm run test:emails
 *   npm run test:emails -- --email=test@example.com
 *   npm run test:emails -- --service=resend
 */

import { emailService } from '../src/shared/lib/services/email-service/email.service';
import logger from '../src/shared/lib/utils/logger';

// Test data
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@bcdees.com';
const TEST_NAME = 'John Doe';
const TEST_OTP = '123456';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
};

async function testOtpEmail() {
    console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.blue}📧 Testing OTP Email${colors.reset}`);
    console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

    try {
        await emailService.sendVerificationEmail(TEST_EMAIL, TEST_OTP);
        console.log(`${colors.green}✅ OTP Email sent successfully${colors.reset}`);
    } catch (error) {
        console.error(`${colors.red}❌ OTP Email failed:${colors.reset}`, error);
    }
}

async function testWelcomeEmail() {
    console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.blue}📧 Testing Welcome Email${colors.reset}`);
    console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

    try {
        await emailService.sendWelcomeEmail(TEST_EMAIL, TEST_NAME);
        console.log(`${colors.green}✅ Welcome Email sent successfully${colors.reset}`);
    } catch (error) {
        console.error(`${colors.red}❌ Welcome Email failed:${colors.reset}`, error);
    }
}

async function testPasswordResetEmail() {
    console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.blue}📧 Testing Password Reset Email${colors.reset}`);
    console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

    try {
        const resetToken = 'test-reset-token-123456';
        await emailService.sendPasswordResetLink(TEST_EMAIL, resetToken);
        console.log(`${colors.green}✅ Password Reset Email sent successfully${colors.reset}`);
    } catch (error) {
        console.error(`${colors.red}❌ Password Reset Email failed:${colors.reset}`, error);
    }
}

async function testKycSubmittedEmail() {
    console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.blue}📧 Testing KYC Submitted Email${colors.reset}`);
    console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

    try {
        // This will be implemented after we create the new email methods
        console.log(`${colors.yellow}⚠️  KYC Submitted Email - To be implemented${colors.reset}`);
    } catch (error) {
        console.error(`${colors.red}❌ KYC Submitted Email failed:${colors.reset}`, error);
    }
}

async function testKycSuccessEmail() {
    console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.blue}📧 Testing KYC Success Email (with Wallet Details)${colors.reset}`);
    console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

    try {
        // This will be implemented after we create the new email methods
        console.log(`${colors.yellow}⚠️  KYC Success Email - To be implemented${colors.reset}`);
        console.log(`${colors.yellow}    Will include wallet details:${colors.reset}`);
        console.log(`${colors.yellow}    - Account Number: 1234567890${colors.reset}`);
        console.log(`${colors.yellow}    - Account Name: ${TEST_NAME}${colors.reset}`);
        console.log(`${colors.yellow}    - Bank Name: Globus Bank${colors.reset}`);
    } catch (error) {
        console.error(`${colors.red}❌ KYC Success Email failed:${colors.reset}`, error);
    }
}

async function testKycFailedEmail() {
    console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.blue}📧 Testing KYC Failed Email${colors.reset}`);
    console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

    try {
        // This will be implemented after we create the new email methods
        console.log(`${colors.yellow}⚠️  KYC Failed Email - To be implemented${colors.reset}`);
        console.log(`${colors.yellow}    Reason: Document not clear enough${colors.reset}`);
    } catch (error) {
        console.error(`${colors.red}❌ KYC Failed Email failed:${colors.reset}`, error);
    }
}

async function testTransactionEmail() {
    console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.blue}📧 Testing Transaction Email${colors.reset}`);
    console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

    try {
        // This will be implemented after we create the new email methods
        console.log(`${colors.yellow}⚠️  Transaction Email - To be implemented${colors.reset}`);
        console.log(`${colors.yellow}    Type: CREDIT${colors.reset}`);
        console.log(`${colors.yellow}    Amount: NGN 50,000.00${colors.reset}`);
        console.log(`${colors.yellow}    Reference: TXN-123456789${colors.reset}`);
    } catch (error) {
        console.error(`${colors.red}❌ Transaction Email failed:${colors.reset}`, error);
    }
}

async function runAllTests() {
    console.log(
        `\n${colors.green}╔════════════════════════════════════════════════════════╗${colors.reset}`
    );
    console.log(
        `${colors.green}║         BCDees Global - Email Testing Suite           ║${colors.reset}`
    );
    console.log(
        `${colors.green}╚════════════════════════════════════════════════════════╝${colors.reset}`
    );
    console.log(`\n${colors.yellow}Test Email:${colors.reset} ${TEST_EMAIL}`);
    console.log(`${colors.yellow}Test Name:${colors.reset} ${TEST_NAME}`);
    console.log(`${colors.yellow}Email Service:${colors.reset} ${emailService.constructor.name}`);

    // Run all tests
    await testOtpEmail();
    await testWelcomeEmail();
    await testPasswordResetEmail();
    await testKycSubmittedEmail();
    await testKycSuccessEmail();
    await testKycFailedEmail();
    await testTransactionEmail();

    console.log(`\n${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.green}✅ Email Testing Complete${colors.reset}`);
    console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    console.log(`${colors.blue}📝 Notes:${colors.reset}`);
    console.log(`   - Check console output above for email content`);
    console.log(`   - If using LocalEmailService, emails are logged to console`);
    console.log(`   - If using Resend/SendGrid/Mailtrap, check your inbox`);
    console.log(
        `   - Some emails marked as "To be implemented" will work after template integration\n`
    );
}

// Run tests
runAllTests()
    .then(() => {
        console.log(`${colors.green}Exiting...${colors.reset}`);
        process.exit(0);
    })
    .catch(error => {
        console.error(`${colors.red}Test suite failed:${colors.reset}`, error);
        process.exit(1);
    });
