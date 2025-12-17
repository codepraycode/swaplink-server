# Environment Variables Quick Reference

This document provides a quick reference for all environment variables used in the SwapLink server.

## 🔧 Server Configuration

| Variable              | Required | Default                 | Description                                              |
| --------------------- | -------- | ----------------------- | -------------------------------------------------------- |
| `NODE_ENV`            | Yes      | `development`           | Environment mode: `development`, `test`, or `production` |
| `PORT`                | No       | `3001`                  | Port number for the API server                           |
| `SERVER_URL`          | No       | `http://localhost:3001` | Full server URL (used for callbacks)                     |
| `ENABLE_FILE_LOGGING` | No       | `true`                  | Enable file-based logging (disable in production)        |

## 🗄️ Database Configuration

| Variable       | Required | Default             | Description                  |
| -------------- | -------- | ------------------- | ---------------------------- |
| `DATABASE_URL` | Yes      | -                   | PostgreSQL connection string |
| `DB_HOST`      | No       | `localhost`         | Database host                |
| `DB_USER`      | No       | `swaplink_user`     | Database username            |
| `DB_PASSWORD`  | No       | `swaplink_password` | Database password            |
| `DB_NAME`      | No       | `swaplink_mvp`      | Database name                |

**Example DATABASE_URL:**

```
postgresql://username:password@host:5432/database_name
```

## 🔴 Redis Configuration

| Variable     | Required | Default                  | Description          |
| ------------ | -------- | ------------------------ | -------------------- |
| `REDIS_URL`  | Yes      | `redis://localhost:6379` | Redis connection URL |
| `REDIS_PORT` | No       | `6379`                   | Redis port number    |

## 🔐 JWT Configuration

| Variable                 | Required | Default | Description                   |
| ------------------------ | -------- | ------- | ----------------------------- |
| `JWT_SECRET`             | Yes      | -       | Secret key for access tokens  |
| `JWT_ACCESS_EXPIRATION`  | Yes      | `15m`   | Access token expiration time  |
| `JWT_REFRESH_SECRET`     | Yes      | -       | Secret key for refresh tokens |
| `JWT_REFRESH_EXPIRATION` | Yes      | `7d`    | Refresh token expiration time |

**Security Note:** Use strong, randomly generated secrets in production. Never commit these to version control.

## 🏦 Globus Bank API Configuration

| Variable                | Required   | Default | Description                           |
| ----------------------- | ---------- | ------- | ------------------------------------- |
| `GLOBUS_SECRET_KEY`     | Yes (prod) | -       | Globus Bank API secret key            |
| `GLOBUS_WEBHOOK_SECRET` | Yes (prod) | -       | Webhook signature verification secret |
| `GLOBUS_BASE_URL`       | Yes (prod) | -       | Globus Bank API base URL              |
| `GLOBUS_CLIENT_ID`      | Yes (prod) | -       | Globus Bank client ID                 |

## 🌐 CORS Configuration

| Variable    | Required | Default                 | Description                             |
| ----------- | -------- | ----------------------- | --------------------------------------- |
| `CORS_URLS` | Yes      | `http://localhost:3000` | Comma-separated list of allowed origins |

**Example:**

```
CORS_URLS=https://swaplink.app,https://app.swaplink.com,http://localhost:3000
```

## 📧 Email Configuration (Resend)

| Variable         | Required   | Default                 | Description                                     |
| ---------------- | ---------- | ----------------------- | ----------------------------------------------- |
| `RESEND_API_KEY` | Yes (prod) | -                       | Resend API key for sending emails               |
| `FROM_EMAIL`     | Yes        | `no-reply@swaplink.com` | Sender email address (must use verified domain) |
| `EMAIL_TIMEOUT`  | No         | `10000`                 | Email sending timeout in milliseconds           |

**Getting Resend API Key:**

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain
3. Generate API key from dashboard
4. API key format: `re_xxxxxxxxxxxxx`

## 📧 Email Configuration (SMTP - Legacy)

| Variable        | Required | Default            | Description      |
| --------------- | -------- | ------------------ | ---------------- |
| `SMTP_HOST`     | No       | `smtp.example.com` | SMTP server host |
| `SMTP_PORT`     | No       | `587`              | SMTP server port |
| `SMTP_USER`     | No       | -                  | SMTP username    |
| `SMTP_PASSWORD` | No       | -                  | SMTP password    |

**Note:** SMTP configuration is legacy. Use Resend in production.

## 🌍 Frontend Configuration

| Variable       | Required | Default                 | Description                                         |
| -------------- | -------- | ----------------------- | --------------------------------------------------- |
| `FRONTEND_URL` | Yes      | `http://localhost:3000` | Frontend application URL (for password reset links) |

## 📦 Storage Configuration (S3/Cloudflare R2)

| Variable                | Required | Default     | Description                                  |
| ----------------------- | -------- | ----------- | -------------------------------------------- |
| `AWS_ACCESS_KEY_ID`     | Yes      | -           | AWS/R2 access key ID                         |
| `AWS_SECRET_ACCESS_KEY` | Yes      | -           | AWS/R2 secret access key                     |
| `AWS_REGION`            | No       | `us-east-1` | AWS region or `auto` for R2                  |
| `AWS_BUCKET_NAME`       | Yes      | `swaplink`  | S3/R2 bucket name                            |
| `AWS_ENDPOINT`          | No       | -           | Custom endpoint (required for Cloudflare R2) |

**Cloudflare R2 Example:**

```
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=auto
AWS_BUCKET_NAME=swaplink-staging
AWS_ENDPOINT=https://account-id.r2.cloudflarestorage.com
```

