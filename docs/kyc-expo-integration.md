# KYC Integration Guide for Expo App

This guide explains how to integrate the updated KYC system with your Expo mobile application.

## Overview

The KYC system now uses a unified submission approach with the following status flow:

-   **STALE**: User has not submitted KYC or can resubmit after rejection
-   **PENDING**: KYC is being processed
-   **APPROVED**: KYC has been verified
-   **REJECTED**: KYC was rejected and can be resubmitted

## 1. Update Type Definitions

First, update your type definitions to include the new `STALE` status:

```typescript
// src/lib/api/types.ts (or wherever you define types)

export enum KycStatus {
    STALE = 'STALE',
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

export enum KycLevel {
    NONE = 'NONE',
    BASIC = 'BASIC',
    INTERMEDIATE = 'INTERMEDIATE',
    FULL = 'FULL',
}

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    kycLevel: KycLevel;
    kycStatus: KycStatus;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    isPinSet: boolean;
    // ... other fields
}
```

## 2. Update Account Store

Update your account store to handle the new KYC status:

```typescript
// src/lib/stores/accountStore.ts

import { create } from 'zustand';
import { KycStatus, User } from '../api/types';

interface AccountState {
    user: User | null;
    canSubmitKyc: () => boolean;
    shouldShowKycPending: () => boolean;
    isKycApproved: () => boolean;
    // ... other methods
}

export const useAccountStore = create<AccountState>((set, get) => ({
    user: null,

    // Check if user can submit or resubmit KYC
    canSubmitKyc: () => {
        const { user } = get();
        if (!user) return false;

        return user.kycStatus === KycStatus.STALE || user.kycStatus === KycStatus.REJECTED;
    },

    // Check if KYC is pending
    shouldShowKycPending: () => {
        const { user } = get();
        return user?.kycStatus === KycStatus.PENDING;
    },

    // Check if KYC is approved
    isKycApproved: () => {
        const { user } = get();
        return user?.kycStatus === KycStatus.APPROVED;
    },

    // ... other methods
}));
```

## 3. Create KYC Submission Service

Create or update your KYC service to handle the unified submission:

```typescript
// src/lib/api/services/kyc.service.ts

import { apiClient } from '../client';

export interface KycSubmissionData {
    firstName: string;
    lastName: string;
    dateOfBirth: string; // ISO date string
    address: {
        street: string;
        city: string;
        state?: string;
        country: string;
        postalCode: string;
    };
    governmentId: {
        type: string; // e.g., 'PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID'
        number: string;
    };
}

export interface KycFiles {
    idDocumentFront: {
        uri: string;
        name: string;
        type: string;
    };
    idDocumentBack?: {
        uri: string;
        name: string;
        type: string;
    };
    proofOfAddress: {
        uri: string;
        name: string;
        type: string;
    };
    selfie: {
        uri: string;
        name: string;
        type: string;
    };
}

export const kycService = {
    async submitKyc(data: KycSubmissionData, files: KycFiles) {
        const formData = new FormData();

        // Add text fields
        formData.append('firstName', data.firstName);
        formData.append('lastName', data.lastName);
        formData.append('dateOfBirth', data.dateOfBirth);

        // Add nested address fields
        formData.append('address[street]', data.address.street);
        formData.append('address[city]', data.address.city);
        if (data.address.state) {
            formData.append('address[state]', data.address.state);
        }
        formData.append('address[country]', data.address.country);
        formData.append('address[postalCode]', data.address.postalCode);

        // Add nested governmentId fields
        formData.append('governmentId[type]', data.governmentId.type);
        formData.append('governmentId[number]', data.governmentId.number);

        // Add files
        formData.append('idDocumentFront', {
            uri: files.idDocumentFront.uri,
            name: files.idDocumentFront.name,
            type: files.idDocumentFront.type,
        } as any);

        if (files.idDocumentBack) {
            formData.append('idDocumentBack', {
                uri: files.idDocumentBack.uri,
                name: files.idDocumentBack.name,
                type: files.idDocumentBack.type,
            } as any);
        }

        formData.append('proofOfAddress', {
            uri: files.proofOfAddress.uri,
            name: files.proofOfAddress.name,
            type: files.proofOfAddress.type,
        } as any);

        formData.append('selfie', {
            uri: files.selfie.uri,
            name: files.selfie.name,
            type: files.selfie.type,
        } as any);

        const response = await apiClient.post('/auth/kyc', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    },
};
```

