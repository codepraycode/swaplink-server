import { Job } from 'bullmq';
import { pushNotificationService } from '../../shared/lib/services/notification/push-notification.service';
import logger from '../../shared/lib/utils/logger';
import { prisma } from '../../shared/database';

export const notificationProcessor = async (job: Job) => {
    logger.info(`[NotificationWorker] Processing job ${job.id}: ${job.name}`);

    try {
        switch (job.name) {
            case 'send-notification':
                await handleSendNotification(job.data);
                break;
            default:
                logger.warn(`[NotificationWorker] Unknown job name: ${job.name}`);
        }
    } catch (error) {
        logger.error(`[NotificationWorker] Job ${job.id} failed:`, error);
        throw error;
    }
};

async function handleSendNotification(data: any) {
    const { userId, title, body, data: notificationData } = data;

    // 1. Fetch user's push token
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { pushToken: true },
    });

    if (!user || !user.pushToken) {
        logger.warn(`[NotificationWorker] User ${userId} has no push token. Skipping push.`);
        return;
    }

    // 2. Send Push Notification
    await pushNotificationService.sendPushNotifications(
        [user.pushToken],
        title,
        body,
        notificationData
    );
}
