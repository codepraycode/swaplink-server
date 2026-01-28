# Software Requirement Specification: P2P Dispute Resolution Module

**Project:** SwapLink Fintech App
**Version:** 1.0
**Module:** Admin / Back-Office

## 1. Introduction

The Dispute Resolution module allows authorized Administrators to intervene in P2P orders where the Buyer and Seller cannot agree (e.g., "I sent the money" vs. "I didn't receive it"). The Admin reviews evidence and forces the movement of funds from Escrow to the rightful party.

## 2. User Roles

-   **Support Agent:** Can view disputes and chat history but cannot move funds.
-   **Super Admin / Dispute Manager:** Can view evidence and execute **Force Release** or **Force Cancel**.

## 3. Functional Requirements (FR)

### 3.1 Dispute Dashboard

-   **FR-01:** The system shall provide a list of all P2P Orders with status `DISPUTE`.
-   **FR-02:** The list must display: Order ID, Amount (NGN & FX), Maker Name, Taker Name, Time Elapsed since creation.
-   **FR-03:** Admins must be able to filter by Date, Currency, and User ID.

### 3.2 Evidence Review

-   **FR-04:** The system must allow Admins to read the **Full Chat History** of the disputed order.
-   **FR-05:** The system must render all **Image Uploads** (Payment Receipts) sent within the chat.
-   **FR-06:** The system must show the **Payment Method** snapshot used in the order (to verify if the sender paid the correct account).

### 3.3 Resolution Actions (The Verdict)

The Admin can make one of two decisions. Both actions are **Irreversible**.

#### Action A: Force Completion (Buyer Wins)

-   **Scenario:** Buyer provided valid proof of payment; Seller is unresponsive or lying.
-   **FR-07:** Admin selects "Release Funds".
-   **FR-08:** System moves NGN from **Escrow (Locked Balance)** to the **FX Receiver's** Available Balance.
-   **FR-09:** System collects the Service Fee.
-   **FR-10:** Order Status updates to `COMPLETED`.

#### Action B: Force Cancellation (Seller Wins)

-   **Scenario:** Buyer marked "Paid" but cannot provide proof, or proof is fake.
-   **FR-11:** Admin selects "Refund Payer".
-   **FR-12:** System moves NGN from **Escrow (Locked Balance)** back to the **NGN Payer's** Available Balance.
-   **FR-13:** Order Status updates to `CANCELLED`.

### 3.4 Notifications

-   **FR-14:** Upon resolution, the system must emit a Socket event (`ORDER_RESOLVED`) to both users.
-   **FR-15:** The system must send an automated email to both users explaining the verdict.

---

## 4. Non-Functional Requirements (NFR)

### NFR-01: Audit Logging (Crucial)

-   **Requirement:** Every Admin action (viewing chat, resolving order) must be logged in an immutable `AdminAuditLog` table.
-   **Data:** Admin ID, IP Address, Action Type, Order ID, Timestamp.

### NFR-02: Security (RBAC)

-   **Requirement:** Only users with role `ADMIN` or `SUPER_ADMIN` can access these endpoints. Standard users must receive `403 Forbidden`.

### NFR-03: Atomicity

-   **Requirement:** The resolution (Money Movement + Status Update + Audit Log) must happen in a single Database Transaction.

---

## 5. Schema Updates

We need to track _who_ resolved the dispute and _why_.

```prisma
// Update P2POrder Model
model P2POrder {
  // ... existing fields ...

  // Dispute Meta
  disputeReason     String?   // Why was dispute raised?
  resolvedBy        String?   // Admin User ID
  resolutionNotes   String?   // Admin's reason for verdict
  resolvedAt        DateTime?
}

// New Model: Audit Logs
model AdminLog {
  id          String   @id @default(uuid())
  adminId     String
  action      String   // "VIEW_DISPUTE", "RESOLVE_RELEASE", "RESOLVE_REFUND"
  targetId    String   // Order ID or User ID
  metadata    Json?    // Snapshot of data changed
  ipAddress   String?
  createdAt   DateTime @default(now())

  admin       User     @relation(fields: [adminId], references: [id])
  @@map("admin_logs")
}
```

---

## 6. Implementation Strategy

### 6.1 The Admin Service

