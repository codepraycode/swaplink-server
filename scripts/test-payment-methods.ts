/**
 * Manual Test Script for Payment Method Service
 *
 * Run this to test the updated payment method validation logic
 */

import { P2PPaymentMethodService } from '../src/api/modules/p2p/payment-method/p2p-payment-method.service';

async function testPaymentMethods() {
    console.log('🧪 Testing Payment Method Service\n');

    const testUserId = 'test-user-123';

    // Test 1: CAD with valid email
    console.log('Test 1: CAD Payment Method (Interac)');
    try {
        const cadMethod = await P2PPaymentMethodService.createPaymentMethod(testUserId, {
            currency: 'CAD',
            accountName: 'John Doe',
            email: 'john.interac@example.com',
            isPrimary: true,
        });
        console.log('✅ PASS - CAD method created:', {
            currency: cadMethod.currency,
            bankName: cadMethod.bankName,
            accountName: cadMethod.accountName,
            email: (cadMethod.details as any)?.email,
        });
    } catch (error: any) {
        console.log('❌ FAIL -', error.message);
    }

    // Test 2: USD with valid email
    console.log('\nTest 2: USD Payment Method (Zelle)');
    try {
        const usdMethod = await P2PPaymentMethodService.createPaymentMethod(testUserId, {
            currency: 'USD',
            accountName: 'Jane Smith',
            email: 'jane.zelle@gmail.com',
            isPrimary: true,
        });
        console.log('✅ PASS - USD method created:', {
            currency: usdMethod.currency,
            bankName: usdMethod.bankName,
            accountName: usdMethod.accountName,
            email: (usdMethod.details as any)?.email,
        });
    } catch (error: any) {
        console.log('❌ FAIL -', error.message);
    }

    // Test 3: GBP with valid account number
    console.log('\nTest 3: GBP Payment Method (Bank Transfer)');
    try {
        const gbpMethod = await P2PPaymentMethodService.createPaymentMethod(testUserId, {
            currency: 'GBP',
            bankName: 'Barclays',
            accountName: 'Robert Johnson',
            accountNumber: '12345678',
            isPrimary: true,
        });
        console.log('✅ PASS - GBP method created:', {
            currency: gbpMethod.currency,
            bankName: gbpMethod.bankName,
            accountName: gbpMethod.accountName,
            accountNumber: gbpMethod.accountNumber,
        });
    } catch (error: any) {
        console.log('❌ FAIL -', error.message);
    }

    // Test 4: CAD without email (should fail)
    console.log('\nTest 4: CAD without email (should fail)');
    try {
        await P2PPaymentMethodService.createPaymentMethod(testUserId, {
            currency: 'CAD',
            accountName: 'John Doe',
        });
        console.log('❌ FAIL - Should have thrown error');
    } catch (error: any) {
        console.log('✅ PASS - Correctly rejected:', error.message);
    }

    // Test 5: USD with invalid email (should fail)
    console.log('\nTest 5: USD with invalid email (should fail)');
    try {
        await P2PPaymentMethodService.createPaymentMethod(testUserId, {
            currency: 'USD',
            accountName: 'Jane Smith',
            email: 'invalid-email',
        });
        console.log('❌ FAIL - Should have thrown error');
    } catch (error: any) {
        console.log('✅ PASS - Correctly rejected:', error.message);
    }

    // Test 6: GBP with invalid account number (should fail)
    console.log('\nTest 6: GBP with invalid account number (should fail)');
    try {
        await P2PPaymentMethodService.createPaymentMethod(testUserId, {
            currency: 'GBP',
            bankName: 'Barclays',
            accountName: 'Robert Johnson',
            accountNumber: '123', // Too short
        });
        console.log('❌ FAIL - Should have thrown error');
    } catch (error: any) {
        console.log('✅ PASS - Correctly rejected:', error.message);
    }

    // Test 7: EUR currency (should fail - not supported)
    console.log('\nTest 7: EUR currency (should fail - not supported)');
    try {
        await P2PPaymentMethodService.createPaymentMethod(testUserId, {
            currency: 'EUR',
            accountName: 'Pierre Dupont',
            email: 'pierre@example.com',
        });
        console.log('❌ FAIL - Should have thrown error');
    } catch (error: any) {
        console.log('✅ PASS - Correctly rejected:', error.message);
    }

    // Test 8: Default bank name for CAD
    console.log('\nTest 8: CAD without bankName (should default to Interac)');
    try {
        const cadMethod = await P2PPaymentMethodService.createPaymentMethod(testUserId, {
            currency: 'CAD',
            accountName: 'Test User',
            email: 'test@example.com',
        });
        if (cadMethod.bankName === 'Interac') {
            console.log('✅ PASS - Bank name defaulted to Interac');
        } else {
            console.log('❌ FAIL - Expected "Interac", got:', cadMethod.bankName);
        }
    } catch (error: any) {
        console.log('❌ FAIL -', error.message);
    }

    console.log('\n✨ Test suite completed!');
}

// Run tests
testPaymentMethods().catch(console.error);
