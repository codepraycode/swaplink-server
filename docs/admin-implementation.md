# P2P Dispute Resolution Module Implementation Plan

## Goal Description

Implement a Dispute Resolution module for the SwapLink Fintech App. This allows Administrators to intervene in P2P orders where Buyer and Seller disagree. Admins can review evidence (chat, images) and force "Release" (Buyer wins) or "Refund" (Seller wins) of funds.

## User Review Required

> [!IMPORTANT] > **Irreversible Actions**: The resolution actions (Force Release / Force Refund) are irreversible.
> **Security**:
>
> -   `ADMIN` access: Dispute resolution.
> -   `SUPER_ADMIN` access: Manage other admins.
>     **Seeding**: A default Super Admin will be seeded. All other admins must be created by a Super Admin.

## Proposed Changes

### Database (Prisma)

#### [MODIFY] [schema.prisma](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/prisma/schema.prisma)

-   Update `User` model:
    -   Add `role` field: `role UserRole @default(USER)`
-   Create `UserRole` enum:
    -   `USER`, `SUPPORT`, `ADMIN`, `SUPER_ADMIN`
-   Update `P2POrder` model:
    -   Add `disputeReason` (String?)
    -   Add `resolvedBy` (String?)
    -   Add `resolutionNotes` (String?)
    -   Add `resolvedAt` (DateTime?)
-   Create `AdminLog` model:
    -   Fields: `id`, `adminId`, `action`, `targetId`, `metadata`, `ipAddress`, `createdAt`
    -   Relation to `User` (admin)

### Backend Services

#### [NEW] [src/modules/admin/admin.service.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/modules/admin/admin.service.ts)

-   Implement `AdminService` class.
-   **Dispute Resolution**:
    -   `resolveDispute(adminId, orderId, decision, notes)`: Handles `RELEASE` or `REFUND` atomically. Logs to `AdminLog`.
    -   `getDisputes(filters)`: Returns paginated list of disputed orders.
    -   `getDisputeDetails(orderId)`: Returns order details, chat history, and images.
-   **Admin Management (Super Admin Only)**:
    -   `createAdmin(email, password, role, firstName, lastName)`: Creates a new user with `ADMIN` or `SUPPORT` role.
    -   `getAdmins()`: Lists all admin users.
    -   `revokeAdmin(adminId)`: Sets an admin's role back to `USER` or deactivates them.

#### [NEW] [src/modules/admin/admin.controller.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/modules/admin/admin.controller.ts)

-   Endpoints:
    -   `GET /admin/disputes` (Admin+)
    -   `GET /admin/disputes/:id` (Admin+)
    -   `POST /admin/disputes/:id/resolve` (Admin+)
    -   `POST /admin/users` (Super Admin) - Create new Admin
    -   `GET /admin/users` (Super Admin) - List Admins

#### [NEW] [src/modules/admin/admin.routes.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/modules/admin/admin.routes.ts)

-   Define routes.
-   Apply `requireAdmin` for disputes.
-   Apply `requireSuperAdmin` for admin management.

#### [MODIFY] [src/types/express.d.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/types/express.d.ts)

-   Update `UserPayload` (or equivalent interface) to include `role: UserRole`.

#### [MODIFY] [src/lib/services/socket.service.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/src/lib/services/socket.service.ts)

-   Ensure `ORDER_RESOLVED` event is supported/emitted.

### Seeding (New Admin)

#### [NEW] [prisma/seed.ts](file:///home/codepraycode/projects/open-source/swaplink/swaplink-server/prisma/seed.ts)

-   Check if _any_ user with `role: SUPER_ADMIN` exists.
-   If NOT, create one using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from env.
-   Log the creation.

## Verification Plan

### Automated Tests

-   Create unit tests for `AdminService` to verify:
    -   `resolveDispute` correctly moves funds for RELEASE.
    -   `resolveDispute` correctly moves funds for REFUND.
    -   `resolveDispute` creates `AdminLog`.
    -   `resolveDispute` fails for non-disputed orders.

### Manual Verification

-   Since this is a backend-only task in this context, I will simulate API calls using a test script or `curl` commands (if server running) or rely on unit tests.
