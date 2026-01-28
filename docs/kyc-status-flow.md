# KYC Status Flow

This document explains how the KYC status transitions work in the SwapLink server.

## KYC Status Enum

The `KycStatus` enum has the following values:

-   **STALE**: No KYC submission is currently being processed. User can submit KYC.
-   **PENDING**: KYC has been submitted and is awaiting verification.
-   **APPROVED**: KYC has been verified and approved.
-   **REJECTED**: KYC verification failed.

## Status Transitions

### 1. Initial State

When a user registers, their `kycStatus` is set to **STALE** by default.

```typescript
// Default in schema.prisma
kycStatus KycStatus @default(STALE)
```

### 2. On KYC Submission

When the user submits their KYC documents via `POST /api/auth/kyc`:

1. The status changes from **STALE** → **PENDING**
2. Documents are uploaded to storage
3. KYC info and documents are saved to the database in a transaction
4. A job is queued in the `kyc-verification` queue
5. A `KYC_SUBMITTED` event is emitted

```typescript
// In kyc.service.ts - submitKycUnified
await tx.user.update({
    where: { id: userId },
    data: {
        kycStatus: 'PENDING',
    },
});
```

### 3. Worker Processing

The `kycWorker` picks up the job from the queue and:

1. Calls `LocalKYCService.verifyUnified()` to verify all documents
2. Updates the status based on the result:

#### If Verification Succeeds:

-   Status changes: **PENDING** → **APPROVED**
-   `kycLevel` is upgraded to **FULL**
-   Documents are marked as **APPROVED**
-   A `KYC_APPROVED` event is emitted
-   User receives a push notification

```typescript
// In kyc.worker.ts
await prisma.user.update({
    where: { id: userId },
    data: {
        kycLevel: KycLevel.FULL,
        kycStatus: KycStatus.APPROVED,
    },
});
```

#### If Verification Fails:

-   Status changes: **PENDING** → **REJECTED**
-   Documents are marked as **REJECTED** with a rejection reason
-   A `KYC_REJECTED` event is emitted
-   User receives a notification with the rejection reason

```typescript
// In kyc.worker.ts
await prisma.user.update({
    where: { id: userId },
    data: {
        kycStatus: KycStatus.REJECTED,
    },
});
```

## Frontend Integration

### Checking KYC Status

The frontend should check the user's `kycStatus` to determine what action to show:

```typescript
// Example logic
if (user.kycStatus === 'STALE' || user.kycStatus === 'REJECTED') {
    // Show "Submit KYC" button
    // User can submit or re-submit KYC
} else if (user.kycStatus === 'PENDING') {
    // Show "KYC Under Review" message
    // Disable submission, user must wait
} else if (user.kycStatus === 'APPROVED') {
    // Show "KYC Verified" badge
    // No action needed
}
```

### Handling Re-submission

If a user's KYC is **REJECTED**, they can re-submit:

1. The frontend allows submission when status is **REJECTED**
2. On re-submission, status changes back to **PENDING**
3. The verification process starts again

### Real-time Updates

The frontend should listen to socket events to update the UI in real-time:

```typescript
socket.on('KYC_APPROVED', data => {
    // Update user store
    // Show success message
    // Refresh user profile
});

socket.on('KYC_REJECTED', data => {
    // Update user store
    // Show rejection reason
    // Allow re-submission
});
```

## Summary

| Current Status | User Action   | Result Status        |
| -------------- | ------------- | -------------------- |
| STALE          | Submit KYC    | PENDING              |
| PENDING        | Wait          | APPROVED or REJECTED |
| APPROVED       | None          | APPROVED             |
| REJECTED       | Re-submit KYC | PENDING              |
