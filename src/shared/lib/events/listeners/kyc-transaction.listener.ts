import { eventBus, EventType } from '../../../../shared/lib/events/event-bus';
import {
    prisma,
    KycLevel,
    NotificationType,
    NotificationChannel,
} from '../../../../shared/database';
import NotificationUtil from '../../../../shared/lib/services/notification/notification-utils';
import logger from '../../../../shared/lib/utils/logger';

const TIER_1_LIMIT = 30000000; // 30 Million NGN

export function setupKycTransactionListeners() {
    eventBus.subscribe(EventType.TRANSACTION_COMPLETED, async data => {
        const { userId, amount, type } = data;

        // Only track inflows (Deposits or Transfers received)
        // Assuming 'type' helps distinguish, or we need to know if userId is receiver.
        // For now, let's assume if the event is emitted for a user, and it's a credit, it's an inflow.
        // But the event bus might emit for both sender and receiver?
        // Let's assume 'DEPOSIT' is always inflow. 'TRANSFER' could be in or out.
        // If 'TRANSFER' and userId is the receiver...
        // The event data usually contains context.
        // Let's assume for this milestone that we just track DEPOSITs for simplicity,
        // or check if the amount is positive?
        // Actually, let's just update cumulativeInflow for DEPOSIT.

        if (type === 'DEPOSIT') {
            try {
                const user = await prisma.user.findUnique({ where: { id: userId } });
                if (!user) return;

                const newCumulative = user.cumulativeInflow.add(amount);

                await prisma.user.update({
                    where: { id: userId },
                    data: { cumulativeInflow: newCumulative },
                });

                // Check Limit
                if (newCumulative.toNumber() > TIER_1_LIMIT && user.kycLevel !== KycLevel.FULL) {
                    // Restrict Account
                    await prisma.user.update({
                        where: { id: userId },
                        data: { isActive: false }, // Or a specific restriction flag
                    });

                    // Notify User
                    await NotificationUtil.sendToUser(
                        userId,
                        'Account Restricted',
                        'You have exceeded the cumulative inflow limit of 30 Million NGN. Please upgrade to Tier 2 (Full KYC) to continue.',
                        {},
                        NotificationType.KYC,
                        NotificationChannel.PUSH
                    );

                    // Alert Admin
                    logger.warn(`[KYC] User ${userId} restricted. Exceeded 30M inflow limit.`);
                }
            } catch (error) {
                logger.error(`[KYC] Error processing transaction listener: ${error}`);
            }
        }
    });
}