## 4. Update Socket Listener

Update your socket listener to handle KYC events:

```typescript
// src/lib/socket/SocketListener.tsx

import { useEffect } from 'react';
import { useSocket } from './useSocket';
import { useAccountStore } from '../stores/accountStore';
import { showNotification } from '../utils/notifications';

export const SocketListener = () => {
    const socket = useSocket();
    const refreshUser = useAccountStore(state => state.refreshUser);

    useEffect(() => {
        if (!socket) return;

        // Handle KYC Approved
        socket.on('KYC_APPROVED', (data: { userId: string; level: string }) => {
            console.log('[Socket] KYC Approved:', data);

            // Refresh user data to get updated status
            refreshUser();

            // Show success notification
            showNotification({
                title: 'KYC Approved! 🎉',
                body: `Your account has been upgraded to ${data.level} level.`,
                type: 'success',
            });
        });

        // Handle KYC Rejected
        socket.on('KYC_REJECTED', (data: { userId: string; reason: string }) => {
            console.log('[Socket] KYC Rejected:', data);

            // Refresh user data to get updated status
            refreshUser();

            // Show rejection notification
            showNotification({
                title: 'KYC Verification Failed',
                body: data.reason || 'Please review your documents and try again.',
                type: 'error',
            });
        });

        // Cleanup
        return () => {
            socket.off('KYC_APPROVED');
            socket.off('KYC_REJECTED');
        };
    }, [socket, refreshUser]);

    return null;
};
```

## 5. Create KYC Status Component

Create a reusable component to display KYC status:

```typescript
// src/components/KycStatusBadge.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { KycStatus } from '../lib/api/types';

interface KycStatusBadgeProps {
    status: KycStatus;
}

export const KycStatusBadge: React.FC<KycStatusBadgeProps> = ({ status }) => {
    const getStatusConfig = () => {
        switch (status) {
            case KycStatus.STALE:
                return {
                    label: 'Not Submitted',
                    color: '#6B7280',
                    backgroundColor: '#F3F4F6',
                };
            case KycStatus.PENDING:
                return {
                    label: 'Under Review',
                    color: '#D97706',
                    backgroundColor: '#FEF3C7',
                };
            case KycStatus.APPROVED:
                return {
                    label: 'Verified',
                    color: '#059669',
                    backgroundColor: '#D1FAE5',
                };
            case KycStatus.REJECTED:
                return {
                    label: 'Rejected',
                    color: '#DC2626',
                    backgroundColor: '#FEE2E2',
                };
            default:
                return {
                    label: 'Unknown',
                    color: '#6B7280',
                    backgroundColor: '#F3F4F6',
                };
        }
    };

    const config = getStatusConfig();

    return (
        <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
            <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
    },
});
```

## 6. Update KYC Verification Screen

Update your KYC verification screen to handle the different states:

