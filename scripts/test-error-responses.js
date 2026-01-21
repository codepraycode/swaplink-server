#!/usr/bin/env node

/**
 * Error Response Test Script
 *
 * This script tests various error scenarios to ensure the error middleware
 * is properly sending error messages to the mobile app.
 *
 * Run with: node scripts/test-error-responses.js
 */

const API_BASE = process.env.API_URL || 'http://localhost:3000/api/v1';

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(color, ...args) {
    console.log(color, ...args, colors.reset);
}

async function testErrorResponse(testName, url, options = {}) {
    log(colors.cyan, `\n🧪 Testing: ${testName}`);
    log(colors.blue, `   URL: ${url}`);

    try {
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
        });

        const data = await response.json();

        log(colors.yellow, `   Status: ${response.status}`);
        log(colors.yellow, `   Response:`, JSON.stringify(data, null, 2));

        // Validate response structure
        const hasSuccess = 'success' in data;
        const hasStatusCode = 'statusCode' in data;
        const hasMessage = 'message' in data;
        const hasData = 'data' in data;

        if (hasSuccess && hasStatusCode && hasMessage && hasData) {
            log(colors.green, `   ✅ Response structure is correct`);
            log(colors.green, `   ✅ Message field present: "${data.message}"`);

            if (data.success === false && data.message && data.message !== '') {
                log(colors.green, `   ✅ PASS: Error message is properly sent to client`);
                return true;
            } else {
                log(colors.red, `   ❌ FAIL: Error message is empty or success is not false`);
                return false;
            }
        } else {
            log(colors.red, `   ❌ FAIL: Response structure is incorrect`);
            log(
                colors.red,
                `      Missing fields: ${!hasSuccess ? 'success ' : ''}${!hasStatusCode ? 'statusCode ' : ''}${!hasMessage ? 'message ' : ''}${!hasData ? 'data' : ''}`
            );
            return false;
        }
    } catch (error) {
        log(colors.red, `   ❌ ERROR: ${error.message}`);
        return false;
    }
}

async function runTests() {
    log(colors.cyan, '\n' + '='.repeat(60));
    log(colors.cyan, 'ERROR RESPONSE VALIDATION TESTS');
    log(colors.cyan, '='.repeat(60));

    const tests = [
        {
            name: '404 - Not Found',
            url: `${API_BASE}/nonexistent-endpoint`,
        },
        {
            name: '401 - Unauthorized (No Token)',
            url: `${API_BASE}/wallet`,
        },
        {
            name: '401 - Unauthorized (Invalid Token)',
            url: `${API_BASE}/wallet`,
            options: {
                headers: {
                    Authorization: 'Bearer invalid_token_here',
                },
            },
        },
        {
            name: '400 - Bad Request (Invalid Login)',
            url: `${API_BASE}/account/auth/login`,
            options: {
                method: 'POST',
                body: {
                    email: 'invalid-email',
                    password: 'short',
                },
            },
        },
        {
            name: '400 - Bad Request (Missing Fields)',
            url: `${API_BASE}/account/auth/register/step1`,
            options: {
                method: 'POST',
                body: {},
            },
        },
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        const result = await testErrorResponse(test.name, test.url, test.options);
        if (result) {
            passed++;
        } else {
            failed++;
        }
    }

    log(colors.cyan, '\n' + '='.repeat(60));
    log(colors.cyan, 'TEST SUMMARY');
    log(colors.cyan, '='.repeat(60));
    log(colors.green, `✅ Passed: ${passed}`);
    if (failed > 0) {
        log(colors.red, `❌ Failed: ${failed}`);
    }
    log(colors.cyan, '='.repeat(60));

    if (failed === 0) {
        log(colors.green, '\n🎉 All tests passed! Error responses are properly formatted.');
        log(
            colors.green,
            '📱 Mobile app should be able to read error messages from response.message field.'
        );
    } else {
        log(
            colors.red,
            '\n⚠️  Some tests failed. Please review the error middleware configuration.'
        );
    }

    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
    log(colors.red, 'Fatal error:', error);
    process.exit(1);
});