You need a service logic that handles the "Force" movements. This mimics the `P2POrderService` but bypasses the User's permission checks.

**File:** `src/modules/admin/admin.service.ts`

```typescript
import { prisma } from '../../database';
import { walletService } from '../../lib/services/wallet.service';
import { socketService } from '../../lib/services/socket.service';

export class AdminService {
    async resolveDispute(
        adminId: string,
        orderId: string,
        decision: 'RELEASE' | 'REFUND',
        notes: string
    ) {
        return await prisma.$transaction(async tx => {
            const order = await tx.p2POrder.findUnique({
                where: { id: orderId },
                include: { ad: true },
            });

            if (!order || order.status !== 'DISPUTE') throw new Error('Invalid order status');

            // 1. Determine Who is Who
            const isBuyAd = order.ad.type === 'BUY_FX';
            // If BUY_FX: Maker gave NGN (Payer), Taker gave FX (Receiver)
            // If SELL_FX: Maker gave FX (Receiver), Taker gave NGN (Payer)

            const ngnPayerId = isBuyAd ? order.makerId : order.takerId;
            const fxReceiverId = isBuyAd ? order.takerId : order.makerId;

            // 2. Execute Decision
            if (decision === 'RELEASE') {
                // VERDICT: FX was sent. Release NGN to FX Receiver.

                // Credit Receiver (Atomic unlock & move)
                // Note: You need a walletService method that moves Locked -> Available(OtherUser)
                // Or manually do it here via Prisma TX

                // A. Deduct Locked from Payer
                await tx.wallet.update({
                    where: { userId: ngnPayerId },
                    data: { lockedBalance: { decrement: order.totalNgn } },
                });

                // B. Credit Available to Receiver (Minus Fee)
                const fee = order.fee;
                const finalAmount = order.totalNgn - fee;

                await tx.wallet.update({
                    where: { userId: fxReceiverId },
                    data: { balance: { increment: finalAmount } },
                });

                // C. Credit System Fee (Optional)
                // ...

                // D. Update Order
                await tx.p2POrder.update({
                    where: { id: orderId },
                    data: {
                        status: 'COMPLETED',
                        resolvedBy: adminId,
                        resolvedAt: new Date(),
                        resolutionNotes: notes,
                    },
                });
            } else {
                // VERDICT: FX was NOT sent. Refund NGN to Payer.

                // A. Deduct Locked from Payer
                await tx.wallet.update({
                    where: { userId: ngnPayerId },
                    data: { lockedBalance: { decrement: order.totalNgn } },
                });

                // B. Credit Available to Payer (Refund)
                await tx.wallet.update({
                    where: { userId: ngnPayerId },
                    data: { balance: { increment: order.totalNgn } },
                });

                // C. Update Order
                await tx.p2POrder.update({
                    where: { id: orderId },
                    data: {
                        status: 'CANCELLED',
                        resolvedBy: adminId,
                        resolvedAt: new Date(),
                        resolutionNotes: notes,
                    },
                });
            }

            // 3. Log Action
            await tx.adminLog.create({
                data: {
                    adminId,
                    action: decision === 'RELEASE' ? 'RESOLVE_RELEASE' : 'RESOLVE_REFUND',
                    targetId: orderId,
                    metadata: { notes },
                },
            });

            return order;
        });

        // Post-Transaction: Emit Sockets to Maker/Taker
    }
}
```

### 6.2 API Endpoints

| Method | Endpoint                      | Description                                   |
| :----- | :---------------------------- | :-------------------------------------------- | ------------------------- |
| `GET`  | `/admin/disputes`             | List all disputed orders.                     |
| `GET`  | `/admin/disputes/:id`         | Get details + chat history + images.          |
| `POST` | `/admin/disputes/:id/resolve` | Execute verdict. Body: `{ decision: 'RELEASE' | 'REFUND', notes: '...' }` |

---

### 7. Integration Workflow

1.  **Frontend (Admin Panel):** You will likely build a simple React Admin dashboard (separate from the mobile app) for your support team.
2.  **Authentication:** Admin endpoints should use a separate middleware `requireAdmin` that checks `user.role === 'ADMIN'`.

This completes the lifecycle of a P2P trade, handling the "Happy Path" (User confirms) and the "Unhappy Path" (Disputes).