```typescript
// src/screens/KYCVerificationScreen.tsx

import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useAccountStore } from '../lib/stores/accountStore';
import { KycStatusBadge } from '../components/KycStatusBadge';
import { KycStatus } from '../lib/api/types';

export const KYCVerificationScreen = () => {
    const user = useAccountStore(state => state.user);
    const canSubmitKyc = useAccountStore(state => state.canSubmitKyc);
    const shouldShowKycPending = useAccountStore(state => state.shouldShowKycPending);
    const isKycApproved = useAccountStore(state => state.isKycApproved);

    if (!user) return null;

    // Show success state
    if (isKycApproved()) {
        return (
            <View style={styles.container}>
                <KycStatusBadge status={user.kycStatus} />
                <Text style={styles.title}>KYC Verified! ✓</Text>
                <Text style={styles.description}>
                    Your identity has been verified. You now have full access to all features.
                </Text>
            </View>
        );
    }

    // Show pending state
    if (shouldShowKycPending()) {
        return (
            <View style={styles.container}>
                <KycStatusBadge status={user.kycStatus} />
                <Text style={styles.title}>Verification in Progress</Text>
                <Text style={styles.description}>
                    Your documents are being reviewed. This usually takes 1-2 business days. We'll
                    notify you once the verification is complete.
                </Text>
            </View>
        );
    }

    // Show submission form (for STALE or REJECTED)
    if (canSubmitKyc()) {
        const isResubmission = user.kycStatus === KycStatus.REJECTED;

        return (
            <View style={styles.container}>
                <KycStatusBadge status={user.kycStatus} />

                {isResubmission && (
                    <View style={styles.rejectionNotice}>
                        <Text style={styles.rejectionTitle}>Previous Submission Rejected</Text>
                        <Text style={styles.rejectionText}>
                            Please review your documents and submit again with correct information.
                        </Text>
                    </View>
                )}

                <Text style={styles.title}>
                    {isResubmission ? 'Resubmit KYC Documents' : 'Verify Your Identity'}
                </Text>

                <Text style={styles.description}>
                    Please provide the following documents to verify your identity:
                </Text>

                {/* Your KYC form goes here */}
                <Button
                    title={isResubmission ? 'Resubmit Documents' : 'Submit Documents'}
                    onPress={() => {
                        // Navigate to KYC form or show form
                    }}
                />
            </View>
        );
    }

    return null;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 24,
    },
    rejectionNotice: {
        backgroundColor: '#FEE2E2',
        padding: 16,
        borderRadius: 8,
        marginTop: 16,
        marginBottom: 16,
    },
    rejectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#DC2626',
        marginBottom: 4,
    },
    rejectionText: {
        fontSize: 14,
        color: '#991B1B',
    },
});
```

## 7. Testing Checklist

After implementing the changes, test the following scenarios:

### Initial State (STALE)

-   [ ] New user shows "Not Submitted" status
-   [ ] "Submit Documents" button is visible and enabled
-   [ ] User can access KYC submission form

### After Submission (PENDING)

-   [ ] Status changes to "Under Review" immediately after submission
-   [ ] Submit button is disabled/hidden
-   [ ] User sees waiting message
-   [ ] User cannot resubmit while pending

### On Approval (APPROVED)

-   [ ] Socket event triggers status update
-   [ ] Success notification is shown
-   [ ] Status badge shows "Verified"
-   [ ] User sees success message
-   [ ] Submit button is hidden

### On Rejection (REJECTED)

-   [ ] Socket event triggers status update
-   [ ] Rejection notification is shown with reason
-   [ ] Status badge shows "Rejected"
-   [ ] User sees rejection notice
-   [ ] "Resubmit Documents" button is visible
-   [ ] User can submit again

## 8. Common Issues and Solutions

### Issue: FormData not working properly

**Solution**: Make sure you're using the correct format for file objects in React Native:

```typescript
{
  uri: 'file://...',
  name: 'filename.jpg',
  type: 'image/jpeg',
}
```

### Issue: Socket events not received

**Solution**: Ensure socket is connected and authenticated before listening to events. Check that the user is logged in and the socket connection is established.

### Issue: Status not updating after socket event

**Solution**: Make sure to call `refreshUser()` or update the user state in your store after receiving socket events.

### Issue: User can submit while PENDING

**Solution**: Double-check your `canSubmitKyc()` logic to ensure it returns `false` when status is `PENDING`.

## 9. API Endpoint Reference

### Submit KYC

```
POST /api/auth/kyc
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body (FormData):
- firstName: string
- lastName: string
- dateOfBirth: string (ISO date)
- address[street]: string
- address[city]: string
- address[state]: string (optional)
- address[country]: string
- address[postalCode]: string
- governmentId[type]: string
- governmentId[number]: string
- idDocumentFront: File
- idDocumentBack: File (optional)
- proofOfAddress: File
- selfie: File

Response:
{
  "success": true,
  "message": "KYC application submitted successfully"
}
```

### Get User Profile

```
GET /api/auth/me
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "id": "...",
    "email": "...",
    "kycStatus": "STALE" | "PENDING" | "APPROVED" | "REJECTED",
    "kycLevel": "NONE" | "BASIC" | "INTERMEDIATE" | "FULL",
    ...
  }
}
```

## 10. Socket Events

### KYC_APPROVED

```typescript
{
    userId: string;
    level: 'FULL';
    timestamp: Date;
}
```

### KYC_REJECTED

```typescript
{
    userId: string;
    reason: string;
    timestamp: Date;
}
```
