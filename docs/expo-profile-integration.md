# Profile & Settings Integration Guide for Expo App

This document outlines how to integrate user profile management and settings endpoints into your Expo mobile application.

## Overview

This guide covers the following features:

-   ✅ Edit profile information
-   ✅ Upload/update profile picture
-   ✅ List ads created by user
-   ✅ List and add payment methods
-   ✅ Change password
-   ✅ Set/update transaction PIN
-   ⚠️ Get notification settings (to be implemented)
-   ⚠️ Send message to admin/support (to be implemented)

---

## 1. Type Definitions

First, update your type definitions to include all necessary types:

```typescript
// src/lib/api/types.ts

export interface User {
    id: string;
    email: string | null;
    phone: string | null;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    kycLevel: KycLevel;
    kycStatus: KycStatus;
    isVerified: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
    isActive: boolean;
    pushToken: string | null;
    lastLogin: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpdateProfileDto {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatarUrl?: string;
}

export interface ChangePasswordDto {
    oldPassword: string;
    newPassword: string;
}

export interface P2PPaymentMethod {
    id: string;
    userId: string;
    currency: string; // USD, CAD, EUR, GBP
    bankName: string;
    accountNumber: string;
    accountName: string;
    details: Record<string, any>; // Routing No, IBAN, Sort Code
    isPrimary: boolean;
    isActive: boolean;
}

export interface CreatePaymentMethodDto {
    currency: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    details?: Record<string, any>;
}

export interface P2PAd {
    id: string;
    userId: string;
    type: 'BUY_FX' | 'SELL_FX';
    currency: string;
    totalAmount: number;
    remainingAmount: number;
    price: number; // NGN per 1 FX
    minLimit: number;
    maxLimit: number;
    paymentMethodId: string | null;
    terms: string | null;
    autoReply: string | null;
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CLOSED';
    createdAt: Date;
    updatedAt: Date;
}

export interface TransactionPin {
    pin: string;
}

export interface UpdateTransactionPinDto {
    oldPin?: string;
    newPin: string;
}
```

---

## 2. API Service Implementation

Create service methods for each feature:

```typescript
// src/lib/api/services/user.service.ts

import { apiClient } from '../client';
import { User, UpdateProfileDto, ChangePasswordDto } from '../types';

export const userService = {
    /**
     * Update user profile information
     */
    async updateProfile(data: UpdateProfileDto): Promise<User> {
        const response = await apiClient.put('/account/user/profile', data);
        return response.data.data;
    },

    /**
     * Upload/update profile picture
     * Note: Currently not implemented on backend - will need to be added
     */
    async uploadProfilePicture(imageUri: string): Promise<User> {
        const formData = new FormData();

        // Extract filename from URI
        const filename = imageUri.split('/').pop() || 'profile.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('profilePicture', {
            uri: imageUri,
            name: filename,
            type,
        } as any);

        const response = await apiClient.post('/account/user/profile-picture', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data.data;
    },

    /**
     * Change user password
     */
    async changePassword(data: ChangePasswordDto): Promise<void> {
        await apiClient.post('/account/user/change-password', data);
    },

    /**
     * Get current user profile
     */
    async getProfile(): Promise<User> {
        const response = await apiClient.get('/auth/me');
        return response.data.data;
    },
};
```

```typescript
// src/lib/api/services/p2p.service.ts

import { apiClient } from '../client';
import { P2PPaymentMethod, CreatePaymentMethodDto, P2PAd } from '../types';

export const p2pService = {
    /**
     * Get all payment methods for the current user
     */
    async getPaymentMethods(): Promise<P2PPaymentMethod[]> {
        const response = await apiClient.get('/p2p/payment-methods');
        return response.data.data;
    },

    /**
     * Create a new payment method
     */
    async createPaymentMethod(data: CreatePaymentMethodDto): Promise<P2PPaymentMethod> {
        const response = await apiClient.post('/p2p/payment-methods', data);
        return response.data.data;
    },

    /**
     * Delete a payment method
     */
    async deletePaymentMethod(id: string): Promise<void> {
        await apiClient.delete(`/p2p/payment-methods/${id}`);
    },

    /**
     * Get all ads created by the current user
     */
    async getMyAds(): Promise<P2PAd[]> {
        const response = await apiClient.get('/p2p/ads', {
            params: {
                userId: 'me', // Filter by current user
            },
        });
        return response.data.data;
    },

    /**
     * Get all ads (marketplace)
     */
    async getAllAds(params?: { currency?: string; type?: 'BUY_FX' | 'SELL_FX' }): Promise<P2PAd[]> {
        const response = await apiClient.get('/p2p/ads', { params });
        return response.data.data;
    },

    /**
     * Create a new ad
     */
    async createAd(data: {
        type: 'BUY_FX' | 'SELL_FX';
        currency: string;
        totalAmount: number;
        price: number;
        minLimit: number;
        maxLimit: number;
        paymentMethodId?: string;
        terms?: string;
        autoReply?: string;
    }): Promise<P2PAd> {
        const response = await apiClient.post('/p2p/ads', data);
        return response.data.data;
    },

    /**
     * Close an ad
     */
    async closeAd(id: string): Promise<void> {
        await apiClient.patch(`/p2p/ads/${id}/close`);
    },
};
```

