# P2P Email Templates

## Overview

Standardized Handlebars email templates for all P2P-related notifications.

## Templates

### 1. **P2P Ad Auto-Paused** (`p2p-ad-paused.hbs`)

**When Sent:** Automatically sent when an ad has been active for 24 hours

**Subject:** "P2P Ad Auto-Paused After 24 Hours"

**Data Required:**

```typescript
{
    name: string; // User's first name
    adType: string; // BUY_FX or SELL_FX
    currency: string; // USD, EUR, GBP, etc.
    price: number; // Exchange rate
    remainingAmount: number; // Remaining amount in ad
    dashboardUrl: string; // Link to P2P dashboard
}
```

**Usage:**

```typescript
await emailService.sendTemplatedEmail({
    to: user.email,
    subject: 'P2P Ad Auto-Paused After 24 Hours',
    templateName: 'p2p-ad-paused',
    data: {
        name: user.firstName,
        adType: 'BUY_FX',
        currency: 'USD',
        price: 1450,
        remainingAmount: 500,
        dashboardUrl: `${process.env.FRONTEND_URL}/p2p/my-ads`,
    },
});
```

**Features:**

- ✅ Displays ad details in a formatted table
- ✅ Explains why the ad was paused
- ✅ Provides clear call-to-action button to reactivate
- ✅ Consistent styling with other email templates

---

### 2. **P2P Ad Low Balance** (`p2p-ad-low-balance.hbs`)

**When Sent:** When an ad's remaining amount falls below the minimum limit

**Subject:** "Action Required: P2P Ad Low Balance"

**Data Required:**

```typescript
{
    name: string; // User's first name
    adType: string; // BUY_FX or SELL_FX
    currency: string; // USD, EUR, GBP, etc.
    price: number; // Exchange rate
    remainingAmount: number; // Current remaining amount
    minLimit: number; // Minimum limit set by user
    dashboardUrl: string; // Link to P2P dashboard
}
```

**Usage:**

```typescript
await emailService.sendTemplatedEmail({
    to: user.email,
    subject: 'Action Required: P2P Ad Low Balance',
    templateName: 'p2p-ad-low-balance',
    data: {
        name: user.firstName,
        adType: 'SELL_FX',
        currency: 'USD',
        price: 1450,
        remainingAmount: 30,
        minLimit: 50,
        dashboardUrl: `${process.env.FRONTEND_URL}/p2p/my-ads`,
    },
});
```

**Features:**

- ✅ Highlights the issue with warning styling
- ✅ Shows both remaining amount and minimum limit
- ✅ Provides actionable steps to resolve
- ✅ Clear call-to-action to manage the ad

---

## Email Type Definitions

Added to `email.types.ts`:

```typescript
export interface P2PAdPausedEmailData {
    adType: string;
    currency: string;
    price: number;
    remainingAmount: number;
    dashboardUrl: string;
}

export interface P2PAdLowBalanceEmailData {
    adType: string;
    currency: string;
    price: number;
    remainingAmount: number;
    minLimit: number;
    dashboardUrl: string;
}

export type EmailJobType =
    | 'otp'
    | 'welcome'
    | 'kyc-status'
    | 'transaction'
    | 'password-reset'
    | 'wallet-created'
    | 'p2p-ad-paused' // ✅ NEW
    | 'p2p-ad-low-balance' // ✅ NEW
    | 'generic';
```

---

## Worker Integration

### Before (Inline HTML):

```typescript
await emailService.sendEmail({
    to: ad.user.email,
    subject: 'P2P Ad Auto-Paused After 24 Hours',
    html: `
        <p>Hello ${ad.user.firstName},</p>
        <p>Your P2P Ad for <b>${ad.currency}</b>...</p>
        ...
    `,
});
```

### After (Templated):

```typescript
await emailService.sendTemplatedEmail({
    to: ad.user.email,
    subject: 'P2P Ad Auto-Paused After 24 Hours',
    templateName: 'p2p-ad-paused',
    data: {
        name: ad.user.firstName,
        adType: ad.type,
        currency: ad.currency,
        price: ad.price,
        remainingAmount: ad.remainingAmount,
        dashboardUrl: `${process.env.FRONTEND_URL}/p2p/my-ads`,
    },
});
```

---

## Design Consistency

All P2P email templates follow the same design patterns as other system emails:

### Common Elements:

1. **Greeting:** `Hello {name},`
2. **Information Table:** Formatted table with ad details
3. **Alert Boxes:** Color-coded boxes for important information
    - Blue (`#e3f2fd` / `#2196f3`) - Informational
    - Yellow (`#fff3cd` / `#ffc107`) - Warning/Action Required
4. **Call-to-Action:** Prominent button linking to dashboard
5. **Consistent Typography:** Same fonts and sizes as other emails

### Color Scheme:

- **Primary Action:** Green (`#4caf50`)
- **Secondary Action:** Blue (`#2196f3`)
- **Warning:** Orange (`#ff9800`)
- **Info:** Blue (`#2196f3`)
- **Alert:** Yellow (`#ffc107`)

---

## Environment Variables

Ensure `FRONTEND_URL` is set in your `.env` file:

```bash
FRONTEND_URL=https://app.swaplink.com
```

This is used to generate the dashboard URL in emails.

---

## Testing

### Test Auto-Pause Email:

```typescript
await emailService.sendTemplatedEmail({
    to: 'test@example.com',
    subject: 'P2P Ad Auto-Paused After 24 Hours',
    templateName: 'p2p-ad-paused',
    data: {
        name: 'John',
        adType: 'BUY_FX',
        currency: 'USD',
        price: 1450,
        remainingAmount: 500,
        dashboardUrl: 'https://app.swaplink.com/p2p/my-ads',
    },
});
```

### Test Low Balance Email:

```typescript
await emailService.sendTemplatedEmail({
    to: 'test@example.com',
    subject: 'Action Required: P2P Ad Low Balance',
    templateName: 'p2p-ad-low-balance',
    data: {
        name: 'Jane',
        adType: 'SELL_FX',
        currency: 'EUR',
        price: 1580,
        remainingAmount: 25,
        minLimit: 50,
        dashboardUrl: 'https://app.swaplink.com/p2p/my-ads',
    },
});
```

---

## Files Created/Modified

### Created:

1. ✅ `src/templates/emails/p2p-ad-paused.hbs`
2. ✅ `src/templates/emails/p2p-ad-low-balance.hbs`

### Modified:

1. ✅ `src/shared/lib/services/email-service/email.types.ts` - Added P2P email types
2. ✅ `src/worker/p2p-ad-cleanup.worker.ts` - Updated to use templates

---

## Benefits

1. **✅ Consistency:** All emails follow the same design language
2. **✅ Maintainability:** Easy to update templates without touching code
3. **✅ Type Safety:** TypeScript interfaces ensure correct data
4. **✅ Reusability:** Templates can be used across different parts of the app
5. **✅ Professionalism:** Polished, branded email experience
6. **✅ Localization Ready:** Easy to add translations in the future

---

## Future P2P Email Templates

Consider adding templates for:

- Order created/matched
- Order payment confirmed
- Order completed
- Order disputed
- Order cancelled
- Payment method verified
- Trade partner rating reminder
