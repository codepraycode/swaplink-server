# SwapLink Server - Deployment Checklist

Use this checklist to ensure a smooth deployment to Render.

## 📋 Pre-Deployment Checklist

### 1. Code Preparation

-   [ ] All code is committed to Git
-   [ ] Code is pushed to GitHub repository
-   [ ] `render.yaml` is present in the root directory
-   [ ] `Dockerfile` is present and tested
-   [ ] All tests are passing (`pnpm test`)
-   [ ] Build succeeds locally (`pnpm build`)

### 2. Environment Variables Prepared

-   [ ] Resend API key obtained from [resend.com](https://resend.com)
-   [ ] Domain verified in Resend dashboard
-   [ ] Globus Bank API credentials ready
-   [ ] AWS/Cloudflare R2 credentials ready
-   [ ] Frontend URL confirmed
-   [ ] CORS URLs list prepared

### 3. External Services

-   [ ] Resend account created and verified
-   [ ] Domain DNS records configured for Resend
-   [ ] Globus Bank API access confirmed
-   [ ] S3/R2 bucket created and accessible

## 🚀 Deployment Steps

### Step 1: Initial Deployment

-   [ ] Connected GitHub repository to Render
-   [ ] Blueprint detected and services created
-   [ ] All services show "Creating" or "Live" status

### Step 2: Configure Environment Variables

#### API Service (`swaplink-api-staging`)

-   [ ] `RESEND_API_KEY` set
-   [ ] `GLOBUS_SECRET_KEY` set
-   [ ] `GLOBUS_WEBHOOK_SECRET` set
-   [ ] `GLOBUS_BASE_URL` set
-   [ ] `GLOBUS_CLIENT_ID` set
-   [ ] `AWS_ACCESS_KEY_ID` set
-   [ ] `AWS_SECRET_ACCESS_KEY` set
-   [ ] `AWS_ENDPOINT` set (if using R2)
-   [ ] `FROM_EMAIL` updated to use verified domain
-   [ ] `FRONTEND_URL` set to production URL
-   [ ] `CORS_URLS` updated with production domains

#### Worker Service (`swaplink-worker-staging`)

-   [ ] Same environment variables as API service configured

### Step 3: Database Setup

-   [ ] PostgreSQL database is running
-   [ ] Database connection successful
-   [ ] Migrations run successfully (`pnpm db:deploy`)
-   [ ] (Optional) Database seeded if needed

### Step 4: Redis Setup

-   [ ] Redis instance is running
-   [ ] Redis connection successful from both API and Worker

## ✅ Post-Deployment Verification

### 1. Service Health Checks

-   [ ] API service is "Live" in Render dashboard
-   [ ] Worker service is "Live" in Render dashboard
-   [ ] PostgreSQL database is "Available"
-   [ ] Redis instance is "Available"

### 2. API Endpoint Tests

-   [ ] Health endpoint responds: `https://your-api.onrender.com/api/v1/health`
-   [ ] Response shows `"status": "ok"`
-   [ ] Response shows `"environment": "production"`

### 3. Email Service Tests

-   [ ] Register a test user
-   [ ] Email OTP received successfully
-   [ ] Email appears in Resend dashboard
-   [ ] Email delivery status is "Delivered"
-   [ ] Password reset email works
-   [ ] Welcome email works

### 4. Worker Tests

-   [ ] Worker logs show successful startup
-   [ ] Worker logs show "Using Resend Email Service for production"
-   [ ] Background jobs are being processed
-   [ ] No errors in worker logs

### 5. Database Tests

-   [ ] Can create new users
-   [ ] Can perform transactions
-   [ ] Data persists correctly
-   [ ] No connection errors in logs

### 6. Redis Tests

-   [ ] Cache operations working
-   [ ] Job queue functioning
-   [ ] No connection errors in logs

### 7. Integration Tests

-   [ ] Complete user registration flow
-   [ ] Email verification works
-   [ ] Phone verification works
-   [ ] Login works
-   [ ] Wallet operations work
-   [ ] Transfer operations work
-   [ ] P2P features work

## 🔍 Monitoring Setup

### 1. Render Dashboard

-   [ ] Metrics enabled for all services
-   [ ] Alerts configured for service failures
-   [ ] Log retention configured

### 2. Resend Dashboard

-   [ ] Email analytics enabled
-   [ ] Delivery notifications configured
-   [ ] Bounce/complaint monitoring set up

### 3. Application Monitoring

-   [ ] Error logging working
-   [ ] Performance metrics tracked
-   [ ] Database query performance monitored

## 🔒 Security Verification

-   [ ] All secrets are stored in environment variables (not in code)
-   [ ] HTTPS is enabled (automatic with Render)
-   [ ] CORS is restricted to production domains only
-   [ ] Rate limiting is active
-   [ ] JWT secrets are strong and unique
-   [ ] Database credentials are secure
-   [ ] No sensitive data in logs

## 📊 Performance Checks

-   [ ] API response times are acceptable (< 500ms for most endpoints)
-   [ ] Database queries are optimized
-   [ ] Redis cache hit rate is good (> 80%)
-   [ ] Worker job processing is timely
-   [ ] No memory leaks detected
-   [ ] CPU usage is normal

## 🐛 Troubleshooting Checklist

If something goes wrong, check:

### Service Won't Start

-   [ ] Check build logs for errors
-   [ ] Verify all required environment variables are set
-   [ ] Check database connection string
-   [ ] Verify Redis connection string
-   [ ] Check for port conflicts

### Emails Not Sending

-   [ ] Verify `RESEND_API_KEY` is correct
-   [ ] Check domain is verified in Resend
-   [ ] Ensure `FROM_EMAIL` uses verified domain
-   [ ] Check Resend dashboard for errors
-   [ ] Verify email service is initialized (check logs)

### Database Connection Issues

-   [ ] Verify `DATABASE_URL` is correct
-   [ ] Check database service is running
-   [ ] Ensure database and API are in same region
-   [ ] Check database credentials
-   [ ] Verify migrations have run

### Worker Not Processing Jobs

-   [ ] Check worker service is running
-   [ ] Verify Redis connection
-   [ ] Check worker logs for errors
-   [ ] Ensure `REDIS_URL` matches between API and Worker
-   [ ] Verify job queue is not full

### CORS Errors

-   [ ] Update `CORS_URLS` to include frontend domain
-   [ ] Ensure URLs include protocol (https://)
-   [ ] Check for trailing slashes
-   [ ] Verify frontend is using correct API URL

## 📝 Documentation Updates

After successful deployment:

-   [ ] Update API documentation with production URL
-   [ ] Document any environment-specific configurations
-   [ ] Update frontend team with new API endpoints
-   [ ] Create runbook for common operations
-   [ ] Document backup and recovery procedures

## 🎉 Launch Checklist

Before announcing to users:

-   [ ] All tests passing in production
-   [ ] Email service fully functional
-   [ ] Payment processing working (if applicable)
-   [ ] User registration and login working
-   [ ] All critical features tested
-   [ ] Monitoring and alerts configured
-   [ ] Backup strategy in place
-   [ ] Support team briefed
-   [ ] Rollback plan documented

## 🔄 Ongoing Maintenance

Set up regular tasks:

-   [ ] Weekly: Review error logs
-   [ ] Weekly: Check service health metrics
-   [ ] Monthly: Review and rotate secrets
-   [ ] Monthly: Database backup verification
-   [ ] Quarterly: Security audit
-   [ ] Quarterly: Performance optimization review

---

## ✅ Deployment Complete!

Once all items are checked, your SwapLink server is successfully deployed and ready for production use!

**Next Steps:**

1. Monitor logs for the first 24 hours
2. Test all critical user flows
3. Set up automated monitoring alerts
4. Document any issues and resolutions
5. Plan for scaling as user base grows

**Support Resources:**

-   [Render Documentation](https://render.com/docs)
-   [Resend Documentation](https://resend.com/docs)
-   [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)
-   [ENV_VARIABLES.md](./ENV_VARIABLES.md)

---

**Congratulations on your successful deployment! 🚀**
