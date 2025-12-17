# Railway Deployment Guide for SwapLink Server

This guide walks you through deploying the SwapLink server to Railway for staging/production environments.

## Table of Contents

-   [Overview](#overview)
-   [Prerequisites](#prerequisites)
-   [Quick Start](#quick-start)
-   [Detailed Setup](#detailed-setup)
-   [Environment Variables](#environment-variables)
-   [Post-Deployment](#post-deployment)
-   [Troubleshooting](#troubleshooting)

## Overview

Railway deployment consists of:

1. **API Service** - Main REST API server
2. **Worker Service** - Background job processor
3. **PostgreSQL Database** - Managed by Railway
4. **Redis** - Managed by Railway

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway CLI** (optional): Install via `npm i -g @railway/cli`
3. **GitHub Repository**: Your code should be in a GitHub repository
4. **External Services**:
    - Resend account for emails (free tier available)
    - AWS S3 or Cloudflare R2 for file storage
    - Globus Bank credentials (optional for staging)

## Quick Start

### Option 1: Deploy via Railway Dashboard (Recommended)

1. **Create a New Project**

    - Go to [railway.app/new](https://railway.app/new)
    - Click "Deploy from GitHub repo"
    - Select your `swaplink-server` repository

2. **Add PostgreSQL Database**

    - In your project, click "+ New"
    - Select "Database" → "PostgreSQL"
    - Railway will automatically create a `DATABASE_URL` variable

3. **Add Redis**

    - Click "+ New" again
    - Select "Database" → "Redis"
    - Railway will automatically create a `REDIS_URL` variable

4. **Configure API Service**

    - Click on your main service
    - Go to "Settings" → "Deploy"
    - Set **Custom Start Command**: `node dist/api/server.js`
    - Go to "Variables" and add all required environment variables (see below)

5. **Add Worker Service**
    - Click "+ New" → "Empty Service"
    - Name it "swaplink-worker-staging"
    - Connect the same GitHub repository
    - Set **Custom Start Command**: `node dist/worker/index.js`
    - Add the same environment variables as the API service

### Option 2: Deploy via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Link to your project (if already created)
railway link

# Add PostgreSQL
railway add --database postgresql

# Add Redis
railway add --database redis

# Deploy
railway up
```

## Detailed Setup

### 1. Database Configuration

Railway automatically provides these variables when you add PostgreSQL:

-   `DATABASE_URL` - Full connection string
-   `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` - Individual components

**No additional configuration needed!** Just add the PostgreSQL service.

### 2. Redis Configuration

Railway automatically provides:

-   `REDIS_URL` - Full connection string (format: `redis://default:password@host:port`)

**No additional configuration needed!** Just add the Redis service.

### 3. Environment Variables

Add these variables to **both** the API and Worker services:

#### Required Variables

```bash
# Application
NODE_ENV=production
STAGING=true
PORT=3000
SERVER_URL=https://your-app.railway.app
ENABLE_FILE_LOGGING=false

# Database (auto-provided by Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (auto-provided by Railway)
REDIS_URL=${{Redis.REDIS_URL}}
REDIS_PORT=6379

# JWT Secrets (generate secure random strings)
JWT_SECRET=<generate-random-string>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=<generate-random-string>
JWT_REFRESH_EXPIRATION=7d

# Email (Resend)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=<your-resend-api-key>
EMAIL_TIMEOUT=10000
FROM_EMAIL=onboarding@swaplink.com
RESEND_API_KEY=<your-resend-api-key>

# Frontend
FRONTEND_URL=https://swaplink.app
CORS_URLS=https://swaplink.app,https://app.swaplink.com

# Storage (AWS S3 or Cloudflare R2)
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_REGION=us-east-1
AWS_BUCKET_NAME=swaplink-staging
AWS_ENDPOINT=<your-s3-endpoint>

# System
SYSTEM_USER_ID=system-wallet-user
```

#### Optional Variables (for Globus Bank integration)

```bash
GLOBUS_SECRET_KEY=<your-globus-secret>
GLOBUS_WEBHOOK_SECRET=<your-webhook-secret>
GLOBUS_BASE_URL=https://sandbox.globusbank.com/api
GLOBUS_CLIENT_ID=<your-client-id>
```

### 4. Service-Specific Configuration

#### API Service Settings

-   **Start Command**: `node dist/api/server.js`
-   **Health Check Path**: `/api/v1/health`
-   **Port**: Railway automatically detects from `PORT` env var

#### Worker Service Settings

-   **Start Command**: `node dist/worker/index.js`
-   **No health check needed** (background service)

### 5. Railway Variable References

Railway allows you to reference variables from other services:

```bash
# In API service, reference PostgreSQL
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Reference Redis
REDIS_URL=${{Redis.REDIS_URL}}

# Reference another service's variable
SOME_VAR=${{OtherService.SOME_VAR}}
```

## Post-Deployment

### 1. Run Database Migrations

After first deployment, you need to run migrations:

**Via Railway Dashboard:**

1. Go to your API service
2. Click "Deployments" → Select latest deployment
3. Click "View Logs"
4. In the service settings, add a one-time command or use the CLI

**Via Railway CLI:**

```bash
# Connect to your project
railway link

# Run migrations
railway run pnpm db:deploy
```

**Alternative: Add to Dockerfile**
You can add migrations to the Dockerfile (already done in your current setup):

```dockerfile
# In your Dockerfile, before CMD
RUN pnpm db:deploy
```

### 2. Verify Deployment

1. **Check API Health**

    ```bash
    curl https://your-app.railway.app/api/v1/health
    ```

2. **Check Logs**

    - Go to Railway Dashboard
    - Select your service
    - Click "Deployments" → "View Logs"

3. **Test Endpoints**
    ```bash
    # Test signup
    curl -X POST https://your-app.railway.app/api/v1/auth/signup \
      -H "Content-Type: application/json" \
      -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
    ```

### 3. Set Up Custom Domain (Optional)

1. Go to your API service settings
2. Click "Settings" → "Domains"
3. Click "Generate Domain" for a Railway subdomain
4. Or add your custom domain

## Environment-Specific Configurations

### Staging Environment

```bash
NODE_ENV=production
STAGING=true
SERVER_URL=https://swaplink-staging.railway.app
FRONTEND_URL=https://staging.swaplink.app
AWS_BUCKET_NAME=swaplink-staging
```

### Production Environment

```bash
NODE_ENV=production
STAGING=false
SERVER_URL=https://api.swaplink.com
FRONTEND_URL=https://swaplink.app
AWS_BUCKET_NAME=swaplink-production
```

## Troubleshooting

### Build Failures

**Issue**: Build fails with "Cannot find module"
**Solution**: Ensure all dependencies are in `package.json` and `pnpm-lock.yaml` is committed

**Issue**: Prisma client not generated
**Solution**: Check that `pnpm db:generate` runs in Dockerfile

### Runtime Errors

**Issue**: "Connection refused" to database
**Solution**:

-   Verify `DATABASE_URL` is set correctly
-   Check that PostgreSQL service is running
-   Ensure services are in the same Railway project

**Issue**: Redis connection fails
**Solution**:

-   Verify `REDIS_URL` is set correctly
-   Check Redis service is running
-   Ensure format is `redis://default:password@host:port`

**Issue**: "Port already in use"
**Solution**: Railway automatically assigns ports. Ensure you're using `process.env.PORT` in your code

### Migration Issues

**Issue**: Migrations don't run automatically
**Solution**: Run manually via Railway CLI:

```bash
railway run pnpm db:deploy
```

**Issue**: "Migration failed" error
**Solution**:

-   Check migration files are committed
-   Verify database connection
-   Try resetting: `railway run pnpm db:reset` (⚠️ destroys data)

### Worker Not Processing Jobs

**Issue**: Jobs stuck in queue
**Solution**:

-   Verify worker service is running
-   Check worker logs for errors
-   Ensure `REDIS_URL` is identical in both services
-   Verify BullMQ configuration

## Monitoring and Logs

### View Logs

```bash
# Via CLI
railway logs

# Follow logs in real-time
railway logs --follow

# View specific service
railway logs --service swaplink-api-staging
```

### Metrics

-   Railway provides built-in metrics in the dashboard
-   Monitor CPU, Memory, and Network usage
-   Set up alerts for service downtime

## Scaling

### Horizontal Scaling

Railway supports multiple replicas:

1. Go to service settings
2. Under "Deploy", adjust "Replicas"
3. Note: Requires paid plan

### Vertical Scaling

Upgrade your plan for more resources:

-   **Hobby Plan**: $5/month per service
-   **Pro Plan**: $20/month (team features)

## Cost Optimization

### Free Tier Limits

-   $5 free credit per month
-   Shared CPU and memory
-   500 hours of usage

### Tips to Reduce Costs

1. **Use staging environment sparingly** - Deploy only when needed
2. **Optimize Docker image** - Remove unnecessary dependencies
3. **Monitor usage** - Check Railway dashboard regularly
4. **Use sleep mode** - For development environments

## CI/CD Integration

Railway automatically deploys on git push. To customize:

### GitHub Actions Example

```yaml
name: Deploy to Railway

on:
    push:
        branches: [main]

jobs:
    deploy:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3

            - name: Install Railway CLI
              run: npm i -g @railway/cli

            - name: Deploy to Railway
              run: railway up
              env:
                  RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## Security Best Practices

1. **Secrets Management**

    - Never commit secrets to git
    - Use Railway's environment variables
    - Rotate secrets regularly

2. **Network Security**

    - Railway services are private by default
    - Only expose necessary services
    - Use HTTPS for all public endpoints

3. **Database Security**
    - Railway PostgreSQL is private by default
    - Use strong passwords (auto-generated)
    - Regular backups (automatic on paid plans)

## Backup and Recovery

### Database Backups

Railway Pro plan includes automatic backups. For manual backups:

```bash
# Export database
railway run pg_dump $DATABASE_URL > backup.sql

# Restore database
railway run psql $DATABASE_URL < backup.sql
```

### Redis Persistence

Railway Redis includes persistence. For manual snapshots:

```bash
railway run redis-cli BGSAVE
```

## Additional Resources

-   [Railway Documentation](https://docs.railway.app)
-   [Railway Discord](https://discord.gg/railway)
-   [Railway Status](https://status.railway.app)
-   [Pricing](https://railway.app/pricing)

## Support

For issues specific to Railway:

-   Check [Railway Docs](https://docs.railway.app)
-   Join [Railway Discord](https://discord.gg/railway)
-   Email: team@railway.app

For SwapLink-specific issues:

-   Check application logs
-   Review environment variables
-   Verify external service credentials (Resend, AWS, etc.)
