# SwapLink Server

SwapLink is a cross-border P2P currency exchange platform. This repository contains the backend server and background workers.

## Project Structure

The project is organized into a modular architecture:

-   **`src/api`**: HTTP Server logic (Express App, Controllers, Routes).
-   **`src/worker`**: Background processing (BullMQ Workers, Cron Jobs).
-   **`src/shared`**: Shared resources (Database, Config, Lib, Types).

## Getting Started

### Prerequisites

-   Node.js (v18+)
-   pnpm
-   PostgreSQL
-   Redis

### Installation

```bash
pnpm install
```

### Environment Setup

Copy `.env.example` to `.env` and configure your variables:

```bash
cp .env.example .env
```

### Database Setup

```bash
pnpm db:generate
pnpm db:migrate
```

### Running the Application

**Development API Server:**

```bash
pnpm dev
```

**Background Worker:**

```bash
pnpm worker
```

**Run Full Stack (Docker + DB + API):**

```bash
pnpm dev:full
```

### Testing

```bash
pnpm test
```

## Features

-   **Authentication**: JWT-based auth with OTP verification.
-   **Wallets**: NGN wallets with virtual account funding.
-   **Transfers**: Internal P2P transfers and External bank transfers.
-   **Background Jobs**: Asynchronous transfer processing and reconciliation.
