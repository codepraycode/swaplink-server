# P2P Order Worker - Verification Guide

## Worker Status: ✅ RUNNING

### Process Information

-   **Worker Process**: Running (PID: 418031)
-   **Worker File**: `dist/worker/index.js`
-   **Queue Name**: `p2p-order-queue`
-   **Concurrency**: 5 jobs at a time

---

## Worker Configuration

### Jobs Handled

The worker listens for two types of jobs:

1. **`order-timeout`** - Auto-cancel expired orders

    - Triggered: 15 minutes after order creation
    - Action: Refunds locked funds and cancels order

2. **`release-funds`** - Process fund settlement
    - Triggered: When seller confirms order
    - Action: Moves NGN between wallets, creates transaction records

### Queue Connection

```typescript
export const p2pOrderWorker = new Worker(
    'p2p-order-queue', // ✅ Matches queue name
    async job => {
        if (job.name === 'order-timeout') {
            return await processOrderExpiration(job);
        } else if (job.name === 'release-funds') {
            return await processFundRelease(job);
        }
    },
    {
        connection: redisConnection,
        concurrency: 5,
    }
);
```

---

## How Jobs Are Created

### 1. Order Timeout Job

**Created in**: `P2POrderService.createOrder()`

```typescript
await getP2POrderQueue().add(
    'order-timeout', // ✅ Job name matches worker
    { orderId: order.id },
    { delay: 15 * 60 * 1000 } // 15 minutes
);
```

### 2. Fund Release Job

**Created in**: `P2POrderService.confirmOrder()`

```typescript
await getP2POrderQueue().add(
    'release-funds', // ✅ Job name matches worker
    { orderId }
);
```

---

## Verification Steps

### Step 1: Check Worker Process

```bash
pgrep -f "dist/worker/index.js"
# Should return a process ID
```

**Status**: ✅ Running (PID: 418031)

### Step 2: Check Worker Logs

Look for these log messages:

-   `🔄 Initializing worker services...`
-   `🚀 Background Workers Started`
-   `P2P Order Job {id} (order-timeout) completed`
-   `P2P Order Job {id} (release-funds) completed`

### Step 3: Test Order Expiration

1. Create an order
2. Wait 15 minutes (or modify delay for testing)
3. Check if order status changes to CANCELLED
4. Verify funds are refunded

### Step 4: Test Fund Release

1. Create an order
2. Mark as PAID
3. Confirm the order
4. Check worker logs for: `Funds released successfully for order {id}`
5. Verify transaction records created
6. Verify balances updated

---

## Worker Event Handlers

### On Job Completed

```typescript
p2pOrderWorker.on('completed', job => {
    logger.info(`P2P Order Job ${job.id} (${job.name}) completed`);
});
```

### On Job Failed

```typescript
p2pOrderWorker.on('failed', (job, err) => {
    logger.error(`P2P Order Job ${job?.id} (${job?.name}) failed`, err);
});
```

---

## Common Issues & Solutions

### Issue 1: Jobs Not Processing

**Symptoms**: Orders don't expire, funds don't release

**Checks**:

1. ✅ Worker process running?
2. ✅ Redis connection working?
3. ✅ Queue name matches? (`p2p-order-queue`)
4. ✅ Job names match? (`order-timeout`, `release-funds`)

**Solution**: All checks passed ✅

### Issue 2: Job Name Mismatch (FIXED)

**Problem**: Service created `'checkOrderExpiration'`, worker expected `'order-timeout'`

**Fix**: Changed to `'order-timeout'` in service ✅

### Issue 3: Worker Not Started

**Symptoms**: No worker process found

**Solution**: Start worker with:

```bash
pnpm run start:worker  # Production
# OR
pnpm run worker  # Development
# OR
pnpm run dev:all  # Both API and worker
```

---

## Testing the Worker

### Manual Test: Fund Release

1. **Create an order** (as buyer):

```bash
curl -X POST http://localhost:3000/api/v1/p2p/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "adId": "ad-id-here",
    "amount": 100,
    "paymentMethodId": "payment-method-id"
  }'
```

2. **Mark as paid** (upload proof):

```bash
# Upload proof via chat endpoint
# Then mark order as paid
```

3. **Confirm order** (as seller):

```bash
curl -X PATCH http://localhost:3000/api/v1/p2p/orders/{orderId}/confirm \
  -H "Authorization: Bearer SELLER_TOKEN"
```

4. **Check worker logs**:

```bash
# Look for:
# "Processing fund release for order {orderId}"
# "Funds released successfully for order {orderId}"
```

5. **Verify results**:

-   Check transaction records created
-   Check balances updated
-   Check notifications sent

---

## Worker Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      API Server                              │
│                                                              │
│  P2POrderService.createOrder()                              │
│    └─> Queue.add('order-timeout', {orderId}, {delay: 15m}) │
│                                                              │
│  P2POrderService.confirmOrder()                             │
│    └─> Queue.add('release-funds', {orderId})               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Redis Queue                               │
│                  (p2p-order-queue)                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Worker Process                             │
│                                                              │
│  p2pOrderWorker.on('order-timeout')                         │
│    └─> processOrderExpiration()                             │
│        └─> Refund funds, cancel order                       │
│                                                              │
│  p2pOrderWorker.on('release-funds')                         │
│    └─> processFundRelease()                                 │
│        └─> Move NGN, create transactions, notify users      │
└─────────────────────────────────────────────────────────────┘
```

---

## Conclusion

✅ **Worker is properly configured and running**

The P2P order worker is:

-   ✅ Running as a separate process
-   ✅ Connected to Redis queue
-   ✅ Listening for correct job names
-   ✅ Handling both expiration and fund release
-   ✅ Logging job completion and failures

**Next Steps**:

1. Test with a real order to verify fund release
2. Monitor worker logs for any errors
3. Check transaction records after confirmation
4. Verify notifications are sent to users
