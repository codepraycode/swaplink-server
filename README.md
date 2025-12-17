# SwapLink Server

![SwapLink Banner](https://via.placeholder.com/1200x300?text=SwapLink+Backend+Architecture)

> **A robust, scalable, and secure backend for a cross-border P2P currency exchange platform.**

SwapLink Server is the powerhouse behind the SwapLink Fintech App. Built with **Node.js**, **TypeScript**, and **Prisma**, it orchestrates secure real-time P2P trading, multi-currency wallet management, and automated background reconciliation.

---

## 🚀 Key Features

-   **🔐 Bank-Grade Security**: JWT Authentication, OTP verification (Email/SMS), and Role-Based Access Control (RBAC).
-   **💰 Multi-Currency Wallets**: Virtual account funding, internal transfers, and external bank withdrawals.
-   **🤝 P2P Trading Engine**:
    -   **Escrow System**: Atomic locking of funds during trades to prevent fraud.
    -   **Real-time Chat**: Socket.io powered messaging between buyers and sellers.
    -   **Dispute Resolution**: Admin dashboard for evidence review and forced resolution.
-   **⚡ High-Performance Architecture**:
    -   **BullMQ Workers**: Offloads heavy tasks (Transactions, KYC) to background queues.
    -   **Redis Caching**: Ensures sub-millisecond response times for critical data.
    -   **Socket.io**: Instant updates for order status and chat messages.
-   **📧 Production Email Service**: Integrated with Resend for reliable email delivery.
-   **☁️ Cloud-Ready**: Optimized for deployment on Render with Docker support.

---

## 🛠️ Technology Stack

| Category      | Technology                                                                                        | Usage                          |
| :------------ | :------------------------------------------------------------------------------------------------ | :----------------------------- |
| **Runtime**   | ![Node.js](https://img.shields.io/badge/Node.js-18-green?style=flat-square&logo=node.js)          | Server-side JavaScript runtime |
| **Framework** | ![Express](https://img.shields.io/badge/Express-5.0-black?style=flat-square&logo=express)         | REST API Framework             |
| **Language**  | ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript) | Static Typing & Safety         |
| **Database**  | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=flat-square&logo=postgresql)  | Relational Data Store          |
| **ORM**       | ![Prisma](https://img.shields.io/badge/Prisma-5.0-white?style=flat-square&logo=prisma)            | Type-safe Database Client      |
| **Queue**     | ![BullMQ](https://img.shields.io/badge/BullMQ-5.0-red?style=flat-square)                          | Background Job Processing      |
| **Caching**   | ![Redis](https://img.shields.io/badge/Redis-7.0-red?style=flat-square&logo=redis)                 | Caching & Pub/Sub              |
| **Real-time** | ![Socket.io](https://img.shields.io/badge/Socket.io-4.0-black?style=flat-square&logo=socket.io)   | WebSockets                     |

---

## 🏗️ System Architecture

The system follows a modular **Service-Oriented Architecture** (SOA) within a monolith, ensuring separation of concerns and scalability.

````mermaid
# SwapLink Server

![SwapLink Banner](https://via.placeholder.com/1200x300?text=SwapLink+Backend+Architecture)

> **A robust, scalable, and secure backend for a cross-border P2P currency exchange platform.**

SwapLink Server is the powerhouse behind the SwapLink Fintech App. Built with **Node.js**, **TypeScript**, and **Prisma**, it orchestrates secure real-time P2P trading, multi-currency wallet management, and automated background reconciliation.

---

## 🚀 Key Features

-   **🔐 Bank-Grade Security**: JWT Authentication, OTP verification (Email/SMS), and Role-Based Access Control (RBAC).
-   **💰 Multi-Currency Wallets**: Virtual account funding, internal transfers, and external bank withdrawals.
-   **🤝 P2P Trading Engine**:
    -   **Escrow System**: Atomic locking of funds during trades to prevent fraud.
    -   **Real-time Chat**: Socket.io powered messaging between buyers and sellers.
    -   **Dispute Resolution**: Admin dashboard for evidence review and forced resolution.
-   **⚡ High-Performance Architecture**:
    -   **BullMQ Workers**: Offloads heavy tasks (Transactions, KYC) to background queues.
    -   **Redis Caching**: Ensures sub-millisecond response times for critical data.
    -   **Socket.io**: Instant updates for order status and chat messages.

---

## 🛠️ Technology Stack

| Category      | Technology                                                                                        | Usage                          |
| :------------ | :------------------------------------------------------------------------------------------------ | :----------------------------- |
| **Runtime**   | ![Node.js](https://img.shields.io/badge/Node.js-18-green?style=flat-square&logo=node.js)          | Server-side JavaScript runtime |
| **Framework** | ![Express](https://img.shields.io/badge/Express-5.0-black?style=flat-square&logo=express)         | REST API Framework             |
| **Language**  | ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript) | Static Typing & Safety         |
| **Database**  | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=flat-square&logo=postgresql)  | Relational Data Store          |
| **ORM**       | ![Prisma](https://img.shields.io/badge/Prisma-5.0-white?style=flat-square&logo=prisma)            | Type-safe Database Client      |
| **Queue**     | ![BullMQ](https://img.shields.io/badge/BullMQ-5.0-red?style=flat-square)                          | Background Job Processing      |
| **Caching**   | ![Redis](https://img.shields.io/badge/Redis-7.0-red?style=flat-square&logo=redis)                 | Caching & Pub/Sub              |
| **Real-time** | ![Socket.io](https://img.shields.io/badge/Socket.io-4.0-black?style=flat-square&logo=socket.io)   | WebSockets                     |

---

## 🏗️ System Architecture

The system follows a modular **Service-Oriented Architecture** (SOA) within a monolith, ensuring separation of concerns and scalability.

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#4F46E5','primaryTextColor':'#fff','primaryBorderColor':'#312E81','lineColor':'#6366F1','secondaryColor':'#10B981','tertiaryColor':'#F59E0B','background':'#F9FAFB','mainBkg':'#4F46E5','secondaryBkg':'#10B981','tertiaryBkg':'#F59E0B'}}}%%

graph TB
    Client[📱 Mobile/Web Client]

    Client -->|HTTP/REST| API[🚀 API Server<br/>Express]
    Client -->|WebSocket| Socket[⚡ Socket.io Server]

    subgraph Backend["🔧 Backend Core"]
        API --> Auth[🔐 Auth Module]
        API --> Wallet[💰 Wallet Module]
        API --> P2P[🤝 P2P Module]

        Auth --> DB[(🗄️ PostgreSQL<br/>Database)]
        Wallet --> DB
        P2P --> DB

        API -->|Enqueue Jobs| Redis[(⚙️ Redis Queue)]
    end

    subgraph Workers["⚙️ Background Workers"]
        Worker[🔄 BullMQ Workers]
        Worker -->|Process Jobs| Redis
        Worker -->|Update Status| DB
        Worker -->|External API| Bank[🏦 Bank/Crypto APIs]
    end

    Socket -->|Real-time Events| API

    style Client fill:#4F46E5,stroke:#312E81,stroke-width:3px,color:#fff
    style API fill:#4F46E5,stroke:#312E81,stroke-width:3px,color:#fff
    style Socket fill:#7C3AED,stroke:#5B21B6,stroke-width:3px,color:#fff
    style Auth fill:#10B981,stroke:#059669,stroke-width:2px,color:#fff
    style Wallet fill:#10B981,stroke:#059669,stroke-width:2px,color:#fff
    style P2P fill:#10B981,stroke:#059669,stroke-width:2px,color:#fff
    style DB fill:#F59E0B,stroke:#D97706,stroke-width:3px,color:#fff
    style Redis fill:#EF4444,stroke:#DC2626,stroke-width:3px,color:#fff
    style Worker fill:#8B5CF6,stroke:#6D28D9,stroke-width:3px,color:#fff
    style Bank fill:#06B6D4,stroke:#0891B2,stroke-width:3px,color:#fff
    style Backend fill:#F3F4F6,stroke:#9CA3AF,stroke-width:2px
    style Workers fill:#FEF3C7,stroke:#FCD34D,stroke-width:2px
````

---

## 🗄️ Database Schema (ERD)

A simplified view of the core entities and their relationships.

```mermaid
erDiagram
    User ||--|| Wallet : has
    User ||--o{ Transaction : initiates
    User ||--o{ P2PAd : posts
    User ||--o{ P2POrder : participates
    User ||--o{ AdminLog : "admin actions"

    P2PAd ||--o{ P2POrder : generates
    P2POrder ||--|| P2PChat : contains

    User {
        string id PK
        string email
        string role "USER | ADMIN"
        boolean isVerified
    }

    Wallet {
        string id PK
        float balance
        string currency
    }

    P2POrder {
        string id PK
        float amount
        string status "PENDING | COMPLETED | DISPUTE"
    }
```

---

## 🚀 Getting Started

### Prerequisites

-   Node.js v18+
-   PostgreSQL
-   Redis
-   pnpm

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/codepraycode/swaplink-server.git
    cd swaplink-server
    ```

2.  **Install dependencies**

    ```bash
    pnpm install
    ```

3.  **Configure Environment**

    ```bash
    cp .env.example .env
    # Update .env with your DB credentials and secrets
    ```

4.  **Setup Database**

    ```bash
    pnpm db:migrate
    pnpm db:seed
    ```

5.  **Run the Server**
    ```bash
    # Run API + Worker + DB (Docker)
    pnpm dev:full
    ```

---

## 📚 API Documentation

A comprehensive Postman Collection is available for testing all endpoints.

-   [**Download Postman Collection**](./docs/SwapLink_API.postman_collection.json)
-   [**Admin Module Documentation**](./docs/admin-implementation.md)

### Core Endpoints

| Module     | Method | Endpoint                    | Description         |
| :--------- | :----- | :-------------------------- | :------------------ |
| **Auth**   | `POST` | `/api/v1/auth/register`     | Register new user   |
| **Auth**   | `POST` | `/api/v1/auth/login`        | Login & get JWT     |
| **Wallet** | `POST` | `/api/v1/transfers/process` | Send money          |
| **P2P**    | `GET`  | `/api/v1/p2p/ads`           | Browse Buy/Sell ads |
| **P2P**    | `POST` | `/api/v1/p2p/orders`        | Start a trade       |
| **Admin**  | `GET`  | `/api/v1/admin/disputes`    | Review disputes     |

---

## 🚀 Deployment

SwapLink supports deployment to multiple platforms. Choose the one that best fits your needs:

### Deploy to Railway (Recommended for Staging) 🚂

Railway offers the simplest setup with managed PostgreSQL and Redis, making it perfect for staging environments.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

**Why Railway?**

-   ✅ **Managed Redis included** (no external provider needed)
-   ✅ **Lower cost** (~$15/month vs ~$28/month on Render)
-   ✅ **Faster setup** (15 minutes)
-   ✅ **Modern developer experience**
-   ✅ **Usage-based pricing** ($5 free credit/month)

**Quick Deploy:**

1. Sign up at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Add PostgreSQL and Redis services
4. Configure environment variables
5. Deploy!

**📚 Railway Guides:**

-   **[Railway Deployment Guide](./RAILWAY_DEPLOYMENT.md)** - Complete Railway setup
-   **[Railway Checklist](./RAILWAY_CHECKLIST.md)** - Step-by-step deployment checklist
-   **[Environment Variables Template](./ENV_RAILWAY.md)** - Railway-specific env vars
-   **[Setup Script](./scripts/railway-setup.sh)** - Generate secrets and prepare deployment

### Deploy to Render 🎨

Render provides a mature platform with infrastructure-as-code support via blueprints.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)

**Why Render?**

-   ✅ **Infrastructure-as-code** with `render.yaml`
-   ✅ **Auto-scaling** available
-   ✅ **Comprehensive monitoring**
-   ✅ **Mature platform**

**Quick Deploy:**

1. Push your code to GitHub
2. Connect your repository to Render
3. Render will automatically detect `render.yaml` and deploy all services
4. Configure environment variables

**📚 Render Guides:**

-   **[Staging Deployment Guide](./STAGING_DEPLOYMENT.md)** - Deploy without Globus credentials
-   **[Render Deployment Guide](./RENDER_DEPLOYMENT.md)** - Complete production deployment
-   **[Health Check Script](./scripts/health-check.sh)** - Verify your deployment

### Platform Comparison 📊

Not sure which to choose? Check out our **[Platform Comparison Guide](./PLATFORM_COMPARISON.md)** for a detailed analysis of Railway vs Render.

**Quick Comparison:**

| Feature                    | Railway                 | Render                      |
| -------------------------- | ----------------------- | --------------------------- |
| **Cost (Staging)**         | ~$15/month              | ~$28/month                  |
| **Setup Time**             | 15 minutes              | 30 minutes                  |
| **Managed Redis**          | ✅ Included             | ❌ External provider needed |
| **Infrastructure-as-Code** | Environment variables   | `render.yaml` blueprint     |
| **Best For**               | Staging, MVPs, Startups | Production, Enterprise      |

### What Gets Deployed

Both platforms deploy the complete SwapLink infrastructure:

-   ✅ **API Server** (Web Service)
-   ✅ **Background Worker** (Worker Service)
-   ✅ **PostgreSQL Database**
-   ✅ **Redis Cache**
-   ✅ **Resend Email Service Integration**

### Deployment Modes

1. **Staging Mode** (No Globus credentials required):

    - Uses Resend for emails
    - Mocks payment processing
    - Perfect for testing
    - **Recommended**: Railway

2. **Production Mode** (Requires all credentials):
    - Full payment processing enabled
    - Choose based on your needs
    - See comparison guide

### Required Setup (Staging)

1. **Resend Account**: Sign up at [resend.com](https://resend.com) for email service
2. **Resend API Key**: Get from Resend dashboard
3. **Storage**: AWS S3 or Cloudflare R2 bucket
4. **Database Migration**: Run `pnpm db:deploy` after first deployment

### Additional for Production

5. **Globus Bank Credentials**: Payment processing API keys
6. **Domain Configuration**: Custom domain setup
7. **Monitoring**: Error tracking and logging

### Quick Start

**For Railway (Recommended for Staging):**

```bash
# Generate secrets and prepare deployment
./scripts/railway-setup.sh

# Follow the Railway Deployment Guide
# See: RAILWAY_DEPLOYMENT.md
```

**For Render:**

```bash
# Review the render.yaml configuration
# Follow the Render Deployment Guide
# See: RENDER_DEPLOYMENT.md
```

### Documentation

-   **[Environment Variables Reference](./ENV_VARIABLES.md)** - All environment variables explained
-   **[Platform Comparison](./PLATFORM_COMPARISON.md)** - Railway vs Render detailed comparison
-   **[Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)** - General deployment checklist

---

## 🧪 Testing

We use **Jest** for Unit and Integration testing.

> **For detailed instructions on setup, testing, and troubleshooting, please read the [Development Guide](./docs/guides/DEVELOPMENT.md).** > **For Docker usage, check the [Docker Guide](./docs/guides/DOCKER.md).**

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test src/modules/auth/__tests__/auth.service.test.ts
```

---

## 📄 License

This project is proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

````

---

## 🗄️ Database Schema (ERD)

A simplified view of the core entities and their relationships.

```mermaid
erDiagram
    User ||--|| Wallet : has
    User ||--o{ Transaction : initiates
    User ||--o{ P2PAd : posts
    User ||--o{ P2POrder : participates
    User ||--o{ AdminLog : "admin actions"

    P2PAd ||--o{ P2POrder : generates
    P2POrder ||--|| P2PChat : contains

    User {
        string id PK
        string email
        string role "USER | ADMIN"
        boolean isVerified
    }

    Wallet {
        string id PK
        float balance
        string currency
    }

    P2POrder {
        string id PK
        float amount
        string status "PENDING | COMPLETED | DISPUTE"
    }
````

---

## 🚀 Getting Started

### Prerequisites

-   Node.js v18+
-   PostgreSQL
-   Redis
-   pnpm

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/codepraycode/swaplink-server.git
    cd swaplink-server
    ```

2.  **Install dependencies**

    ```bash
    pnpm install
    ```

3.  **Configure Environment**

    ```bash
    cp .env.example .env
    # Update .env with your DB credentials and secrets
    ```

4.  **Setup Database**

    ```bash
    pnpm db:migrate
    pnpm db:seed
    ```

5.  **Run the Server**
    ```bash
    # Run API + Worker + DB (Docker)
    pnpm dev:full
    ```

---

## 📚 API Documentation

A comprehensive Postman Collection is available for testing all endpoints.

-   [**Download Postman Collection**](./docs/SwapLink_API.postman_collection.json)
-   [**Admin Module Documentation**](./docs/admin-implementation.md)

### Core Endpoints

| Module     | Method | Endpoint                    | Description         |
| :--------- | :----- | :-------------------------- | :------------------ |
| **Auth**   | `POST` | `/api/v1/auth/register`     | Register new user   |
| **Auth**   | `POST` | `/api/v1/auth/login`        | Login & get JWT     |
| **Wallet** | `POST` | `/api/v1/transfers/process` | Send money          |
| **P2P**    | `GET`  | `/api/v1/p2p/ads`           | Browse Buy/Sell ads |
| **P2P**    | `POST` | `/api/v1/p2p/orders`        | Start a trade       |
| **Admin**  | `GET`  | `/api/v1/admin/disputes`    | Review disputes     |

---

## 🧪 Testing

We use **Jest** for Unit and Integration testing.

> **For detailed instructions on setup, testing, and troubleshooting, please read the [Development Guide](./docs/guides/DEVELOPMENT.md).** > **For Docker usage, check the [Docker Guide](./docs/guides/DOCKER.md).**

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test src/modules/auth/__tests__/auth.service.test.ts
```

---

## 📄 License

This project is proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.
