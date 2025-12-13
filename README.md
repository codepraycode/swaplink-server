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
