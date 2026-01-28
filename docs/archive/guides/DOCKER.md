# Docker Guide for SwapLink

This guide details how to use Docker effectively for development, testing, and deployment of the SwapLink Server.

## 🐳 Docker Profiles

We use **Docker Profiles** to manage different running modes. This allows you to choose whether to run just the infrastructure (DB/Redis) or the full application stack.

| Profile       | Services Included                    | Use Case                                                                           | Command                  |
| :------------ | :----------------------------------- | :--------------------------------------------------------------------------------- | :----------------------- |
| **(default)** | `postgres`, `redis`                  | **Local Development**. You run Node.js locally, Docker handles infra.              | `pnpm run docker:dev:up` |
| **app**       | `postgres`, `redis`, `api`, `worker` | **Full Stack Simulation**. Runs everything in Docker. Good for final verification. | `pnpm run docker:app:up` |

---

## 🛠️ Development Workflow

### 1. Hybrid Mode (Recommended)

Run the database and redis in Docker, but run the API and Worker on your host machine for fast feedback loops.

1.  **Start Infrastructure**:
    ```bash
    pnpm run docker:dev:up
    ```
2.  **Run Migrations** (if needed):
    ```bash
    pnpm db:migrate
    ```
3.  **Start App Locally**:
    ```bash
    pnpm dev
    ```

### 2. Full Docker Mode

Run the entire application inside Docker containers. This ensures your environment matches production exactly.

1.  **Start Full Stack**:
    ```bash
    pnpm run docker:app:up
    ```
2.  **View Logs**:
    ```bash
    docker-compose logs -f
    ```
3.  **Stop**:
    ```bash
    pnpm run docker:dev:down
    ```

---

## 🧪 Testing with Docker

Tests run in a separate isolated environment using `docker-compose.test.yml`.

-   **Spin up Test Infra**:

    ```bash
    pnpm run docker:test:up
    ```

    _This starts a separate Postgres and Redis instance mapped to different ports to avoid conflicts with dev._

-   **Run Tests**:

    ```bash
    pnpm test
    ```

-   **Teardown**:
    ```bash
    pnpm run docker:test:down
    ```

---

## 📦 Production Deployment

The `Dockerfile` is optimized for production.

1.  **Build Image**:

    ```bash
    docker build -t swaplink-server .
    ```

2.  **Run Container**:
    ```bash
    docker run -d \
      -p 3000:3000 \
      -e DATABASE_URL=... \
      -e REDIS_URL=... \
      -e JWT_SECRET=... \
      swaplink-server
    ```

### Optimization Details

-   **Multi-stage Build**: We use a `builder` stage to compile TS and a `runner` stage for the final image.
-   **Pruned Dependencies**: `pnpm prune --prod` ensures only necessary packages are included, keeping the image size small.
-   **Frozen Lockfile**: Ensures exact dependency versions are installed.

---

## ❓ Troubleshooting

**Q: "Port already in use"**
A: Check if you have another instance running.

-   `docker ps` to see running containers.
-   `killall node` to stop local processes.

**Q: "Prisma Client not found in Docker"**
A: The `Dockerfile` handles `prisma generate`. If you see this locally, run `pnpm db:generate`.

**Q: "Connection Refused"**
A: Ensure you are using the correct `DATABASE_URL`.

-   **Local**: `localhost:5432`
-   **Inside Docker**: `postgres:5432` (Service name)
