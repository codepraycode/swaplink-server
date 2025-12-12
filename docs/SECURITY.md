# Security Configuration Guide

## Overview

SwapLink implements comprehensive security measures to protect against common web vulnerabilities and attacks. This document outlines all security configurations and best practices implemented in the application.

## Table of Contents

1. [CORS Configuration](#cors-configuration)
2. [Security Headers (Helmet)](#security-headers-helmet)
3. [Rate Limiting](#rate-limiting)
4. [Request Body Size Limits](#request-body-size-limits)
5. [Request ID Tracking](#request-id-tracking)
6. [Environment Variables](#environment-variables)
7. [Best Practices](#best-practices)

---

## CORS Configuration

### What is CORS?

Cross-Origin Resource Sharing (CORS) is a security feature that restricts web pages from making requests to a different domain than the one serving the web page.

### Our Configuration

```typescript
// config/security.config.ts
export const corsConfig: CorsOptions = {
    origin: (origin, callback) => {
        // Whitelist origins from environment variable
        const allowedOrigins = envConfig.CORS_URLS.split(',');

        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(new Error('Origin not allowed by CORS policy'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-*'],
    maxAge: 600, // 10 minutes
};
```

### Environment Setup

Add allowed origins to your `.env` file:

```env
# Development
CORS_URLS=http://localhost:3000,http://localhost:5173

# Production
CORS_URLS=https://swaplink.app,https://www.swaplink.app
```

---

## Security Headers (Helmet)

### What is Helmet?

Helmet helps secure Express apps by setting various HTTP headers to protect against common vulnerabilities.

### Headers We Set

| Header                        | Purpose                       | Our Setting                               |
| ----------------------------- | ----------------------------- | ----------------------------------------- |
| **Content-Security-Policy**   | Prevents XSS attacks          | Strict policy, only self-hosted resources |
| **Strict-Transport-Security** | Forces HTTPS                  | 1 year max-age, includeSubDomains         |
| **X-Frame-Options**           | Prevents clickjacking         | DENY                                      |
| **X-Content-Type-Options**    | Prevents MIME sniffing        | nosniff                                   |
| **X-XSS-Protection**          | XSS filter for older browsers | Enabled                                   |
| **Referrer-Policy**           | Controls referrer info        | strict-origin-when-cross-origin           |
| **X-DNS-Prefetch-Control**    | Controls DNS prefetching      | Disabled                                  |

### Configuration

```typescript
export const helmetConfig: HelmetOptions = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            // ... more directives
        },
    },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    hidePoweredBy: true,
};
```

---

## Rate Limiting

### Why Rate Limiting?

Rate limiting protects your API from:

-   Brute-force attacks
-   DDoS attacks
-   API abuse
-   Excessive resource consumption

### Rate Limit Tiers

| Endpoint Type      | Window | Max Requests | Use Case              |
| ------------------ | ------ | ------------ | --------------------- |
| **Global**         | 15 min | 100          | All endpoints         |
| **Authentication** | 15 min | 5            | Login/Register        |
| **OTP**            | 1 hour | 3            | OTP generation        |
| **Password Reset** | 1 hour | 3            | Password reset        |
| **Transactions**   | 1 min  | 10           | Transaction endpoints |
| **Wallet**         | 1 min  | 30           | Wallet queries        |

### Implementation

```typescript
// Auth routes with rate limiting
router.post('/login', rateLimiters.auth, authController.login);
router.post('/otp/phone', rateLimiters.otp, authController.sendPhoneOtp);
router.post(
    '/password/reset-request',
    rateLimiters.passwordReset,
    authController.requestPasswordReset
);
```

### Response Headers

When rate limited, clients receive:

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1702345678
Content-Type: application/json

{
  "error": "Too many authentication attempts, please try again later."
}
```

---

## Request Body Size Limits

### Why Limit Body Size?

Prevents:

-   Memory exhaustion attacks
-   Large payload attacks
-   Server overload

### Our Limits

```typescript
export const bodySizeLimits = {
    json: '10kb', // JSON payloads
    urlencoded: '10kb', // Form data
    fileUpload: '5mb', // File uploads (KYC documents)
};
```

### Implementation

```typescript
app.use(express.json({ limit: securityConfig.bodySize.json }));
app.use(
    express.urlencoded({
        extended: true,
        limit: securityConfig.bodySize.urlencoded,
    })
);
```

---

## Request ID Tracking

### Purpose

-   Track requests across distributed systems
-   Correlate logs for debugging
-   Audit trail for security incidents

### Implementation

```typescript
app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'] || randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
});
```

### Usage

Clients can:

1. Send their own request ID: `X-Request-ID: custom-id-123`
2. Receive the request ID in response headers
3. Use it for support/debugging

---

## Environment Variables

### Required Security Variables

```env
# JWT Secrets (use strong, random strings)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_ACCESS_EXPIRATION=24h
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_REFRESH_EXPIRATION=7d

# CORS
CORS_URLS=http://localhost:3000,https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/swaplink

# External Services
GLOBUS_SECRET_KEY=your-globus-secret
GLOBUS_WEBHOOK_SECRET=your-webhook-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@swaplink.app
```

### Generating Secure Secrets

```bash
# Generate a secure random string (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use OpenSSL
openssl rand -hex 32
```

---

## Best Practices

### 1. **Always Use HTTPS in Production**

```typescript
// Force HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}
```

### 2. **Keep Dependencies Updated**

```bash
# Check for vulnerabilities
pnpm audit

# Update dependencies
pnpm update
```

### 3. **Environment-Specific Configurations**

```typescript
// Development: Relaxed CORS
CORS_URLS=*

// Production: Strict whitelist
CORS_URLS=https://swaplink.app,https://www.swaplink.app
```

### 4. **Monitor Rate Limit Violations**

```typescript
// Log rate limit violations
app.use((req, res, next) => {
    if (res.statusCode === 429) {
        logger.warn(`Rate limit exceeded: ${req.ip} - ${req.path}`);
    }
    next();
});
```

### 5. **Regular Security Audits**

-   Review security configurations quarterly
-   Update Helmet and other security packages
-   Monitor security advisories
-   Conduct penetration testing

### 6. **Input Validation**

Always validate and sanitize user input:

```typescript
import { z } from 'zod';

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

// Use in routes
router.post('/login', validateBody(loginSchema), authController.login);
```

### 7. **Secure Password Storage**

```typescript
// Always hash passwords with bcrypt
const hashedPassword = await bcrypt.hash(password, 12);
```

### 8. **JWT Best Practices**

-   Use short expiration times (15-30 minutes for access tokens)
-   Implement refresh token rotation
-   Store refresh tokens securely
-   Blacklist compromised tokens

---

## Security Checklist

-   [ ] HTTPS enabled in production
-   [ ] CORS properly configured
-   [ ] Rate limiting on all sensitive endpoints
-   [ ] Helmet security headers configured
-   [ ] Request body size limits set
-   [ ] JWT secrets are strong and secure
-   [ ] Environment variables properly set
-   [ ] Input validation on all endpoints
-   [ ] Passwords hashed with bcrypt
-   [ ] SQL injection prevention (using Prisma ORM)
-   [ ] XSS prevention (input sanitization)
-   [ ] CSRF protection (SameSite cookies)
-   [ ] Regular dependency updates
-   [ ] Security monitoring and logging

---

## Incident Response

### If a Security Breach Occurs:

1. **Immediate Actions**

    - Rotate all secrets (JWT, API keys, database passwords)
    - Invalidate all active sessions
    - Review access logs

2. **Investigation**

    - Identify the attack vector
    - Assess the scope of the breach
    - Document findings

3. **Remediation**

    - Patch the vulnerability
    - Notify affected users
    - Update security measures

4. **Post-Incident**
    - Conduct a post-mortem
    - Update security policies
    - Implement additional safeguards

---

## Additional Resources

-   [OWASP Top 10](https://owasp.org/www-project-top-ten/)
-   [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
-   [Helmet.js Documentation](https://helmetjs.github.io/)
-   [Express Rate Limit](https://github.com/express-rate-limit/express-rate-limit)
-   [CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

## Support

For security concerns or to report vulnerabilities, contact:

-   Email: security@swaplink.app
-   Create a private security advisory on GitHub

**Do not publicly disclose security vulnerabilities.**