```typescript
// src/lib/api/services/wallet.service.ts

import { apiClient } from '../client';
import { TransactionPin, UpdateTransactionPinDto } from '../types';

export const walletService = {
    /**
     * Set or update transaction PIN
     */
    async setTransactionPin(data: UpdateTransactionPinDto): Promise<void> {
        await apiClient.post('/wallet/pin', data);
    },

    /**
     * Verify transaction PIN (returns idempotency key for transfers)
     */
    async verifyPin(pin: string): Promise<{ idempotencyKey: string }> {
        const response = await apiClient.post('/wallet/verify-pin', { pin });
        return response.data.data;
    },

    /**
     * Get wallet balance and details
     */
    async getWallet(): Promise<{
        balance: number;
        currency: string;
        virtualAccount: {
            accountNumber: string;
            bankName: string;
        };
    }> {
        const response = await apiClient.get('/wallet');
        return response.data.data;
    },
};
```

---

## 3. React Hooks for State Management

Create custom hooks for each feature:

```typescript
// src/lib/hooks/useProfile.ts

import { useState } from 'react';
import { userService } from '../api/services/user.service';
import { UpdateProfileDto, User } from '../api/types';
import { useAccountStore } from '../stores/accountStore';

export const useProfile = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const user = useAccountStore(state => state.user);
    const setUser = useAccountStore(state => state.setUser);

    const updateProfile = async (data: UpdateProfileDto) => {
        setLoading(true);
        setError(null);
        try {
            const updatedUser = await userService.updateProfile(data);
            setUser(updatedUser);
            return updatedUser;
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Failed to update profile';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const uploadProfilePicture = async (imageUri: string) => {
        setLoading(true);
        setError(null);
        try {
            const updatedUser = await userService.uploadProfilePicture(imageUri);
            setUser(updatedUser);
            return updatedUser;
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Failed to upload profile picture';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const changePassword = async (oldPassword: string, newPassword: string) => {
        setLoading(true);
        setError(null);
        try {
            await userService.changePassword({ oldPassword, newPassword });
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Failed to change password';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        user,
        loading,
        error,
        updateProfile,
        uploadProfilePicture,
        changePassword,
    };
};
```

```typescript
// src/lib/hooks/usePaymentMethods.ts

import { useState, useEffect } from 'react';
import { p2pService } from '../api/services/p2p.service';
import { P2PPaymentMethod, CreatePaymentMethodDto } from '../api/types';

export const usePaymentMethods = () => {
    const [paymentMethods, setPaymentMethods] = useState<P2PPaymentMethod[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPaymentMethods = async () => {
        setLoading(true);
        setError(null);
        try {
            const methods = await p2pService.getPaymentMethods();
            setPaymentMethods(methods);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch payment methods');
        } finally {
            setLoading(false);
        }
    };

    const createPaymentMethod = async (data: CreatePaymentMethodDto) => {
        setLoading(true);
        setError(null);
        try {
            const newMethod = await p2pService.createPaymentMethod(data);
            setPaymentMethods(prev => [...prev, newMethod]);
            return newMethod;
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Failed to create payment method';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deletePaymentMethod = async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            await p2pService.deletePaymentMethod(id);
            setPaymentMethods(prev => prev.filter(method => method.id !== id));
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Failed to delete payment method';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPaymentMethods();
    }, []);

    return {
        paymentMethods,
        loading,
        error,
        fetchPaymentMethods,
        createPaymentMethod,
        deletePaymentMethod,
    };
};
```

