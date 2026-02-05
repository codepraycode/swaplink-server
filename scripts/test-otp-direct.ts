import '../src/shared/config/env.config';
import { EmailProviderFactory } from '../src/shared/lib/services/email-service/email.service';
import logger from '../src/shared/lib/utils/logger';

async function testOtpEmail() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║         Direct OTP Email Test (No Queue)              ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    try {
        // Create email provider directly (bypasses queue)
        const emailProvider = EmailProviderFactory.create();

        const testEmail = 'test@bcdees.com';
        const testName = 'John Doe';
        const testOtp = '123456';
        const testDuration = 10;

        console.log(`Test Email: ${testEmail}`);
        console.log(`Test Name: ${testName}`);
        console.log(`Test OTP: ${testOtp}`);
        console.log(`Test Duration: ${testDuration} minutes\n`);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Sending OTP Email Directly');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        await emailProvider.sendOtpEmail(testEmail, testName, testOtp, testDuration);

        console.log('\n✅ OTP Email sent successfully!');
        console.log('Check the logs above to see the OTP value in the rendered HTML\n');
    } catch (error) {
        console.error('\n❌ Error sending OTP email:', error);
        logger.error('OTP email test failed:', error);
    }
}

testOtpEmail()
    .then(() => {
        console.log('\n✅ Test completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });
