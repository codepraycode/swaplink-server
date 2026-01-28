# 1. Requirement Specification: Virtual Account Generation

## 1.1 Functional Requirements (FR)

**FR-01: Identity Mapping**

-   The system must use the User’s unique internal ID as the `reference` when calling Globus. This ensures we can always trace a NUBAN back to a specific user, even if the database is corrupted.

**FR-02: Idempotency (Duplicate Prevention)**

-   The system must check if a user _already_ has a Virtual Account before attempting to create one.
-   If the Bank API returns an error saying "Reference already exists," the system must gracefully query the Bank to fetch the existing account details instead of throwing an error.

**FR-03: Data Consistency**

-   The Account Name at the Bank **MUST** match the format: `AppName - UserFirstName UserLastName` (e.g., "SwapLink - John Doe"). This gives users confidence when they see the name during a transfer.

**FR-04: Tier-Based Creation**

-   The system shall generate a Tier 1 (Low Limit) account using just Phone/Name if allowed by Globus Sandbox.
-   If Globus enforces BVN, the system must queue the creation request until the User submits their BVN.

**FR-05: Notification**

-   Upon successful generation of the NUBAN, the system must trigger a notification (Push/Email) to the user: _"Your SwapLink account number is ready!"_

---

## 1.2 Non-Functional Requirements (NFR) & Implementation Strategies

This is the "Fintech Grade" engineering section.

### NFR-01: High Availability (Non-Blocking)

-   **Requirement:** The Registration endpoint (`POST /register`) must respond within **500ms**, regardless of Bank API status.
-   **Strategy:** **Event-Driven Architecture**.
    -   User registers -> Save to DB -> Return `200 OK`.
    -   Emit event `USER_REGISTERED`.
    -   A background worker picks up this event and calls Globus.

### NFR-02: Fault Tolerance (Retries)

-   **Requirement:** If Globus returns a `5xx` error (Server Error) or `408` (Timeout), the system must retry the request automatically.
-   **Strategy:** **Exponential Backoff**.
    -   Retry 1: Wait 5s.
    -   Retry 2: Wait 20s.
    -   Retry 3: Wait 1 min.
    -   If all fail, verify manually or alert Admin.

### NFR-03: Rate Limiting (Throttling)

-   **Requirement:** The system must not exceed Globus's API rate limits (e.g., 50 requests/sec), otherwise Globus will block your IP.
-   **Strategy:** **Job Queue (BullMQ)**.
    -   Add account creation jobs to a queue.
    -   Configure the queue worker to process only X jobs per second.

### NFR-04: Security (Token Management)

-   **Requirement:** Client Secrets and Access Tokens must never appear in logs.
-   **Strategy:** **Token Caching**.
    -   Fetch the Globus Auth Token once.
    -   Cache it in Redis/Memory for 55 minutes (if it expires in 60).
    -   Only request a new token when the cache expires.

---

# 2. The Asynchronous Architecture

Instead of doing everything in the Controller, we split it.

### Phase 1: User Registration (Synchronous)

-   **Input:** Email, Password, Phone.
-   **Action:** Create User row, Create Internal Wallet (NUBAN = null).
-   **Response:** `201 Created` (User enters the app immediately).

### Phase 2: The Worker (Background)

-   **Trigger:** Queue Job `create-virtual-account`.
-   **Action:** Call Globus API.
-   **Result:** Update `VirtualAccount` table -> Send Push Notification.

---

# 3. Implementation Logic

We will use a simple **Event Emitter** for now (easier to setup than Redis/BullMQ for MVP), but structure it so it can be swapped for a Queue later.

### 3.1 The Schema (Recap)

Ensure you have the `VirtualAccount` model linked to the `Wallet`.

```prisma
model VirtualAccount {
  id            String   @id @default(uuid())
  walletId      String   @unique
  accountNumber String   @unique // The NUBAN
  accountName   String
  bankName      String   @default("Globus Bank")
  provider      String   @default("GLOBUS")
  createdAt     DateTime @default(now())

  wallet        Wallet   @relation(fields: [walletId], references: [id])
  @@map("virtual_accounts")
}
```

### 3.2 The Banking Service (Globus Adapter)

_This is the logic that talks to the bank._

```typescript
// src/lib/integrations/banking/globus.service.ts
import axios from 'axios';
import { envConfig } from '../../../config/env.config';
import logger from '../../../lib/utils/logger';

export class GlobusService {
    private baseUrl = envConfig.GLOBUS_BASE_URL; // e.g., https://sandbox.globusbank.com/api

    private async getAuthToken() {
        // ... (Implement caching logic here as discussed before)
        return 'mock_token';
    }

    async createAccount(user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
    }) {
        try {
            // MOCK: If no credentials, return fake data immediately
            if (!envConfig.GLOBUS_CLIENT_ID) {
                return {
                    accountNumber: '11' + Math.floor(Math.random() * 100000000),
                    accountName: `SwapLink - ${user.firstName} ${user.lastName}`,
                    bankName: 'Globus Bank (Sandbox)',
                };
            }

            const token = await this.getAuthToken();
            const response = await axios.post(
                `${this.baseUrl}/accounts/virtual`,
                {
                    accountName: `${user.firstName} ${user.lastName}`,
                    email: user.email,
                    phoneNumber: user.phone,
                    reference: user.id, // IMPORTANT: Idempotency Key
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Globus Account Creation Failed', error);
            throw error; // Throw so the worker knows to retry
        }
    }
}

export const globusService = new GlobusService();
```

### 3.3 The Background Worker (Event Listener)

_This handles the non-blocking requirement._

```typescript
// src/events/banking.events.ts
import EventEmitter from 'events';
import { prisma } from '../lib/utils/database';
import { globusService } from '../lib/integrations/banking/globus.service';
import logger from '../lib/utils/logger';

class BankingEvents extends EventEmitter {}
export const bankingEvents = new BankingEvents();

// Listen for the event
bankingEvents.on(
    'CREATE_VIRTUAL_ACCOUNT',
    async (payload: { userId: string; walletId: string }) => {
        logger.info(`🏦 Processing Virtual Account for User: ${payload.userId}`);

        try {
            // 1. Fetch User Details
            const user = await prisma.user.findUnique({ where: { id: payload.userId } });
            if (!user) return;

            // 2. Call Bank API (This might take 3-5 seconds)
            const bankDetails = await globusService.createAccount(user);

            // 3. Update Database
            await prisma.virtualAccount.create({
                data: {
                    walletId: payload.walletId,
                    accountNumber: bankDetails.accountNumber,
                    accountName: bankDetails.accountName,
                    bankName: bankDetails.bankName,
                    provider: 'GLOBUS',
                },
            });

            logger.info(`✅ Virtual Account Created: ${bankDetails.accountNumber}`);

            // 4. TODO: Send Push Notification ("Your account is ready!")
        } catch (error) {
            logger.error(`❌ Failed to create virtual account for ${payload.userId}`, error);
            // In a real app, you would push this job back to a Redis Queue to retry later
        }
    }
);
```

### 3.4 Integration in Registration Flow

_Update your `AuthService.register` to trigger the event._

```typescript
// src/modules/auth/auth.service.ts
import { bankingEvents } from '../../events/banking.events';

// ... inside register() method ...

// 3. Create User & Wallet (Transaction)
const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ ... });
    const wallet = await walletService.setUpWallet(user.id, tx);
    return { user, wallet };
});

// 4. NON-BLOCKING: Trigger Bank Account Creation
// We do NOT await this. It happens in the background.
bankingEvents.emit('CREATE_VIRTUAL_ACCOUNT', {
    userId: result.user.id,
    walletId: result.wallet.id
});

// 5. Return success immediately (User enters app)
const tokens = this.generateTokens(result.user);
return { user: result.user, ...tokens };
```

---

# 4. Mobile App (Expo) Implications

Since the account number generation is async, the Frontend logic changes slightly:

1.  **On Sign Up Success:** Redirect user to Dashboard.
2.  **Dashboard UI:**
    -   Show "Wallet Balance: ₦0.00".
    -   Check if `user.wallet.virtualAccount` exists.
    -   **If Yes:** Show "Account Number: 1234567890".
    -   **If No:** Show "Generating Account Number..." (Skeleton Loader or Badge).
3.  **Polling:** The app should poll `/auth/me` or `/wallet/details` every 10 seconds (or use WebSockets/Push Notifications) until the Account Number appears.

The app should never freezes.
