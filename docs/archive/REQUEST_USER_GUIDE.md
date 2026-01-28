# Request.user Type Declaration Guide

## Overview

The `req.user` property is automatically populated by the authentication middleware after JWT token verification. It contains the decoded token payload with user information.

## Type Definition

```typescript
// src/types/express.d.ts
import { TokenPayload } from '../lib/utils/jwt-utils';

declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
            deviceId?: string;
            appVersion?: string;
            requestId?: string;
        }
    }
}
```

## TokenPayload Interface

```typescript
// src/lib/utils/jwt-utils.ts
export interface TokenPayload extends JwtPayload {
    userId: string | number; // User ID from database
    email?: string; // User email
    role?: string; // User role (admin, user, etc.)
    iat?: number; // Issued at (timestamp)
    exp?: number; // Expiration (timestamp)
}
```

## Usage Examples

### 1. Basic Usage (After Authentication)

```typescript
import { Request, Response } from 'express';

export const getProfile = (req: Request, res: Response) => {
    // Use ! when you're certain user exists (after authenticate middleware)
    const userId = req.user!.userId;
    const email = req.user!.email;

    res.json({ userId, email });
};
```

### 2. Safe Access (Optional Authentication)

```typescript
export const getData = (req: Request, res: Response) => {
    // Use optional chaining when user might not be authenticated
    const userId = req.user?.userId;

    if (userId) {
        // User-specific data
    } else {
        // Public data
    }
};
```

### 3. Type Guard Pattern

```typescript
export const updateProfile = (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // After guard, TypeScript knows req.user is defined
    const userId = req.user.userId;
};
```

### 4. In Routes

```typescript
import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

// Protected route
router.get('/profile', authenticate, controller.getProfile);

// Optional auth
router.get('/data', optionalAuth, controller.getData);
```

## Authentication Middleware

### `authenticate`

Requires valid JWT token. Throws error if missing or invalid.

```typescript
// Usage
router.get('/protected', authenticate, controller.handler);
```

### `optionalAuth`

Populates `req.user` if token is present, but doesn't block if missing.

```typescript
// Usage
router.get('/public-or-private', optionalAuth, controller.handler);
```

### `requireRole`

Ensures user has specific role. Must be used after `authenticate`.

```typescript
// Usage
router.delete('/admin-only', authenticate, requireRole(['admin']), controller.handler);
```

## JWT Token Structure

When a user logs in, they receive a JWT token:

```json
{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "role": "user",
    "iat": 1702345678,
    "exp": 1702432078
}
```

This is decoded and attached to `req.user` by the middleware.

## Sending Tokens from Client

### Authorization Header

```typescript
// Client-side (React Native, Web)
const response = await fetch('/api/v1/auth/me', {
    headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
    },
});
```

### Axios Example

```typescript
import axios from 'axios';

const api = axios.create({
    baseURL: 'https://api.swaplink.app/api/v1',
});

// Add token to all requests
api.interceptors.request.use(config => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

## TypeScript Autocomplete

With the type declaration, you get full IntelliSense:

```typescript
req.user.       // TypeScript suggests:
  ├─ userId     ✓
  ├─ email      ✓
  ├─ role       ✓
  ├─ iat        ✓
  └─ exp        ✓
```

## Common Patterns

### 1. Ensure Resource Ownership

```typescript
export const getTransaction = async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { transactionId } = req.params;

    const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
    });

    // Ensure transaction belongs to user
    if (transaction.userId !== userId) {
        throw new UnauthorizedError('Access denied');
    }

    res.json(transaction);
};
```

### 2. Audit Logging

```typescript
export const createTransaction = async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const transaction = await prisma.transaction.create({
        data: {
            ...req.body,
            userId, // Auto-attach user ID
            createdBy: userId,
        },
    });

    logger.info(`Transaction created by user ${userId}`);
};
```

### 3. Role-Based Logic

```typescript
export const getUsers = async (req: Request, res: Response) => {
    const userRole = req.user?.role || 'user';

    if (userRole === 'admin') {
        // Return all users
        const users = await prisma.user.findMany();
        return res.json(users);
    }

    // Regular users can only see themselves
    const user = await prisma.user.findUnique({
        where: { id: req.user!.userId as string },
    });

    res.json([user]);
};
```

## Troubleshooting

### `req.user` is undefined

**Cause**: Authentication middleware not applied to route

**Solution**: Add `authenticate` middleware

```typescript
// ❌ Wrong
router.get('/profile', controller.getProfile);

// ✅ Correct
router.get('/profile', authenticate, controller.getProfile);
```

### TypeScript error: "Property 'user' does not exist"

**Cause**: Type declaration not loaded

**Solution**: Ensure `src/types/express.d.ts` exists and `tsconfig.json` includes it

```json
{
    "include": ["src/**/*"]
}
```

### Token verification fails

**Cause**: Invalid token or wrong secret

**Solution**: Check JWT_SECRET in `.env` matches the one used to sign tokens

## Security Best Practices

1. **Always validate user ownership**

    ```typescript
    if (resource.userId !== req.user!.userId) {
        throw new UnauthorizedError();
    }
    ```

2. **Use short token expiration**

    ```env
    JWT_ACCESS_EXPIRATION=15m  # 15 minutes
    ```

3. **Implement refresh tokens**

    ```typescript
    // Refresh endpoint
    router.post('/refresh', refreshTokenController);
    ```

4. **Never trust client-provided user IDs**

    ```typescript
    // ❌ Wrong - client can fake userId
    const userId = req.body.userId;

    // ✅ Correct - use authenticated user
    const userId = req.user!.userId;
    ```

## Additional Properties

### Device ID

```typescript
req.deviceId; // From X-Device-ID header
```

### App Version

```typescript
req.appVersion; // From X-App-Version header
```

### Request ID

```typescript
req.requestId; // Auto-generated UUID for tracking
```

## See Also

-   [JWT Utils Documentation](../lib/utils/jwt-utils.ts)
-   [Authentication Middleware](../middlewares/auth.middleware.ts)
-   [Usage Examples](./examples/using-req-user.ts)
