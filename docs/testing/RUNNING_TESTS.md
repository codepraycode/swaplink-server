# 🧪 How to Run Tests in SwapLink Server

This document outlines the standard procedures for running unit, integration, and end-to-end (E2E) tests in the SwapLink Server.

## 📋 Prerequisites

Before running tests, ensure you have the following installed:

-   **Node.js** (v18+)
-   **pnpm** (Package Manager)
-   **Docker & Docker Compose** (Required for the test database and Redis)

## ⚙️ Environment Setup

The testing environment runs in isolation using Docker containers to prevent interference with your local development database.

### 1. Start Test Infrastructure

Run the following command to spin up the test Postgres and Redis containers:

```bash
pnpm run docker:test:up
```

_This starts containers on ports `5433` (Postgres) and `6380` (Redis) to avoid conflicts with default ports._

### 2. Run Database Migrations

Ensure the test database schema is up-to-date:

```bash
pnpm run db:migrate:test
```

_This applies all Prisma migrations to the `swaplink_test` database._

---

## 🚀 Running Tests

### Run All Tests

To run the entire test suite (Unit + E2E):

```bash
pnpm test
```

### Run Unit Tests Only

Unit tests are fast, isolated, and mock external dependencies.

```bash
pnpm test:unit
```

### Run E2E Tests Only

E2E tests interact with the real test database and API endpoints.

```bash
pnpm test:e2e
```

### Run Specific Test Suites

You can filter tests by filename or suite name using arguments:

```bash
# Run only authentication tests
pnpm test:unit -- auth

# Run a specific file
pnpm test:unit -- auth.service.unit.test.ts

# Run E2E tests for a specific module
pnpm test:e2e -- wallet
```

### Run with Coverage

To generate a code coverage report:

```bash
pnpm test:coverage
```

_Reports will be generated in the `coverage/` directory._

### Watch Mode

To automatically re-run tests when files change (useful for TDD):

```bash
pnpm test:watch
```

---

## 🛠️ Troubleshooting

### 1. Database Connection Errors

If you see errors like `P1001: Can't reach database server`:

-   Ensure Docker containers are running: `docker ps`
-   Check if port `5433` is occupied.
-   Restart containers:
    ```bash
    pnpm run docker:test:down
    pnpm run docker:test:up
    ```

### 2. "Table does not exist" Errors

If tests fail with missing tables:

-   You likely need to run migrations:
    ```bash
    pnpm run db:migrate:test
    ```

### 3. Rate Limiting Errors (429)

If E2E tests fail with `429 Too Many Requests`:

-   Ensure `NODE_ENV` is set to `test`. The application is configured to disable rate limiting in the test environment.
-   Check `src/middlewares/rate-limit.middleware.ts` to verify the skip logic.

### 4. Prisma Client Errors

If you see `Cannot find module '.prisma/client/default'`:

-   The Prisma client might need regeneration.
-   Run: `pnpm prisma generate`

---

## 📂 Test Structure

Tests are co-located with their modules or services:

-   **Unit Tests**: `src/modules/<module>/__tests__/*.unit.test.ts` or `src/lib/services/__tests__/*.unit.test.ts`
-   **E2E Tests**: `src/modules/<module>/__tests__/*.e2e.test.ts`
-   **Integration Tests**: `src/modules/<module>/__tests__/*.integration.test.ts`

### Naming Convention

-   `*.unit.test.ts`: Unit tests (Mocked dependencies)
-   `*.integration.test.ts`: Integration tests (Real DB, mocked external APIs)
-   `*.e2e.test.ts`: End-to-End tests (Full HTTP requests)

---

## 🧹 Cleanup

To stop the test environment and remove containers:

```bash
pnpm run docker:test:down
```
