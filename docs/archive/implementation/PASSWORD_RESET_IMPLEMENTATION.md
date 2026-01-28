# Password Reset Implementation Guide - Expo App

## Overview

This guide provides step-by-step procedures to implement a complete password reset flow in your Expo app, integrating with the existing backend endpoints.

---

## Backend Endpoints (Already Implemented)

Your server already has these endpoints:

1. **Request Password Reset**: `POST /api/auth/password/reset-request`
2. **Verify Reset OTP**: `POST /api/auth/password/verify-otp`
3. **Reset Password**: `POST /api/auth/password/reset`

---

## Implementation Steps

### Step 1: Create API Service Methods

Create or update your auth API service file (e.g., `src/services/api/auth.api.ts`):

```typescript
import api from './client'; // Your axios/fetch client

export const authAPI = {
    // ... existing methods

    /**
     * Request password reset - sends OTP to user's email
     */
    requestPasswordReset: async (email: string) => {
        const response = await api.post('/auth/password/reset-request', { email });
        return response.data;
    },

    /**
     * Verify the OTP sent for password reset
     */
    verifyResetOtp: async (email: string, otp: string) => {
        const response = await api.post('/auth/password/verify-otp', {
            email,
            otp,
        });
        return response.data;
    },

    /**
     * Reset password with verified OTP
     */
    resetPassword: async (email: string, otp: string, newPassword: string) => {
        const response = await api.post('/auth/password/reset', {
            email,
            otp,
            newPassword,
        });
        return response.data;
    },
};
```

---

### Step 2: Create Password Reset Screens

You'll need a multi-step flow with 3 screens:

#### 2.1 Request Reset Screen (`ForgotPasswordScreen.tsx`)

```typescript
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { authAPI } from '@/services/api/auth.api';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import Toast from '@/components/common/Toast';

export default function ForgotPasswordScreen() {
    const navigation = useNavigation();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRequestReset = async () => {
        if (!email.trim()) {
            Toast.show('Please enter your email address', 'error');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Toast.show('Please enter a valid email address', 'error');
            return;
        }

        setLoading(true);
        try {
            await authAPI.requestPasswordReset(email);

            Toast.show('OTP sent to your email', 'success');

            // Navigate to OTP verification screen
            navigation.navigate('VerifyResetOTP', { email });
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Failed to send reset code';
            Toast.show(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Forgot Password?</Text>
                <Text style={styles.subtitle}>
                    Enter your email address and we'll send you a code to reset your password.
                </Text>

                <Input
                    label="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your.email@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!loading}
                />

                <Button
                    title="Send Reset Code"
                    onPress={handleRequestReset}
                    loading={loading}
                    disabled={loading}
                    style={styles.button}
                />

                <Button
                    title="Back to Login"
                    onPress={() => navigation.goBack()}
                    variant="text"
                    disabled={loading}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#1a1a1a',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 32,
        lineHeight: 22,
    },
    button: {
        marginTop: 16,
    },
});
```

#### 2.2 Verify OTP Screen (`VerifyResetOTPScreen.tsx`)

```typescript
import React, { useState, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { authAPI } from '@/services/api/auth.api';
import Button from '@/components/common/Button';
import Toast from '@/components/common/Toast';
import OTPInput from '@/components/common/OTPInput'; // Or your OTP component

export default function VerifyResetOTPScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { email } = route.params as { email: string };

    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);

    const handleVerifyOTP = async () => {
        if (otp.length !== 6) {
            Toast.show('Please enter the 6-digit code', 'error');
            return;
        }

        setLoading(true);
        try {
            await authAPI.verifyResetOtp(email, otp);

            Toast.show('Code verified successfully', 'success');

            // Navigate to new password screen
            navigation.navigate('ResetPassword', { email, otp });
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Invalid or expired code';
            Toast.show(message, 'error');
            setOtp(''); // Clear OTP on error
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setResending(true);
        try {
            await authAPI.requestPasswordReset(email);
            Toast.show('New code sent to your email', 'success');
            setOtp(''); // Clear current OTP
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Failed to resend code';
            Toast.show(message, 'error');
        } finally {
            setResending(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Enter Verification Code</Text>
                <Text style={styles.subtitle}>
                    We sent a 6-digit code to{'\n'}
                    <Text style={styles.email}>{email}</Text>
                </Text>

                <OTPInput length={6} value={otp} onChange={setOtp} disabled={loading} />

                <Button
                    title="Verify Code"
                    onPress={handleVerifyOTP}
                    loading={loading}
                    disabled={loading || otp.length !== 6}
                    style={styles.button}
                />

                <View style={styles.resendContainer}>
                    <Text style={styles.resendText}>Didn't receive the code? </Text>
                    <Button
                        title="Resend"
                        onPress={handleResendCode}
                        variant="text"
                        loading={resending}
                        disabled={resending || loading}
                    />
                </View>

                <Button
                    title="Back"
                    onPress={() => navigation.goBack()}
                    variant="text"
                    disabled={loading}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#1a1a1a',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 32,
        lineHeight: 22,
        textAlign: 'center',
    },
    email: {
        fontWeight: '600',
        color: '#1a1a1a',
    },
    button: {
        marginTop: 24,
    },
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    resendText: {
        fontSize: 14,
        color: '#666',
    },
});
```

