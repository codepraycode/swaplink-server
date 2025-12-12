# Module Routes Architecture

## Overview

The `modules/routes.ts` file serves as a **central route aggregator** that collects and mounts all module/feature routes in the application.

## Structure

```
src/
├── app.ts                    # Main Express app (imports from modules/routes)
├── modules/
│   ├── routes.ts            # ✨ Central route aggregator
│   ├── auth/
│   │   ├── auth.routes.ts   # Auth-specific routes
│   │   ├── auth.controller.ts
│   │   └── auth.service.ts
│   └── [future-modules]/
│       └── [module].routes.ts
```

## How It Works

### 1. **Module Routes** (`modules/auth/auth.routes.ts`)

Each module defines its own routes:

```typescript
// modules/auth/auth.routes.ts
import { Router } from 'express';
import authController from './auth.controller';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authController.me);
// ... more auth routes

export default router;
```

### 2. **Route Aggregator** (`modules/routes.ts`)

The aggregator imports and mounts all module routes:

```typescript
// modules/routes.ts
import { Router } from 'express';
import authRoutes from './auth/auth.routes';

const router: Router = Router();

// Mount each module under its base path
router.use('/auth', authRoutes);
// router.use('/wallet', walletRoutes);     // Future
// router.use('/transactions', txRoutes);   // Future

export default router;
```

### 3. **Main App** (`app.ts`)

The app mounts the aggregator under the API version prefix:

```typescript
// app.ts
import routes from './modules/routes';

const API_ROUTE = '/api/v1';
app.use(API_ROUTE, routes);
```

## Final URL Structure

With this setup, your routes will be accessible at:

```
/api/v1/auth/register       → POST
/api/v1/auth/login          → POST
/api/v1/auth/me             → GET
/api/v1/auth/otp/phone      → POST
/api/v1/auth/verify/phone   → POST
... etc
```

## Adding New Modules

To add a new module (e.g., `wallet`):

1. **Create the module structure:**

    ```
    src/modules/wallet/
    ├── wallet.routes.ts
    ├── wallet.controller.ts
    └── wallet.service.ts
    ```

2. **Define routes in `wallet.routes.ts`:**

    ```typescript
    import { Router } from 'express';
    import walletController from './wallet.controller';

    const router = Router();

    router.get('/balance', walletController.getBalance);
    router.post('/deposit', walletController.deposit);

    export default router;
    ```

3. **Register in `modules/routes.ts`:**

    ```typescript
    import authRoutes from './auth/auth.routes';
    import walletRoutes from './wallet/wallet.routes'; // Add import

    router.use('/auth', authRoutes);
    router.use('/wallet', walletRoutes); // Mount routes
    ```

4. **Routes are now available at:**
    ```
    /api/v1/wallet/balance  → GET
    /api/v1/wallet/deposit  → POST
    ```

## Benefits

✅ **Centralized Management**: All route mounting happens in one place  
✅ **Scalability**: Easy to add new modules without touching app.ts  
✅ **Consistency**: Enforces a standard pattern across all modules  
✅ **Maintainability**: Clear separation of concerns  
✅ **Discoverability**: One file to see all available API modules
