# Testing Documentation

## Overview

This document provides comprehensive information about the testing setup for the SwapLink Server project. We have implemented unit tests, integration tests, and end-to-end (E2E) tests for all major components.

## Test Structure

```
src/
├── modules/
│   └── auth/
│       └── __tests__/
│           ├── auth.service.unit.test.ts       # Unit tests for AuthService
│           ├── auth.service.integration.test.ts # Integration tests for AuthService
│           └── auth.e2e.test.ts                # E2E tests for Auth API endpoints
├── lib/
│   └── services/
│       └── __tests__/
│           ├── otp.service.unit.test.ts        # Unit tests for OtpService
│           ├── otp.service.integration.test.ts # Integration tests for OtpService
│           ├── wallet.service.unit.test.ts     # Unit tests for WalletService
│           └── wallet.service.integration.test.ts # Integration tests for WalletService
└── test/
    ├── setup.ts              # Global test setup
    ├── integration.setup.ts  # Integration test setup
    └── utils.ts              # Test utilities and helpers
```

## Test Types

### Unit Tests

Unit tests focus on testing individual functions and methods in isolation using mocks for dependencies.

**Location:** `**/*.unit.test.ts`

**Coverage:**

-   AuthService: register, login, OTP flows, password reset, KYC
-   OtpService: OTP generation, verification, expiration
-   WalletService: wallet creation, balance queries, credit/debit operations

**Run unit tests:**

```bash
pnpm test:unit
```

### Integration Tests

Integration tests verify that components work correctly with real database operations.

**Location:** `**/*.integration.test.ts`

**Coverage:**

-   AuthService: Complete user registration flow, authentication, verification
-   OtpService: OTP lifecycle with database persistence
-   WalletService: Transaction atomicity, concurrent operations

**Run integration tests:**

```bash
pnpm test:integration
```

### E2E Tests

End-to-end tests verify complete user journeys through the API endpoints.

**Location:** `**/*.e2e.test.ts`

**Coverage:**

-   Auth API: All authentication endpoints
-   Complete user registration and verification journey
-   Password reset flow
-   KYC submission

**Run E2E tests:**

```bash
pnpm test -- --testPathPattern=e2e
```

## Running Tests

### Prerequisites

1. **Test Database Setup:**

    ```bash
    # Start test database
    pnpm docker:test:up

    # Wait for database to be ready (10 seconds)
    sleep 10

    # Run migrations
    pnpm db:migrate:test
    ```

2. **Environment Variables:**
   Ensure `.env.test` file exists with test database configuration:
    ```env
    NODE_ENV=test
    DATABASE_URL="postgresql://user:password@localhost:5433/swaplink_test"
    JWT_SECRET="test-secret-key"
    JWT_REFRESH_SECRET="test-refresh-secret"
    JWT_ACCESS_EXPIRATION="24h"
    JWT_REFRESH_EXPIRATION="7d"
    ```

### Run All Tests

```bash
# Setup test environment and run all tests
pnpm test:setup && pnpm test

# Or use the combined command
pnpm test
```

### Run Specific Test Suites

```bash
# Run only unit tests
pnpm test:unit

# Run only integration tests
pnpm test:integration

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Run Specific Test Files

```bash
# Run specific test file
pnpm test src/modules/auth/__tests__/auth.service.unit.test.ts

# Run tests matching a pattern
pnpm test -- --testNamePattern="should register a new user"
```

## Test Utilities

### TestUtils Class

Located in `src/test/utils.ts`, provides helper methods for test data generation and setup:

```typescript
// Generate test user data
const userData = TestUtils.generateUserData();

// Create a user in the database
const user = await TestUtils.createUser();

// Create a user with wallets
const { user, wallets } = await TestUtils.createUserWithWallets();

// Generate auth token
const token = TestUtils.generateAuthToken(userId);