#### 2.3 Reset Password Screen (`ResetPasswordScreen.tsx`)

```typescript
import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { authAPI } from '@/services/api/auth.api';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import Toast from '@/components/common/Toast';

export default function ResetPasswordScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { email, otp } = route.params as { email: string; otp: string };

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const validatePassword = () => {
        if (newPassword.length < 8) {
            Toast.show('Password must be at least 8 characters', 'error');
            return false;
        }

        if (newPassword !== confirmPassword) {
            Toast.show('Passwords do not match', 'error');
            return false;
        }

        // Additional password strength validation
        const hasUpperCase = /[A-Z]/.test(newPassword);
        const hasLowerCase = /[a-z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);

        if (!hasUpperCase || !hasLowerCase || !hasNumber) {
            Toast.show('Password must contain uppercase, lowercase, and numbers', 'error');
            return false;
        }

        return true;
    };

    const handleResetPassword = async () => {
        if (!validatePassword()) {
            return;
        }

        setLoading(true);
        try {
            await authAPI.resetPassword(email, otp, newPassword);

            Toast.show('Password reset successfully!', 'success');

            // Navigate back to login screen and clear navigation stack
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                })
            );
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Failed to reset password';
            Toast.show(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Create New Password</Text>
                <Text style={styles.subtitle}>
                    Your new password must be different from previously used passwords.
                </Text>

                <Input
                    label="New Password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!loading}
                />

                <Input
                    label="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter new password"
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!loading}
                />

                <View style={styles.requirements}>
                    <Text style={styles.requirementsTitle}>Password must contain:</Text>
                    <Text style={styles.requirement}>• At least 8 characters</Text>
                    <Text style={styles.requirement}>• Uppercase and lowercase letters</Text>
                    <Text style={styles.requirement}>• At least one number</Text>
                </View>

                <Button
                    title="Reset Password"
                    onPress={handleResetPassword}
                    loading={loading}
                    disabled={loading || !newPassword || !confirmPassword}
                    style={styles.button}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#1a1a1a',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 32,
        lineHeight: 22,
    },
    requirements: {
        backgroundColor: '#f5f5f5',
        padding: 16,
        borderRadius: 8,
        marginTop: 16,
    },
    requirementsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    requirement: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    button: {
        marginTop: 24,
    },
});
```

---

### Step 3: Update Navigation

Add the new screens to your navigation stack (e.g., `src/navigation/AuthNavigator.tsx`):

```typescript
import ForgotPasswordScreen from '@/screens/auth/ForgotPasswordScreen';
import VerifyResetOTPScreen from '@/screens/auth/VerifyResetOTPScreen';
import ResetPasswordScreen from '@/screens/auth/ResetPasswordScreen';

// In your Stack.Navigator
<Stack.Screen
  name="ForgotPassword"
  component={ForgotPasswordScreen}
  options={{ title: 'Forgot Password' }}
/>
<Stack.Screen
  name="VerifyResetOTP"
  component={VerifyResetOTPScreen}
  options={{ title: 'Verify Code' }}
/>
<Stack.Screen
  name="ResetPassword"
  component={ResetPasswordScreen}
  options={{ title: 'Reset Password' }}
/>
```

---

### Step 4: Add Link to Login Screen

Update your `LoginScreen.tsx` to include a "Forgot Password?" link:

```typescript
// In your LoginScreen.tsx, add this button after the login button:

<TouchableOpacity
    onPress={() => navigation.navigate('ForgotPassword')}
    style={styles.forgotPasswordButton}
>
    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
</TouchableOpacity>;

// Styles:
const styles = StyleSheet.create({
    // ... existing styles
    forgotPasswordButton: {
        alignSelf: 'center',
        marginTop: 16,
        padding: 8,
    },
    forgotPasswordText: {
        fontSize: 14,
        color: '#007AFF', // Your primary color
        fontWeight: '600',
    },
});
```

---

### Step 5: Create OTP Input Component (if needed)

If you don't have an OTP input component, create one (`src/components/common/OTPInput.tsx`):

