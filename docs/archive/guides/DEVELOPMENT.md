# Development & Testing Guide

This guide provides detailed instructions for setting up, running, and testing the SwapLink Server. It is designed to help you get up to speed quickly, even if you are revisiting the project after a long time.

## 1. Environment Setup

### Prerequisites

Ensure you have the following installed:

-   **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
-   **pnpm** (Package Manager) - `npm install -g pnpm`
-   **Docker & Docker Compose** - For running database and redis easily.
-   **PostgreSQL Client** (Optional) - For manual DB inspection.

### Configuration (.env)

The application relies on environment variables.

1.  Copy the example file:
    ```bash
    cp .env.example .env
    ```
2.  **Critical Variables**:
    -   `DATABASE_URL`: Connection string for PostgreSQL.
    -   `REDIS_URL`: Connection string for Redis.
    -   `JWT_SECRET`: Secret key for signing tokens.
    -   `ADMIN_EMAIL` / `ADMIN_PASSWORD`: Default Super Admin credentials for seeding.

---

## 2. Running the Application

You have two main ways to run the app: **Hybrid (Recommended)** or **Local**.

### Option A: Hybrid (Docker for Infra + Local Node)

This is the best experience for development. It runs DB and Redis in Docker, but the Node app locally for fast restarts.

1.  **Start Infrastructure**:

    ```bash
    pnpm run docker:dev:up
    ```

    _This spins up Postgres (port 5432) and Redis (port 6379)._

2.  **Run Migrations**:
    (Only needed first time or after schema changes)

    ```bash
    pnpm db:migrate
    ```

3.  **Seed Database**:
    (Creates default admin and basic data)

    ```bash
    pnpm db:seed
    ```

4.  **Start the API Server**:

    ```bash
    pnpm dev
    ```

    _Server runs at `http://localhost:3000`_

5.  **Start Background Worker** (in a separate terminal):
    ```bash
    pnpm worker
    ```
    _Required for processing transfers, emails, and KYC._

### Option B: Full Docker

Runs everything including the Node app inside Docker. Good for verifying production-like behavior.

```bash
pnpm dev:full
```

---

## 3. Database Management

We use **Prisma ORM**. Here are the common commands:

-   **Update Schema**: After changing `prisma/schema.prisma`:

    ```bash
    pnpm db:migrate
    ```

    _This generates the SQL migration file and applies it._

-   **Reset Database**: **WARNING: Deletes all data!**

    ```bash
    pnpm db:reset
    ```

-   **View Data (GUI)**:
    ```bash
    pnpm db:studio
    ```
    _Opens a web interface at `http://localhost:5555` to browse data._

---

## 4. Testing

We use **Jest** for testing. Tests are located in `src/**/*.test.ts` or `src/test/`.

### Test Environment

Tests use a separate database to avoid messing up your development data.

1.  Create `.env.test` (copy `.env.example` and change DB name to `swaplink_test`).
2.  Spin up test infrastructure:
    ```bash
    pnpm run docker:test:up
    ```

### Running Tests

-   **Run All Tests**:

    ```bash
    pnpm test
    ```

-   **Run Unit Tests Only**:

    ```bash
    pnpm test:unit
    ```

-   **Run Integration Tests**:

    ```bash
    pnpm test:integration
    ```

-   **Watch Mode** (Reruns on save):

    ```bash
    pnpm test:watch
    ```

-   **Test Coverage Report**:
    ```bash
    pnpm test:coverage
    ```

### Troubleshooting Tests

-   **"Database does not exist"**: Ensure you ran `pnpm run docker:test:up` and `pnpm db:migrate:test`.
-   **Flaky Tests**: Some integration tests rely on timing (e.g., queues). If they fail, try running them individually.

---

## 5. Common Issues & Fixes

### "Connection Refused" (DB/Redis)

-   Check if Docker containers are running: `docker ps`
-   Ensure ports 5432 and 6379 are not occupied by other services.

### "Prisma Client not initialized"

-   Run `pnpm db:generate` to regenerate the client after `npm install`.

### "TypeScript Errors during Build"

-   Run `pnpm build:check` to see type errors without emitting files.
-   Ensure you are importing types from `src/shared/database` (the central export) rather than generated paths directly if possible.
