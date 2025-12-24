# Transfer Flow Sequence Diagram

## Two-Step Transfer Process

```
┌─────────┐                ┌─────────┐                ┌─────────┐
│ Client  │                │ Server  │                │  Redis  │
└────┬────┘                └────┬────┘                └────┬────┘
     │                          │                          │
     │                          │                          │
     │  STEP 1: VERIFY PIN      │                          │
     │ ─────────────────────────────────────────────────── │
     │                          │                          │
     │  POST /verify-pin        │                          │
     │  { pin: "1234" }         │                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │                          │  Verify PIN              │
     │                          │  (check hash, attempts)  │
     │                          │                          │
     │                          │  Generate UUID           │
     │                          │  idempotencyKey          │
     │                          │                          │
     │                          │  SETEX idempotency:uuid  │
     │                          │  userId, 300 seconds     │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │  OK                      │
     │                          │<─────────────────────────┤
     │                          │                          │
     │  { idempotencyKey,       │                          │
     │    expiresIn: 300 }      │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
     │                          │                          │
     │  STEP 2: PROCESS TRANSFER│                          │
     │ ─────────────────────────────────────────────────── │
     │                          │                          │
     │  POST /process           │                          │
     │  Header: Idempotency-Key │                          │
     │  { amount, account, ... }│                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │                          │  GET idempotency:uuid    │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │  userId                  │
     │                          │<─────────────────────────┤
     │                          │                          │
     │                          │  Validate userId matches │
     │                          │                          │
     │                          │  Check duplicate tx      │
     │                          │  (database)              │
     │                          │                          │
     │                          │  Resolve account         │
     │                          │  Check balance           │
     │                          │  Execute transfer        │
     │                          │                          │
     │                          │  DEL idempotency:uuid    │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │  OK                      │
     │                          │<─────────────────────────┤
     │                          │                          │
     │  { transactionId,        │                          │
     │    status, amount }      │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
     └──────────────────────────┴──────────────────────────┘
```

## Error Scenarios

### Scenario 1: Invalid PIN

```
Client          Server          Redis
  │               │               │
  │  POST /verify-pin             │
  │  { pin: "wrong" }             │
  ├──────────────>│               │
  │               │               │
  │               │  Check PIN    │
  │               │  ❌ Invalid   │
  │               │               │
  │               │  INCR attempts│
  │               ├──────────────>│
  │               │               │
  │  400 Bad Request              │
  │  "Invalid PIN. 2 attempts     │
  │   remaining."                 │
  │<──────────────┤               │
  │               │               │
```

### Scenario 2: Expired Idempotency Key

```
Client          Server          Redis
  │               │               │
  │  POST /process                │
  │  (after 5+ minutes)           │
  ├──────────────>│               │
  │               │               │
  │               │  GET key      │
  │               ├──────────────>│
  │               │               │
  │               │  null (expired)
  │               │<──────────────┤
  │               │               │
  │  403 Forbidden                │
  │  "Invalid or expired          │
  │   idempotency key"            │
  │<──────────────┤               │
  │               │               │
```

### Scenario 3: Duplicate Transaction

```
Client          Server          Database
  │               │               │
  │  POST /process                │
  │  (same key twice)             │
  ├──────────────>│               │
  │               │               │
  │               │  Check tx     │
  │               ├──────────────>│
  │               │               │
  │               │  Found existing
  │               │<──────────────┤
  │               │               │
  │  200 OK                       │
  │  "Transaction already         │
  │   processed"                  │
  │<──────────────┤               │
  │               │               │
```

## Security Features

### 1. PIN Rate Limiting

-   Redis key: `pin_attempts:{userId}`
-   Max attempts: 3
-   Lockout duration: 15 minutes
-   Counter resets on successful verification

### 2. Idempotency Key Management

-   Redis key: `idempotency:{uuid}`
-   Value: `userId`
-   TTL: 300 seconds (5 minutes)
-   Deleted after successful use

### 3. Transaction Deduplication

-   Database column: `idempotencyKey` (unique)
-   Prevents double-charging
-   Returns original result for duplicates

## Time Constraints

| Event                   | Duration   |
| ----------------------- | ---------- |
| Idempotency key expiry  | 5 minutes  |
| PIN lockout duration    | 15 minutes |
| Max time between steps  | 5 minutes  |
| PIN verification window | Immediate  |

## Best Practices

1. **Client should**:

    - Store idempotency key securely in memory
    - Clear key after successful transfer
    - Prompt for PIN re-entry if key expires
    - Show remaining attempts on PIN errors
    - Implement retry logic with exponential backoff

2. **Server ensures**:
    - Keys are cryptographically random (UUID v4)
    - Keys are tied to specific users
    - Keys expire automatically
    - Keys are deleted after use
    - All operations are logged
