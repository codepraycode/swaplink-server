```mermaid
sequenceDiagram
    participant Buyer
    participant API
    participant Database
    participant Queue
    participant Worker
    participant Seller

    Note over Buyer,Seller: Order Creation (PENDING)
    Buyer->>API: Create Order
    API->>Database: Lock funds & Create order (PENDING)
    API->>Buyer: Order created
    API->>Seller: Notification: New order

    Note over Buyer,Seller: Payment Proof (PAID)
    Buyer->>API: Mark as Paid (with proof)
    API->>Database: Update status to PAID
    API->>Buyer: Order marked as paid
    API->>Seller: Notification: Payment received, verify & release

    Note over Buyer,Seller: Fund Release (COMPLETED)
    Seller->>API: Confirm Order (Release Funds)
    API->>Database: Update status to COMPLETED
    API->>Queue: Enqueue 'release-funds' job
    API->>Seller: ✅ Order confirmed. Funds will be released soon.
    API->>Buyer: Notification: Order completed

    Note over Queue,Worker: Async Fund Movement
    Queue->>Worker: Process 'release-funds' job
    Worker->>Database: Check idempotency (prevent duplicates)
    Worker->>Database: Debit payer locked balance
    Worker->>Database: Credit receiver balance (amount - fee)
    Worker->>Database: Credit revenue wallet (fee)
    Worker->>Database: Create transaction records
    Worker->>Buyer: Notification: Funds received
    Worker->>Queue: Job completed
```

## Flow Explanation

### Phase 1: Order Creation (PENDING)

-   Buyer creates an order
-   Funds are locked (either ad inventory or buyer's wallet)
-   Order status: **PENDING**

### Phase 2: Payment Proof (PAID)

-   Buyer sends proof of payment (e.g., screenshot, transaction ID)
-   Order status: **PAID**
-   Seller is notified to verify and release funds

### Phase 3: Fund Release (COMPLETED)

-   **Synchronous Part** (API):
    -   Seller confirms the order
    -   Order status updated to **COMPLETED**
    -   Job queued for async processing
    -   Immediate response returned to seller
-   **Asynchronous Part** (Worker):
    -   Worker picks up the job
    -   Performs idempotency check
    -   Executes fund transfers
    -   Creates transaction records
    -   Sends notifications

## Key Points

1. **Non-blocking**: API responds immediately after queuing the job
2. **Reliable**: Idempotency ensures funds aren't transferred twice
3. **Transparent**: Users receive notifications at each step
4. **Scalable**: Worker can process multiple fund releases concurrently
