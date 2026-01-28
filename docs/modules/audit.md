# Audit Module Documentation

The Audit Module is a critical security and compliance component designed to track and record significant actions performed within the SwapLink platform. It provides a persistent history of "who did what and when," enabling administrators to monitor system activity and investigate incidents.

## Architecture

The module operates on an **Event-Driven Architecture**, ensuring that audit logging does not block the main request flow.

1.  **Event Bus**: The core mechanism for decoupling. Services emit an `AUDIT_LOG` event instead of writing directly to the database.
2.  **Audit Listener**: Subscribes to the `AUDIT_LOG` event. It receives the log data and handles the persistence logic.
3.  **Audit Service**: Provides a clean API (`AuditService.log`) for other services to emit audit events. It also handles data retrieval for the API.
4.  **Database**: Logs are stored in the `audit_logs` table (PostgreSQL/Prisma).

---

## Backend Integration

### 1. Logging an Action

To log an action, use the static `log` method of the `AuditService`. This method publishes an `AUDIT_LOG` event, which is then processed asynchronously.

```typescript
import { AuditService } from '../shared/lib/services/audit.service';

// Example: Logging a user login
AuditService.log({
    userId: 'user-uuid-123',
    action: 'USER_LOGGED_IN',
    resource: 'Auth',
    resourceId: 'user-uuid-123',
    details: { method: 'email' }, // Optional metadata
    status: 'SUCCESS', // 'SUCCESS' | 'FAILURE'
});
```

### 2. Supported Fields

| Field        | Type     | Description                                                                          |
| :----------- | :------- | :----------------------------------------------------------------------------------- |
| `userId`     | `string` | ID of the user performing the action (optional for system actions).                  |
| `action`     | `string` | A unique string identifying the action (e.g., `USER_REGISTERED`, `PROFILE_UPDATED`). |
| `resource`   | `string` | The domain or entity being affected (e.g., `User`, `Wallet`, `System`).              |
| `resourceId` | `string` | ID of the specific resource instance (optional).                                     |
| `details`    | `json`   | Any additional context, old/new values, or metadata.                                 |
| `status`     | `string` | Outcome of the action (`SUCCESS` or `FAILURE`).                                      |

---

## API Endpoints

The Audit Module exposes endpoints for administrators to view and search audit logs.

### 1. Get Audit Logs

Retrieve a paginated list of audit logs with optional filtering.

-   **Endpoint**: `GET /api/v1/audit`
-   **Auth**: Required (Bearer Token)
-   **Role**: `ADMIN` or `SUPER_ADMIN` only.

**Query Parameters:**

| Parameter   | Description                             | Example      |
| :---------- | :-------------------------------------- | :----------- |
| `page`      | Page number (default: 1)                | `1`          |
| `limit`     | Items per page (default: 20)            | `50`         |
| `userId`    | Filter by User ID                       | `user-123`   |
| `action`    | Filter by Action name (partial match)   | `LOGIN`      |
| `resource`  | Filter by Resource name (partial match) | `User`       |
| `startDate` | Filter logs after this date (ISO)       | `2023-01-01` |
| `endDate`   | Filter logs before this date (ISO)      | `2023-12-31` |

---

## Testing with Postman

You can use Postman to verify the audit system.

### Prerequisites

-   **Base URL**: `http://localhost:3000/api/v1` (or your server URL)
-   **Auth**: You must log in as an **Admin** user to access the audit endpoints.

### 1. Retrieve Logs

-   **Method**: `GET`
-   **URL**: `{{baseUrl}}/audit`
-   **Headers**:
    -   `Authorization`: `Bearer <ADMIN_JWT_TOKEN>`

### 2. Filter Logs

-   **Method**: `GET`
-   **URL**: `{{baseUrl}}/audit?action=LOGIN&limit=5`

### 3. Triggering Audit Logs

To test that logs are being created, perform one of the following actions in the app:

1.  **Register a User**: Triggers `USER_REGISTERED`.
2.  **Log In**: Triggers `USER_LOGGED_IN`.
3.  **Change Password**: Triggers `PASSWORD_CHANGED`.
4.  **Update Profile**: Triggers `PROFILE_UPDATED`.

After performing an action, call the **Retrieve Logs** endpoint to confirm the new entry appears.
