# P2P Ad 24-Hour Auto-Pause Feature

## Overview

Implemented automatic pausing of P2P ads that have been active for more than 24 hours to ensure traders are still available and engaged.

## Problem Solved

- **Stale Ads**: Ads could remain active indefinitely even if the trader is no longer available
- **Poor User Experience**: Users might attempt to trade with inactive traders
- **Safety Concerns**: Ensures traders are actively monitoring their ads

## Solution

**Automatically pause ads after 24 hours of being active** and allow users to reactivate them when ready.

## Implementation Details

### 1. **Worker: Auto-Pause Logic** (`p2p-ad-cleanup.worker.ts`)

The cleanup worker now includes logic to automatically pause ads that have been active for more than 24 hours:

```typescript
// 1. Auto-Pause Ads Active for More Than 24 Hours
const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

const expiredAds = await prisma.p2PAd.findMany({
    where: {
        status: AdStatus.ACTIVE,
        createdAt: {
            lt: twentyFourHoursAgo,
        },
    },
    include: {
        user: true,
    },
});

// Pause each ad and notify user
for (const ad of expiredAds) {
    await prisma.p2PAd.update({
        where: { id: ad.id },
        data: { status: AdStatus.PAUSED },
    });

    // Send email notification
    await emailService.sendEmail({...});
}
```

### 2. **Service: Reactivate Method** (`p2p-ad.service.ts`)

Added `reactivateAd` method to allow users to reactivate paused ads:

```typescript
static async reactivateAd(userId: string, adId: string): Promise<P2PAd> {
    const ad = await prisma.p2PAd.findFirst({
        where: { id: adId, userId },
    });

    if (!ad) throw new NotFoundError('Ad not found');

    // Only allow reactivation of paused ads
    if (ad.status !== AdStatus.PAUSED) {
        throw new BadRequestError('Only paused ads can be reactivated');
    }

    // Validation checks
    if (ad.remainingAmount <= 0) {
        throw new BadRequestError('Cannot reactivate ad with no remaining amount');
    }

    if (ad.remainingAmount < ad.minLimit) {
        throw new BadRequestError(
            `Cannot reactivate ad. Remaining amount (${ad.remainingAmount}) is below minimum limit (${ad.minLimit})`
        );
    }

    // Reactivate the ad
    return await prisma.p2PAd.update({
        where: { id: adId },
        data: {
            status: AdStatus.ACTIVE,
            updatedAt: new Date(),
        },
    });
}
```

### 3. **Controller & Route** (`p2p-ad.controller.ts`, `p2p-ad.route.ts`)

Added controller method and route:

```typescript
// Controller
static async reactivate(req: Request, res: Response, next: NextFunction) {
    try {
        const { userId } = JwtUtils.ensureAuthentication(req);
        const { id } = req.params;
        const ad = await P2PAdService.reactivateAd(userId, id);
        return sendSuccess(res, ad, 'Ad reactivated successfully');
    } catch (error) {
        next(error);
    }
}

// Route
router.patch('/:id/reactivate', P2PAdController.reactivate);
```

### 4. **Email Notification**

Users receive an email when their ad is auto-paused:

```html
<p>Hello {firstName},</p>
<p>
    Your P2P Ad for <b>{currency}</b> (Rate: {price}) has been automatically paused after being
    active for 24 hours.
</p>
<p><b>Ad Details:</b></p>
<ul>
    <li>Type: {type}</li>
    <li>Currency: {currency}</li>
    <li>Rate: {price}</li>
    <li>Remaining Amount: {remainingAmount}</li>
</ul>
<p>This is a safety measure to ensure you're still available to complete trades.</p>
<p>You can reactivate your ad anytime from your dashboard if you're still available to trade.</p>
```

## API Endpoints

### Reactivate Ad

**PATCH** `/api/p2p/ads/:id/reactivate`

**Authentication**: Required

**Request:**

```bash
PATCH /api/p2p/ads/ad_123/reactivate
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
    "success": true,
    "message": "Ad reactivated successfully",
    "data": {
        "id": "ad_123",
        "userId": "user_123",
        "type": "BUY_FX",
        "currency": "USD",
        "price": 1450,
        "status": "ACTIVE",
        "remainingAmount": 500,
        "minLimit": 50,
        "maxLimit": 500,
        "createdAt": "2026-02-04T12:00:00Z",
        "updatedAt": "2026-02-05T13:00:00Z"
    }
}
```

