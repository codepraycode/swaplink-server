/**
 * Quick demo script to show OTP logging in action
 * Run with: ts-node src/test/demo-otp-logging.ts
 */

import { smsService } from '../shared/lib/services/sms.service';
import { emailService } from '../shared/lib/services/email.service';

async function demoOtpLogging() {
    console.log('\n🎯 Demonstrating OTP Logging in Development/Test Mode\n');

    // Demo 1: SMS OTP
    console.log('1️⃣  Sending SMS OTP...\n');
    await smsService.sendOtp('+2348012345678', '123456');

    console.log('\n');

    // Demo 2: Email OTP
    console.log('2️⃣  Sending Email OTP...\n');
    await emailService.sendOtp('user@example.com', '654321');

    console.log('\n');

    // Demo 3: Password Reset
    console.log('3️⃣  Sending Password Reset Email...\n');
    await emailService.sendPasswordResetLink('user@example.com', 'reset_token_abc123xyz');

    console.log('\n✅ Demo complete! Check the logs above to see the OTP codes.\n');
}

// Run the demo
demoOtpLogging().catch(console.error);