// Update wallet balance
await TestUtils.updateWalletBalance(userId, 'USD', 1000);
```

## Coverage Goals

We aim for the following coverage targets:

-   **Statements:** > 80%
-   **Branches:** > 75%
-   **Functions:** > 80%
-   **Lines:** > 80%

Check current coverage:

```bash
pnpm test:coverage
```

## Best Practices

### 1. Test Isolation

Each test should be independent and not rely on the state from other tests:

```typescript
beforeEach(async () => {
    // Clean up database before each test
    await prisma.user.deleteMany();
    await prisma.wallet.deleteMany();
});
```

### 2. Descriptive Test Names

Use clear, descriptive test names that explain what is being tested:

```typescript
it('should throw UnauthorizedError if password is incorrect', async () => {
    // Test implementation
});
```

### 3. Arrange-Act-Assert Pattern

Structure tests using the AAA pattern:

```typescript
it('should credit wallet successfully', async () => {
    // Arrange
    const { user } = await TestUtils.createUserWithWallets();

    // Act
    const result = await walletService.creditWallet(user.id, 'USD', 500);

    // Assert
    expect(result.amount).toBe(500);
    expect(result.type).toBe('DEPOSIT');
});
```

### 4. Test Both Success and Failure Cases

Always test both happy paths and error scenarios:

```typescript
describe('login', () => {
    it('should login with valid credentials', async () => {
        // Success case
    });

    it('should throw UnauthorizedError for invalid password', async () => {
        // Failure case
    });
});
```

### 5. Use Meaningful Assertions

Be specific about what you're asserting:

```typescript
// Good
expect(result.user.email).toBe('test@example.com');
expect(result.tokens.accessToken).toBeDefined();

// Avoid
expect(result).toBeTruthy();
```

## Debugging Tests

### Run Tests in Debug Mode

```bash
# Using Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Using VS Code debugger
# Add breakpoints and use "Jest: Debug" configuration
```

### View Test Output

```bash
# Verbose output
pnpm test -- --verbose

# Show console.log statements
pnpm test -- --silent=false
```

## Continuous Integration

Tests are automatically run in CI/CD pipeline on:

-   Pull requests
-   Commits to main branch
-   Pre-deployment

### CI Test Command

```bash
# Setup and run all tests
pnpm test:setup && pnpm test:coverage
```

## Common Issues and Solutions

### Issue: Tests Timeout

**Solution:** Increase Jest timeout in test file:

```typescript
jest.setTimeout(30000); // 30 seconds
```

### Issue: Database Connection Errors

**Solution:** Ensure test database is running:

```bash
pnpm docker:test:up
pnpm db:migrate:test
```

### Issue: Tests Fail Due to Existing Data

**Solution:** Ensure proper cleanup in `beforeEach` or `afterEach` hooks:

```typescript
beforeEach(async () => {
    await prisma.user.deleteMany();
});
```

### Issue: Mock Not Working

**Solution:** Clear mocks between tests:

```typescript
beforeEach(() => {
    jest.clearAllMocks();
});
```

## Test Coverage Report

After running tests with coverage, view the HTML report:

```bash
# Generate coverage report
pnpm test:coverage

# Open coverage report in browser
open coverage/lcov-report/index.html
```

## Adding New Tests

When adding new features, follow these steps:

1. **Write Unit Tests First**

    - Test individual functions in isolation
    - Mock all dependencies
    - Cover edge cases and error scenarios

2. **Add Integration Tests**

    - Test with real database operations
    - Verify data persistence
    - Test transaction atomicity

3. **Create E2E Tests**

    - Test complete user journeys
    - Verify API responses
    - Test authentication and authorization

4. **Update This Documentation**
    - Document new test utilities
    - Add examples for complex scenarios
    - Update coverage goals if needed

## Resources

-   [Jest Documentation](https://jestjs.io/docs/getting-started)
-   [Supertest Documentation](https://github.com/visionmedia/supertest)
-   [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
-   [Testing Best Practices](https://testingjavascript.com/)

## Contact

For questions about testing or to report issues, please contact the development team or create an issue in the project repository.
