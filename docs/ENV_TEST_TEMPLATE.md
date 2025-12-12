# .env.test Configuration Template

Copy this content to your `.env.test` file in the project root.

```bash
# Environment configuration
NODE_ENV=test
PORT=3003
ENABLE_FILE_LOGGING=false
LOG_LEVEL="error"
SERVER_URL="http://localhost"

# Database configuration (Test Database)
DB_HOST="localhost"
DB_PORT=5433
DB_USER="swaplink_user"
DB_PASSWORD="swaplink_password"
DB_NAME="swaplink_test"
DATABASE_URL="postgresql://swaplink_user:swaplink_password@localhost:5433/swaplink_test"

# Redis
REDIS_URL="redis://localhost:6380"
REDIS_PORT=6380

# JWT
JWT_SECRET="test_jwt_secret_key_123"
JWT_ACCESS_EXPIRATION="24h"
JWT_REFRESH_SECRET="test_refresh_secret_key_123"
JWT_REFRESH_EXPIRATION="7d"

# Payment Providers
GLOBUS_SECRET_KEY="test_mono_secret"
GLOBUS_WEBHOOK_SECRET="test_webhook_secret"

# CORS (separated by comma)
CORS_URLS="http://localhost:3001"

# Email configuration
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="user@example.com"
SMTP_PASSWORD="password"
EMAIL_TIMEOUT=5000
FROM_EMAIL="from@example.com"
```

## Key Differences from .env.example

1. **NODE_ENV**: Set to `test` (instead of `development`)
2. **PORT**: Set to `3003` (to avoid conflicts with dev server)
3. **ENABLE_FILE_LOGGING**: Set to `false` (cleaner test output)
4. **JWT_ACCESS_EXPIRATION**: Added `"24h"`
5. **JWT_REFRESH_EXPIRATION**: Added `"7d"`

## How to Use

Run this command to create your `.env.test` file:

```bash
cp .env.example .env.test
```

Then edit `.env.test` and add these two lines after the JWT_REFRESH_SECRET line:

```bash
JWT_ACCESS_EXPIRATION="24h"
JWT_REFRESH_EXPIRATION="7d"
```

And change:

```bash
NODE_ENV=test
PORT=3003
ENABLE_FILE_LOGGING=false
```