```typescript
// src/lib/hooks/useMyAds.ts

import { useState, useEffect } from 'react';
import { p2pService } from '../api/services/p2p.service';
import { P2PAd } from '../api/types';

export const useMyAds = () => {
    const [ads, setAds] = useState<P2PAd[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchMyAds = async () => {
        setLoading(true);
        setError(null);
        try {
            const myAds = await p2pService.getMyAds();
            setAds(myAds);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch ads');
        } finally {
            setLoading(false);
        }
    };

    const closeAd = async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            await p2pService.closeAd(id);
            setAds(prev =>
                prev.map(ad => (ad.id === id ? { ...ad, status: 'CLOSED' as const } : ad))
            );
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Failed to close ad';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyAds();
    }, []);

    return {
        ads,
        loading,
        error,
        fetchMyAds,
        closeAd,
    };
};
```

```typescript
// src/lib/hooks/useTransactionPin.ts

import { useState } from 'react';
import { walletService } from '../api/services/wallet.service';

export const useTransactionPin = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const setPin = async (newPin: string, oldPin?: string) => {
        setLoading(true);
        setError(null);
        try {
            await walletService.setTransactionPin({ newPin, oldPin });
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Failed to set PIN';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const verifyPin = async (pin: string) => {
        setLoading(true);
        setError(null);
        try {
            const result = await walletService.verifyPin(pin);
            return result.idempotencyKey;
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Invalid PIN';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        setPin,
        verifyPin,
    };
};
```

---

## 4. Example Screen Implementations

### 4.1 Edit Profile Screen

```typescript
// src/screens/EditProfileScreen.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useProfile } from '../lib/hooks/useProfile';

export const EditProfileScreen = () => {
    const { user, loading, updateProfile } = useProfile();
    const [firstName, setFirstName] = useState(user?.firstName || '');
    const [lastName, setLastName] = useState(user?.lastName || '');
    const [phone, setPhone] = useState(user?.phone || '');

    const handleSave = async () => {
        try {
            await updateProfile({ firstName, lastName, phone });
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error) {
            Alert.alert('Error', 'Failed to update profile');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter first name"
            />

            <Text style={styles.label}>Last Name</Text>
            <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter last name"
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
            />

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={loading}
            >
                <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
```

### 4.2 Upload Profile Picture

```typescript
// src/screens/ProfilePictureScreen.tsx

import React from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useProfile } from '../lib/hooks/useProfile';

export const ProfilePictureScreen = () => {
    const { user, loading, uploadProfilePicture } = useProfile();

    const pickImage = async () => {
        // Request permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Permission Denied',
                'We need camera roll permissions to upload a profile picture'
            );
            return;
        }

        // Pick image
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            try {
                await uploadProfilePicture(result.assets[0].uri);
                Alert.alert('Success', 'Profile picture updated successfully');
            } catch (error) {
                Alert.alert('Error', 'Failed to upload profile picture');
            }
        }
    };

    return (
        <View style={styles.container}>
            <Image
                source={
                    user?.avatarUrl
                        ? { uri: user.avatarUrl }
                        : require('../assets/default-avatar.png')
                }
                style={styles.avatar}
            />

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={pickImage}
                disabled={loading}
            >
                <Text style={styles.buttonText}>
                    {loading ? 'Uploading...' : 'Change Profile Picture'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    avatar: {
        width: 150,
        height: 150,
        borderRadius: 75,
        marginBottom: 30,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        minWidth: 200,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
```

### 4.3 My Ads Screen