**AWS S3 Example:**

```
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=swaplink-staging
# AWS_ENDPOINT not needed for S3
```

## ⚙️ System Configuration

| Variable         | Required | Default              | Description                             |
| ---------------- | -------- | -------------------- | --------------------------------------- |
| `SYSTEM_USER_ID` | Yes      | `system-wallet-user` | System user ID for automated operations |

## 📝 Environment-Specific Examples

### Development (.env)

```bash
NODE_ENV=development
PORT=3001
SERVER_URL=http://localhost:3001
ENABLE_FILE_LOGGING=true

DATABASE_URL=postgresql://swaplink_user:swaplink_password@localhost:5434/swaplink_mvp
REDIS_URL=redis://localhost:6381

JWT_SECRET=dev_jwt_secret_change_in_production
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=dev_refresh_secret_change_in_production
JWT_REFRESH_EXPIRATION=7d

CORS_URLS=http://localhost:3000,http://localhost:19006

FROM_EMAIL=no-reply@swaplink.local
RESEND_API_KEY=  # Leave empty in development (uses mock service)
FRONTEND_URL=http://localhost:3000

AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_REGION=us-east-1
AWS_BUCKET_NAME=swaplink
AWS_ENDPOINT=http://localhost:9000

SYSTEM_USER_ID=system-wallet-user
```

### Production (Railway)

```bash
NODE_ENV=production
PORT=3000
SERVER_URL=https://your-app.railway.app
ENABLE_FILE_LOGGING=false

DATABASE_URL=<from_railway_postgresql_service>
REDIS_URL=<from_railway_redis_service>

JWT_SECRET=<auto_generated_by_setup_script>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=<auto_generated_by_setup_script>
JWT_REFRESH_EXPIRATION=7d

GLOBUS_SECRET_KEY=<your_globus_secret>
GLOBUS_WEBHOOK_SECRET=<your_globus_webhook_secret>
GLOBUS_BASE_URL=https://api.globusbank.com
GLOBUS_CLIENT_ID=<your_globus_client_id>

CORS_URLS=https://swaplink.app,https://app.swaplink.com

FROM_EMAIL=onboarding@swaplink.com
RESEND_API_KEY=re_your_actual_api_key_here
FRONTEND_URL=https://swaplink.app

AWS_ACCESS_KEY_ID=<your_r2_access_key>
AWS_SECRET_ACCESS_KEY=<your_r2_secret_key>
AWS_REGION=auto
AWS_BUCKET_NAME=swaplink-staging
AWS_ENDPOINT=https://account-id.r2.cloudflarestorage.com

SYSTEM_USER_ID=system-wallet-user
```

### Test (.env.test)

```bash
NODE_ENV=test
PORT=3002
SERVER_URL=http://localhost:3002
ENABLE_FILE_LOGGING=false

DATABASE_URL=postgresql://swaplink_user:swaplink_password@localhost:5433/swaplink_test
REDIS_URL=redis://localhost:6380

JWT_SECRET=test_jwt_secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=test_refresh_secret
JWT_REFRESH_EXPIRATION=7d

CORS_URLS=http://localhost:3000

FROM_EMAIL=test@swaplink.local
RESEND_API_KEY=  # Leave empty in test (uses mock service)
FRONTEND_URL=http://localhost:3000

AWS_ACCESS_KEY_ID=test_access_key
AWS_SECRET_ACCESS_KEY=test_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=swaplink-test
AWS_ENDPOINT=http://localhost:9000

SYSTEM_USER_ID=system-wallet-user
```

## 🔒 Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong secrets** in production (at least 32 characters)
3. **Rotate secrets regularly** (every 90 days recommended)
4. **Use environment-specific values** (don't reuse production secrets in development)
5. **Limit CORS origins** to only trusted domains
6. **Use HTTPS** in production (Railway provides this automatically)
7. **Enable rate limiting** (already configured in the application)

## 🔍 Validation

The server validates required environment variables on startup. If any required variables are missing, the server will fail to start with a clear error message.

**Required in all environments:**

-   `DATABASE_URL`
-   `JWT_SECRET`
-   `JWT_ACCESS_EXPIRATION`
-   `JWT_REFRESH_SECRET`
-   `JWT_REFRESH_EXPIRATION`
-   `CORS_URLS`
-   `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`
-   `FROM_EMAIL`
-   `SYSTEM_USER_ID`

**Additional required in production:**

-   `GLOBUS_SECRET_KEY`
-   `GLOBUS_WEBHOOK_SECRET`
-   `GLOBUS_BASE_URL`
-   `GLOBUS_CLIENT_ID`
-   `RESEND_API_KEY` (recommended)

## 🆘 Troubleshooting

### Error: "Missing required environment variable: X"

**Solution:** Add the missing variable to your `.env` file or Railway environment variables.

### Error: "Database connection failed"

**Solution:** Check that `DATABASE_URL` is correct and the database is accessible.

### Error: "Redis connection failed"

**Solution:** Verify `REDIS_URL` is correct and Redis is running.

### Error: "Failed to send email"

**Solution:**

-   Check `RESEND_API_KEY` is set correctly
-   Verify domain is verified in Resend
-   Ensure `FROM_EMAIL` uses verified domain

## 📚 Additional Resources

-   [Railway Environment Variables](https://docs.railway.app/guides/environment-variables)
-   [Resend API Documentation](https://resend.com/docs)
-   [Prisma Connection URLs](https://www.prisma.io/docs/reference/database-reference/connection-urls)
-   [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Need help?** Check the main [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) guide for detailed deployment instructions.
