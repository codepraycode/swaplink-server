import { eventBus, EventType } from '../event-bus';
import NotificationUtil from '../../services/notification/notification-utils';
import { NotificationType, NotificationChannel } from '../../../database';
import logger from '../../utils/logger';

export function setupKycListeners() {
    // KYC Submitted
    eventBus.subscribe(EventType.KYC_SUBMITTED, async data => {
        const { userId } = data;

        await NotificationUtil.sendToUser(
            userId,
            'KYC Submitted',
            'Your documents have been received and are under review.',
            data,
            NotificationType.KYC,
            NotificationChannel.INAPP
        );

        // TODO: Notify Admin (e.g., via Slack or Admin Dashboard Notification)
        logger.info(`[KYC Listener] Admin Alert: User ${userId} submitted KYC.`);
    });

    // KYC Approved
    eventBus.subscribe(EventType.KYC_APPROVED, async data => {
        const { userId, level } = data;

        await NotificationUtil.sendToUser(
            userId,
            'KYC Approved',
            `Congratulations! Your account has been upgraded to ${level} level.`,
            data,
            NotificationType.KYC,
            NotificationChannel.PUSH
        );
    });

    // KYC Rejected
    eventBus.subscribe(EventType.KYC_REJECTED, async data => {
        const { userId, reason } = data;

        await NotificationUtil.sendToUser(
            userId,
            'KYC Rejected',
            `Your KYC application was rejected. Reason: ${reason}`,
            data,
            NotificationType.KYC,
            NotificationChannel.PUSH
        );
    });
}