```typescript
// src/screens/MyAdsScreen.tsx

import React from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { useMyAds } from '../lib/hooks/useMyAds';
import { P2PAd } from '../lib/api/types';

export const MyAdsScreen = () => {
    const { ads, loading, closeAd } = useMyAds();

    const renderAd = ({ item }: { item: P2PAd }) => (
        <View style={styles.adCard}>
            <View style={styles.adHeader}>
                <Text style={styles.adType}>{item.type === 'BUY_FX' ? 'Buying' : 'Selling'}</Text>
                <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
                    {item.status}
                </Text>
            </View>

            <Text style={styles.currency}>{item.currency}</Text>
            <Text style={styles.amount}>
                {item.remainingAmount} / {item.totalAmount}
            </Text>
            <Text style={styles.price}>
                ₦{item.price.toLocaleString()} per {item.currency}
            </Text>

            {item.status === 'ACTIVE' && (
                <TouchableOpacity style={styles.closeButton} onPress={() => closeAd(item.id)}>
                    <Text style={styles.closeButtonText}>Close Ad</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    if (loading && ads.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    if (ads.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>No ads created yet</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={ads}
            renderItem={renderAd}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
        />
    );
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'ACTIVE':
            return '#10B981';
        case 'PAUSED':
            return '#F59E0B';
        case 'CLOSED':
            return '#6B7280';
        default:
            return '#6B7280';
    }
};

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        padding: 16,
    },
    adCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    adHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    adType: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    status: {
        fontSize: 12,
        fontWeight: '600',
    },
    currency: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 4,
    },
    amount: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 4,
    },
    price: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '600',
    },
    closeButton: {
        marginTop: 12,
        backgroundColor: '#EF4444',
        padding: 10,
        borderRadius: 6,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    emptyText: {
        fontSize: 16,
        color: '#6B7280',
    },
});
```

### 4.4 Payment Methods Screen

```typescript
// src/screens/PaymentMethodsScreen.tsx

import React from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { usePaymentMethods } from '../lib/hooks/usePaymentMethods';
import { P2PPaymentMethod } from '../lib/api/types';

export const PaymentMethodsScreen = ({ navigation }: any) => {
    const { paymentMethods, loading, deletePaymentMethod } = usePaymentMethods();

    const renderMethod = ({ item }: { item: P2PPaymentMethod }) => (
        <View style={styles.methodCard}>
            <View style={styles.methodHeader}>
                <Text style={styles.currency}>{item.currency}</Text>
                {item.isPrimary && (
                    <View style={styles.primaryBadge}>
                        <Text style={styles.primaryText}>Primary</Text>
                    </View>
                )}
            </View>

            <Text style={styles.bankName}>{item.bankName}</Text>
            <Text style={styles.accountNumber}>{item.accountNumber}</Text>
            <Text style={styles.accountName}>{item.accountName}</Text>

            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deletePaymentMethod(item.id)}
            >
                <Text style={styles.deleteButtonText}>Remove</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading && paymentMethods.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={paymentMethods}
                renderItem={renderMethod}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.centerContainer}>
                        <Text style={styles.emptyText}>No payment methods added</Text>
                    </View>
                }
            />

            <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('AddPaymentMethod')}
            >
                <Text style={styles.addButtonText}>+ Add Payment Method</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    list: {
        padding: 16,
    },
    methodCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    methodHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    currency: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    primaryBadge: {
        backgroundColor: '#DBEAFE',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    primaryText: {
        fontSize: 12,
        color: '#1D4ED8',
        fontWeight: '600',
    },
    bankName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    accountNumber: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 2,
    },
    accountName: {
        fontSize: 14,
        color: '#6B7280',
    },
    deleteButton: {
        marginTop: 12,
        padding: 8,
        alignItems: 'center',
    },
    deleteButtonText: {
        color: '#EF4444',
        fontWeight: '600',
    },
    addButton: {
        backgroundColor: '#007AFF',
        margin: 16,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    emptyText: {
        fontSize: 16,
        color: '#6B7280',
    },
});
```

### 4.5 Change Password Screen

```typescript
// src/screens/ChangePasswordScreen.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useProfile } from '../lib/hooks/useProfile';

export const ChangePasswordScreen = ({ navigation }: any) => {
    const { loading, changePassword } = useProfile();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters');
            return;
        }

        try {
            await changePassword(oldPassword, newPassword);
            Alert.alert('Success', 'Password changed successfully', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to change password');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Current Password</Text>
            <TextInput
                style={styles.input}
                value={oldPassword}
                onChangeText={setOldPassword}
                placeholder="Enter current password"
                secureTextEntry
            />

            <Text style={styles.label}>New Password</Text>
            <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry
            />

            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
            />

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleChangePassword}
                disabled={loading}
            >
                <Text style={styles.buttonText}>{loading ? 'Changing...' : 'Change Password'}</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
```

