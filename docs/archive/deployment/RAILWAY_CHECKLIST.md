# Railway Deployment Checklist

Use this checklist to ensure a smooth deployment to Railway.

## Pre-Deployment

### 1. Code Preparation

-   [ ] All code committed and pushed to GitHub
-   [ ] `package.json` and `pnpm-lock.yaml` are up to date
-   [ ] Dockerfile builds successfully locally
-   [ ] All tests passing
-   [ ] No sensitive data in code (secrets, API keys, etc.)

### 2. External Services Setup

-   [ ] **Resend Account**
    -   [ ] Account created at [resend.com](https://resend.com)
    -   [ ] API key generated
    -   [ ] Domain verified (optional, can use resend.dev)
-   [ ] **Storage (S3/R2)**

    -   [ ] Bucket created
    -   [ ] Access credentials generated
    -   [ ] CORS configured for your frontend domain
    -   [ ] Bucket is private (not public)

-   [ ] **Globus Bank** (Optional for staging)
    -   [ ] Sandbox account created
    -   [ ] API credentials obtained
    -   [ ] Webhook URL configured

### 3. Railway Account Setup

-   [ ] Railway account created at [railway.app](https://railway.app)
-   [ ] GitHub connected to Railway
-   [ ] Payment method added (if using paid features)

## Railway Project Setup

### 4. Create New Project

-   [ ] New project created in Railway
-   [ ] Project named appropriately (e.g., "swaplink-staging")
-   [ ] GitHub repository connected

### 5. Add Database Services

#### PostgreSQL

-   [ ] PostgreSQL service added to project
-   [ ] Database name set (e.g., "swaplink_staging")
-   [ ] `DATABASE_URL` variable auto-generated
-   [ ] Connection verified

#### Redis

-   [ ] Redis service added to project
-   [ ] `REDIS_URL` variable auto-generated
-   [ ] Connection verified

### 6. Configure API Service

#### Basic Settings

-   [ ] Service name: `swaplink-api-staging`
-   [ ] GitHub repository connected
-   [ ] Branch selected (e.g., `main` or `staging`)
-   [ ] Root directory set (if monorepo)

#### Build Settings

-   [ ] Builder: Dockerfile
-   [ ] Dockerfile path: `./Dockerfile`
-   [ ] Build command: (leave empty, uses Dockerfile)

#### Deploy Settings

-   [ ] Start command: `node dist/api/server.js`
-   [ ] Health check path: `/api/v1/health`
-   [ ] Restart policy: On failure
-   [ ] Replicas: 1 (for staging)

#### Environment Variables

Copy from `ENV_RAILWAY.md` and set:

**Application**

-   [ ] `NODE_ENV=production`
-   [ ] `STAGING=true`
-   [ ] `PORT=3000`
-   [ ] `SERVER_URL` (update after domain assigned)
-   [ ] `ENABLE_FILE_LOGGING=false`

**Database**

-   [ ] `DATABASE_URL=${{Postgres.DATABASE_URL}}`

**Redis**

-   [ ] `REDIS_URL=${{Redis.REDIS_URL}}`
-   [ ] `REDIS_PORT=6379`

**JWT**

-   [ ] `JWT_SECRET` (generate with `openssl rand -base64 32`)
-   [ ] `JWT_ACCESS_EXPIRATION=15m`
-   [ ] `JWT_REFRESH_SECRET` (generate with `openssl rand -base64 32`)
-   [ ] `JWT_REFRESH_EXPIRATION=7d`

**Email**

-   [ ] `SMTP_HOST=smtp.resend.com`
-   [ ] `SMTP_PORT=587`
-   [ ] `SMTP_USER=resend`
-   [ ] `SMTP_PASSWORD` (Resend API key)
-   [ ] `EMAIL_TIMEOUT=10000`
-   [ ] `FROM_EMAIL=onboarding@swaplink.com`
-   [ ] `RESEND_API_KEY` (Resend API key)

**Frontend**

-   [ ] `FRONTEND_URL` (your frontend URL)
-   [ ] `CORS_URLS` (comma-separated allowed origins)

**Storage**

-   [ ] `AWS_ACCESS_KEY_ID`
-   [ ] `AWS_SECRET_ACCESS_KEY`
-   [ ] `AWS_REGION`
-   [ ] `AWS_BUCKET_NAME`
-   [ ] `AWS_ENDPOINT`

**System**

-   [ ] `SYSTEM_USER_ID=system-wallet-user`

**Globus (Optional)**

-   [ ] `GLOBUS_SECRET_KEY`
-   [ ] `GLOBUS_WEBHOOK_SECRET`
-   [ ] `GLOBUS_BASE_URL`
-   [ ] `GLOBUS_CLIENT_ID`

### 7. Configure Worker Service

#### Basic Settings

-   [ ] Service name: `swaplink-worker-staging`
-   [ ] Same GitHub repository connected
-   [ ] Same branch as API service

#### Build Settings

-   [ ] Builder: Dockerfile
-   [ ] Dockerfile path: `./Dockerfile`

#### Deploy Settings

-   [ ] Start command: `node dist/worker/index.js`
-   [ ] No health check needed
-   [ ] Restart policy: On failure
-   [ ] Replicas: 1

#### Environment Variables

-   [ ] Copy **all** environment variables from API service
-   [ ] Verify `DATABASE_URL` and `REDIS_URL` reference the same services

## Initial Deployment

### 8. Deploy Services

-   [ ] API service deployed successfully
-   [ ] Worker service deployed successfully
-   [ ] No build errors in logs
-   [ ] No runtime errors in logs

### 9. Run Database Migrations

Choose one method:

**Option A: Via Railway CLI**

```bash
railway link
railway run pnpm db:deploy
```

-   [ ] Migrations completed successfully

**Option B: Via Service Shell**

-   [ ] Open API service in Railway
-   [ ] Click "Shell" tab
-   [ ] Run: `pnpm db:deploy`
-   [ ] Migrations completed successfully

**Option C: Add to Dockerfile** (if not already)

-   [ ] Add `RUN pnpm db:deploy` to Dockerfile
-   [ ] Redeploy service

### 10. Verify Deployment

#### Health Checks

-   [ ] API health endpoint responds: `GET /api/v1/health`
-   [ ] Response is 200 OK
-   [ ] Database connection confirmed
-   [ ] Redis connection confirmed

#### Test Endpoints

-   [ ] Signup endpoint works
-   [ ] Login endpoint works
-   [ ] Protected endpoints require authentication
-   [ ] Email sending works (check Resend dashboard)

#### Check Logs

-   [ ] API service logs show no errors
-   [ ] Worker service logs show no errors
-   [ ] Database queries executing successfully
-   [ ] Redis connections stable

## Post-Deployment Configuration

### 11. Domain Setup

-   [ ] Railway-provided domain noted
-   [ ] Custom domain added (optional)
-   [ ] DNS configured (if custom domain)
-   [ ] SSL certificate active
-   [ ] `SERVER_URL` environment variable updated

### 12. Update External Services

-   [ ] Frontend updated with new API URL
-   [ ] Globus webhook URL updated (if using)
-   [ ] Any other webhooks updated

### 13. Monitoring Setup

-   [ ] Railway metrics dashboard reviewed
-   [ ] Log retention configured
-   [ ] Alerts configured (optional, paid feature)

## Testing

### 14. Functional Testing

-   [ ] User registration flow
-   [ ] Email verification
-   [ ] Phone verification
-   [ ] Login flow
-   [ ] Password reset
-   [ ] Profile updates
-   [ ] Wallet operations
-   [ ] Transfer operations
-   [ ] File uploads

### 15. Integration Testing

-   [ ] Email delivery (check Resend)
-   [ ] SMS delivery (if applicable)
-   [ ] Push notifications
-   [ ] Webhook processing
-   [ ] Background jobs processing

### 16. Performance Testing

-   [ ] API response times acceptable
-   [ ] Database queries optimized
-   [ ] No memory leaks
-   [ ] Worker processing jobs timely

## Security

### 17. Security Checklist

-   [ ] All secrets stored in Railway environment variables
-   [ ] No secrets in code or logs
-   [ ] HTTPS enabled (automatic with Railway)
-   [ ] CORS configured correctly
-   [ ] Rate limiting enabled
-   [ ] Helmet middleware active
-   [ ] Database not publicly accessible
-   [ ] Redis not publicly accessible

### 18. Access Control

-   [ ] Railway project access limited to team members
-   [ ] GitHub repository access controlled
-   [ ] External service API keys rotated if needed

## Documentation

### 19. Update Documentation

-   [ ] `README.md` updated with Railway deployment info
-   [ ] `RAILWAY_DEPLOYMENT.md` reviewed
-   [ ] Environment variables documented
-   [ ] Deployment process documented
-   [ ] Troubleshooting guide updated

### 20. Team Communication

-   [ ] Team notified of deployment
-   [ ] Deployment URL shared
-   [ ] Access credentials shared securely
-   [ ] Known issues documented

## Maintenance

### 21. Backup Strategy

-   [ ] Database backup strategy defined
-   [ ] Backup schedule configured (Railway Pro)
-   [ ] Restore procedure tested

### 22. Monitoring Plan

-   [ ] Log monitoring strategy defined
-   [ ] Error tracking configured
-   [ ] Performance monitoring active
-   [ ] Uptime monitoring configured

### 23. Update Strategy

-   [ ] Deployment workflow defined
-   [ ] Rollback procedure documented
-   [ ] Zero-downtime deployment strategy (if needed)

## Production Deployment (When Ready)

### 24. Production Preparation

-   [ ] All staging tests passed
-   [ ] Performance benchmarks met
-   [ ] Security audit completed
-   [ ] Load testing completed

### 25. Production Environment

-   [ ] Separate Railway project for production
-   [ ] Production database created
-   [ ] Production Redis created
-   [ ] Production environment variables set
-   [ ] `STAGING=false` in production
-   [ ] Production domain configured
-   [ ] SSL certificate for production domain

### 26. Production Deployment

-   [ ] Production services deployed
-   [ ] Database migrations run
-   [ ] Smoke tests passed
-   [ ] Monitoring active
-   [ ] Team notified

## Troubleshooting

### Common Issues Checklist

#### Build Failures

-   [ ] Check build logs in Railway
-   [ ] Verify Dockerfile syntax
-   [ ] Ensure all dependencies in package.json
-   [ ] Check pnpm-lock.yaml is committed

#### Runtime Errors

-   [ ] Check service logs
-   [ ] Verify all environment variables set
-   [ ] Check database connection
-   [ ] Check Redis connection
-   [ ] Verify external service credentials

#### Database Issues

-   [ ] Verify DATABASE_URL format
-   [ ] Check migrations ran successfully
-   [ ] Verify database service is running
-   [ ] Check connection limits

#### Worker Issues

-   [ ] Verify worker service is running
-   [ ] Check worker logs
-   [ ] Verify Redis connection
-   [ ] Check job queue status

## Notes

-   **Railway Free Tier**: $5 credit per month, suitable for testing
-   **Staging Costs**: Estimate ~$10-20/month for staging environment
-   **Production Costs**: Scale based on usage, start with Hobby plan ($5/service/month)
-   **Support**: Railway Discord is very responsive for issues

## Useful Commands

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy
railway up

# Run migrations
railway run pnpm db:deploy

# View logs
railway logs --follow

# Open service shell
railway shell

# List services
railway service

# Set environment variable
railway variables set KEY=value
```

## Next Steps After Deployment

1. Monitor logs for first 24 hours
2. Test all critical flows
3. Set up error tracking (Sentry, etc.)
4. Configure backups
5. Document any issues encountered
6. Plan for production deployment

---

**Deployment Date**: ******\_\_\_******  
**Deployed By**: ******\_\_\_******  
**Railway Project URL**: ******\_\_\_******  
**API URL**: ******\_\_\_******  
**Notes**: ******\_\_\_******