```typescript
import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

interface OTPInputProps {
    length: number;
    value: string;
    onChange: (otp: string) => void;
    disabled?: boolean;
}

export default function OTPInput({ length, value, onChange, disabled }: OTPInputProps) {
    const inputRefs = useRef<(TextInput | null)[]>([]);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const handleChangeText = (text: string, index: number) => {
        // Only allow numbers
        const sanitized = text.replace(/[^0-9]/g, '');

        if (sanitized.length === 0) {
            // Handle backspace
            const newValue = value.split('');
            newValue[index] = '';
            onChange(newValue.join(''));

            // Focus previous input
            if (index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
        } else {
            // Handle input
            const newValue = value.split('');
            newValue[index] = sanitized[0];
            onChange(newValue.join(''));

            // Focus next input
            if (index < length - 1) {
                inputRefs.current[index + 1]?.focus();
            }
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    return (
        <View style={styles.container}>
            {Array.from({ length }).map((_, index) => (
                <TextInput
                    key={index}
                    ref={ref => (inputRefs.current[index] = ref)}
                    style={[
                        styles.input,
                        focusedIndex === index && styles.inputFocused,
                        value[index] && styles.inputFilled,
                    ]}
                    value={value[index] || ''}
                    onChangeText={text => handleChangeText(text, index)}
                    onKeyPress={e => handleKeyPress(e, index)}
                    onFocus={() => setFocusedIndex(index)}
                    onBlur={() => setFocusedIndex(null)}
                    keyboardType="number-pad"
                    maxLength={1}
                    editable={!disabled}
                    selectTextOnFocus
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginVertical: 24,
    },
    input: {
        width: 48,
        height: 56,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        fontSize: 24,
        fontWeight: '600',
        textAlign: 'center',
        backgroundColor: '#fff',
    },
    inputFocused: {
        borderColor: '#007AFF', // Your primary color
    },
    inputFilled: {
        borderColor: '#007AFF',
        backgroundColor: '#F0F8FF',
    },
});
```

---

### Step 6: Type Definitions

Add type definitions for navigation (e.g., `src/types/navigation.ts`):

```typescript
export type AuthStackParamList = {
    // ... existing routes
    Login: undefined;
    SignUp: undefined;
    ForgotPassword: undefined;
    VerifyResetOTP: { email: string };
    ResetPassword: { email: string; otp: string };
};
```

---

## Testing Checklist

-   [ ] **Request Reset**: Email field validation works
-   [ ] **Request Reset**: OTP is sent to email successfully
-   [ ] **Request Reset**: Error handling for invalid email
-   [ ] **Verify OTP**: 6-digit OTP input works correctly
-   [ ] **Verify OTP**: Valid OTP proceeds to reset password screen
-   [ ] **Verify OTP**: Invalid OTP shows error message
-   [ ] **Verify OTP**: Resend code functionality works
-   [ ] **Reset Password**: Password validation works (length, complexity)
-   [ ] **Reset Password**: Passwords must match
-   [ ] **Reset Password**: Successful reset redirects to login
-   [ ] **Reset Password**: Error handling for expired OTP
-   [ ] **Navigation**: All screens are properly linked
-   [ ] **UI/UX**: Loading states are shown appropriately
-   [ ] **UI/UX**: Error messages are user-friendly

---

## Error Handling

Common errors to handle:

1. **Email not found**: "No account found with this email"
2. **Invalid OTP**: "Invalid or expired verification code"
3. **Expired OTP**: "Verification code has expired. Please request a new one"
4. **Weak password**: "Password does not meet security requirements"
5. **Network error**: "Unable to connect. Please check your internet connection"

---

## Security Considerations

1. **Never store OTP** in app state longer than necessary
2. **Clear sensitive data** when navigating away from screens
3. **Implement rate limiting** on the frontend (disable resend for 60 seconds)
4. **Use secure password input** (secureTextEntry prop)
5. **Validate password strength** before submission
6. **Clear navigation stack** after successful reset to prevent back navigation

---

## Optional Enhancements

1. **Timer for OTP expiry**: Show countdown (e.g., "Code expires in 5:00")
2. **Password strength indicator**: Visual feedback on password strength
3. **Biometric re-authentication**: After password reset, prompt for biometric setup
4. **Email masking**: Show "s\*\*\*@example.com" instead of full email
5. **Auto-fill OTP**: Use SMS retrieval API for automatic OTP detection
6. **Dark mode support**: Ensure all screens support dark theme

---

## Flow Diagram

```
┌─────────────────┐
│  Login Screen   │
└────────┬────────┘
         │ "Forgot Password?"
         ▼
┌─────────────────────┐
│ ForgotPassword      │ ──► Enter email
│ Screen              │ ──► Request OTP
└────────┬────────────┘
         │ OTP sent
         ▼
┌─────────────────────┐
│ VerifyResetOTP      │ ──► Enter 6-digit code
│ Screen              │ ──► Verify OTP
└────────┬────────────┘     ──► Resend option
         │ OTP verified
         ▼
┌─────────────────────┐
│ ResetPassword       │ ──► Enter new password
│ Screen              │ ──► Confirm password
└────────┬────────────┘     ──► Validate & submit
         │ Success
         ▼
┌─────────────────────┐
│  Login Screen       │ ──► Login with new password
└─────────────────────┘
```

---

## Notes

-   The backend already implements all required endpoints with proper rate limiting
-   OTP is sent via email (ensure your email service is configured on the server)
-   OTP expires after a set time (check your backend configuration)
-   The flow uses email-based verification (not phone)
-   All screens should match your existing design system and theme

---

## Support

If you encounter issues:

1. Check backend logs for API errors
2. Verify email service is working on the server
3. Test with a valid email address
4. Ensure rate limiting isn't blocking requests
5. Check network connectivity in the app

---

**Last Updated**: December 17, 2025