### 4.6 Set/Update Transaction PIN Screen

```typescript
// src/screens/TransactionPinScreen.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTransactionPin } from '../lib/hooks/useTransactionPin';
import { useAccountStore } from '../lib/stores/accountStore';

export const TransactionPinScreen = ({ navigation }: any) => {
    const { loading, setPin } = useTransactionPin();
    const user = useAccountStore(state => state.user);
    const hasPinSet = user?.transactionPin !== null;

    const [oldPin, setOldPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    const handleSetPin = async () => {
        if (newPin !== confirmPin) {
            Alert.alert('Error', 'PINs do not match');
            return;
        }

        if (newPin.length !== 4) {
            Alert.alert('Error', 'PIN must be exactly 4 digits');
            return;
        }

        if (!/^\d+$/.test(newPin)) {
            Alert.alert('Error', 'PIN must contain only numbers');
            return;
        }

        try {
            await setPin(newPin, hasPinSet ? oldPin : undefined);
            Alert.alert(
                'Success',
                hasPinSet ? 'PIN updated successfully' : 'PIN set successfully',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to set PIN');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                {hasPinSet ? 'Update Transaction PIN' : 'Set Transaction PIN'}
            </Text>
            <Text style={styles.description}>
                Your 4-digit PIN is required for all transactions
            </Text>

            {hasPinSet && (
                <>
                    <Text style={styles.label}>Current PIN</Text>
                    <TextInput
                        style={styles.input}
                        value={oldPin}
                        onChangeText={setOldPin}
                        placeholder="Enter current PIN"
                        keyboardType="number-pad"
                        maxLength={4}
                        secureTextEntry
                    />
                </>
            )}

            <Text style={styles.label}>New PIN</Text>
            <TextInput
                style={styles.input}
                value={newPin}
                onChangeText={setNewPin}
                placeholder="Enter new PIN"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
            />

            <Text style={styles.label}>Confirm New PIN</Text>
            <TextInput
                style={styles.input}
                value={confirmPin}
                onChangeText={setConfirmPin}
                placeholder="Confirm new PIN"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
            />

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSetPin}
                disabled={loading}
            >
                <Text style={styles.buttonText}>
                    {loading ? 'Setting...' : hasPinSet ? 'Update PIN' : 'Set PIN'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#000',
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
        textAlign: 'center',
        letterSpacing: 8,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
```

---

## 5. API Endpoint Reference

### 5.1 Profile Management

#### Update Profile

```
PUT /api/v1/account/user/profile
Authorization: Bearer <token>

Body:
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+2348012345678"
}

Response:
{
  "success": true,
  "data": { ...user object },
  "message": "Profile updated successfully"
}
```

#### Upload Profile Picture (To Be Implemented)

```
POST /api/v1/account/user/profile-picture
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- profilePicture: File

Response:
{
  "success": true,
  "data": { ...user object with updated avatarUrl },
  "message": "Profile picture uploaded successfully"
}
```

#### Change Password

```
POST /api/v1/account/user/change-password
Authorization: Bearer <token>

Body:
{
  "oldPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}

Response:
{
  "success": true,
  "message": "Password changed successfully"
}
```

### 5.2 Payment Methods

#### List Payment Methods

```
GET /api/v1/p2p/payment-methods
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "currency": "USD",
      "bankName": "Chase Bank",
      "accountNumber": "1234567890",
      "accountName": "John Doe",
      "details": { "routingNumber": "021..." },
      "isPrimary": true,
      "isActive": true
    }
  ]
}
```

#### Create Payment Method

```
POST /api/v1/p2p/payment-methods
Authorization: Bearer <token>

Body:
{
  "currency": "USD",
  "bankName": "Chase Bank",
  "accountNumber": "1234567890",
  "accountName": "John Doe",
  "details": { "routingNumber": "021..." }
}

Response:
{
  "success": true,
  "data": { ...payment method object }
}
```

#### Delete Payment Method

```
DELETE /api/v1/p2p/payment-methods/:id
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Payment method deleted successfully"
}
```

### 5.3 My Ads

#### List My Ads

```
GET /api/v1/p2p/ads?userId=me
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "BUY_FX",
      "currency": "USD",
      "totalAmount": 1000,
      "remainingAmount": 500,
      "price": 1500,
      "status": "ACTIVE",
      ...
    }
  ]
}
```