**Error Responses:**

- **404 Not Found**: Ad not found

```json
{
    "success": false,
    "message": "Ad not found"
}
```

- **400 Bad Request**: Invalid status

```json
{
    "success": false,
    "message": "Only paused ads can be reactivated"
}
```

- **400 Bad Request**: No remaining amount

```json
{
    "success": false,
    "message": "Cannot reactivate ad with no remaining amount"
}
```

- **400 Bad Request**: Below minimum limit

```json
{
    "success": false,
    "message": "Cannot reactivate ad. Remaining amount (30) is below minimum limit (50)"
}
```

## Worker Schedule

The P2P ad cleanup worker runs periodically (configured in queue setup) to:

1. ✅ **Auto-pause ads** active for more than 24 hours
2. ✅ **Close ads** with 0 remaining amount
3. ✅ **Notify users** about dust ads (remaining < minLimit)

## User Flow

### When Ad is Auto-Paused:

1. Worker detects ad has been active for 24+ hours
2. Ad status changed from `ACTIVE` to `PAUSED`
3. User receives email notification
4. Ad no longer appears in public feed
5. No new orders can be placed

### When User Wants to Reactivate:

1. User navigates to their ads dashboard
2. User clicks "Reactivate" on paused ad
3. System validates:
    - Ad status is `PAUSED`
    - Remaining amount > 0
    - Remaining amount >= minLimit
4. If valid, ad status changed to `ACTIVE`
5. Ad appears in public feed again
6. New orders can be placed

## Benefits

1. **✅ Safety**: Ensures traders are actively monitoring their ads
2. **✅ User Experience**: Reduces failed trades with inactive users
3. **✅ Engagement**: Encourages active participation
4. **✅ Flexibility**: Users can easily reactivate when ready
5. **✅ Transparency**: Clear communication via email notifications
6. **✅ Compliance**: Prevents stale listings

## Testing

### Test Auto-Pause:

```typescript
// Create an ad with createdAt > 24 hours ago
const ad = await prisma.p2PAd.create({
    data: {
        // ... ad data
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        status: 'ACTIVE',
    },
});

// Run worker
await p2pAdCleanupWorker.processJob();

// Verify ad is paused
const updatedAd = await prisma.p2PAd.findUnique({ where: { id: ad.id } });
expect(updatedAd.status).toBe('PAUSED');
```

### Test Reactivation:

```typescript
// Test successful reactivation
const result = await request(app)
    .patch(`/api/p2p/ads/${pausedAdId}/reactivate`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

expect(result.body.data.status).toBe('ACTIVE');

// Test error cases
await request(app)
    .patch(`/api/p2p/ads/${activeAdId}/reactivate`)
    .set('Authorization', `Bearer ${token}`)
    .expect(400); // Only paused ads can be reactivated
```

## Files Modified

1. `src/worker/p2p-ad-cleanup.worker.ts` - Added 24-hour auto-pause logic
2. `src/api/modules/p2p/ad/p2p-ad.service.ts` - Added reactivateAd method
3. `src/api/modules/p2p/ad/p2p-ad.controller.ts` - Added reactivate controller
4. `src/api/modules/p2p/ad/p2p-ad.route.ts` - Added reactivate route

## Configuration

The 24-hour limit is currently hardcoded. To make it configurable:

```typescript
// .env
P2P_AD_MAX_ACTIVE_HOURS = 24;

// worker
const maxActiveHours = parseInt(process.env.P2P_AD_MAX_ACTIVE_HOURS || '24');
const expirationTime = new Date(Date.now() - maxActiveHours * 60 * 60 * 1000);
```

## Future Enhancements

- Add admin override to extend ad duration
- Add statistics on ad reactivation rates
- Add push notifications for mobile apps
- Add grace period before auto-pause (e.g., 23 hours warning)
- Add option for users to set auto-reactivation schedule
- Track number of times an ad has been reactivated