#### Close Ad

```
PATCH /api/v1/p2p/ads/:id/close
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Ad closed successfully"
}
```

### 5.4 Transaction PIN

#### Set/Update PIN

```
POST /api/v1/wallet/pin
Authorization: Bearer <token>

Body (Set):
{
  "newPin": "1234"
}

Body (Update):
{
  "oldPin": "1234",
  "newPin": "5678"
}

Response:
{
  "success": true,
  "message": "PIN set successfully"
}
```

#### Verify PIN

```
POST /api/v1/wallet/verify-pin
Authorization: Bearer <token>

Body:
{
  "pin": "1234"
}

Response:
{
  "success": true,
  "data": {
    "idempotencyKey": "uuid..."
  }
}
```

---

## 6. Features To Be Implemented

### 6.1 Notification Settings

**Backend Implementation Needed:**

-   Create a `NotificationSettings` model in Prisma
-   Add endpoints for getting and updating notification preferences
-   Support settings for: Push, Email, SMS, Transaction alerts, Marketing, etc.

**Suggested Schema:**

```prisma
model NotificationSettings {
  id                    String   @id @default(uuid())
  userId                String   @unique
  pushEnabled           Boolean  @default(true)
  emailEnabled          Boolean  @default(true)
  smsEnabled            Boolean  @default(false)
  transactionAlerts     Boolean  @default(true)
  marketingEmails       Boolean  @default(false)
  securityAlerts        Boolean  @default(true)

  user                  User     @relation(fields: [userId], references: [id])

  @@map("notification_settings")
}
```

**Suggested Endpoints:**

```
GET /api/v1/account/user/notification-settings
PUT /api/v1/account/user/notification-settings
```

### 6.2 Contact Support / Send Message to Admin

**Backend Implementation Needed:**

-   Create a `SupportTicket` model
-   Add endpoints for creating and viewing support tickets
-   Implement admin dashboard for viewing and responding to tickets

**Suggested Schema:**

```prisma
model SupportTicket {
  id          String              @id @default(uuid())
  userId      String
  subject     String
  message     String
  status      SupportTicketStatus @default(OPEN)
  priority    String              @default("NORMAL")
  category    String?
  attachments Json?

  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  user        User                @relation(fields: [userId], references: [id])
  responses   SupportResponse[]

  @@map("support_tickets")
}

model SupportResponse {
  id        String   @id @default(uuid())
  ticketId  String
  userId    String
  message   String
  isStaff   Boolean  @default(false)

  createdAt DateTime @default(now())

  ticket    SupportTicket @relation(fields: [ticketId], references: [id])
  user      User          @relation(fields: [userId], references: [id])

  @@map("support_responses")
}

enum SupportTicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}
```

**Suggested Endpoints:**

```
POST /api/v1/support/tickets
GET /api/v1/support/tickets
GET /api/v1/support/tickets/:id
POST /api/v1/support/tickets/:id/responses
```

---

## 7. Testing Checklist

-   [ ] Profile update works correctly
-   [ ] Profile picture upload works (after backend implementation)
-   [ ] Password change validates old password correctly
-   [ ] Payment methods can be added and deleted
-   [ ] My ads list shows only user's ads
-   [ ] Transaction PIN can be set for first time
-   [ ] Transaction PIN can be updated with old PIN
-   [ ] All error messages are user-friendly
-   [ ] Loading states are displayed correctly
-   [ ] Success messages are shown after operations

---

## 8. Best Practices

1. **Error Handling**: Always wrap API calls in try-catch blocks and show user-friendly error messages
2. **Loading States**: Show loading indicators during API calls
3. **Validation**: Validate user input before making API calls
4. **Security**: Never log sensitive data (passwords, PINs) in production
5. **Caching**: Consider caching user profile data to reduce API calls
6. **Offline Support**: Handle offline scenarios gracefully
7. **Accessibility**: Ensure all inputs have proper labels and are accessible

---

## 9. Next Steps

1. Implement profile picture upload endpoint on backend
2. Add notification settings feature (backend + frontend)
3. Add support ticket system (backend + frontend)
4. Add input validation schemas using Zod or Yup
5. Implement optimistic UI updates for better UX
6. Add analytics tracking for user actions
7. Implement proper error boundary components
