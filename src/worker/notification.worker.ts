import { Worker, Job } from 'bullmq';
import { redisConnection } from '../shared/config/redis.config';
import { prisma } from '../shared/database';
import logger, { logDebug, logError } from '../shared/lib/utils/logger';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

interface NotificationJobData {
    userId: string;
    title: string;
    body: string;
    data?: any;
}

const processNotification = async (job: Job<NotificationJobData>) => {
    const { userId, title, body, data } = job.data;
    logger.info(`Processing notification for user ${userId}`);

    try {
        // 1. Get user's push token
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { pushToken: true },
        });

        if (!user || !user.pushToken) {
            logger.warn(`User ${userId} has no push token. Skipping push notification.`);
            return;
        }

        const pushToken = user.pushToken;

        // 2. Check if token is valid
        if (!Expo.isExpoPushToken(pushToken)) {
            logger.error(`Push token ${pushToken} is not a valid Expo push token`);
            return;
        }

        // 3. Construct message
        const messages: ExpoPushMessage[] = [
            {
                to: pushToken,
                sound: 'default',
                title: title,
                body: body,
                data: data,
            },
        ];

        // 4. Send notification
        const chunks = expo.chunkPushNotifications(messages);

        for (const chunk of chunks) {
            try {
                const tickets = await expo.sendPushNotificationsAsync(chunk);
                logDebug('Notification sent:', tickets);

                // Process tickets to identify errors
                tickets.forEach(async ticket => {
                    if (ticket.status === 'error') {
                        if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
                            // Delete invalid token
                            logDebug(`Token ${pushToken} is invalid, deleting...`);
                            await prisma.user.update({
                                where: { id: userId },
                                data: { pushToken: null },
                            });
                        }
                    }
                });
            } catch (error) {
                logError(error, 'Error sending notification chunk:');
            }
        }
    } catch (error) {
        logError(error, `Error processing notification for user ${userId}`);
        throw error;
    }
};

export const notificationWorker = new Worker('notification-queue', processNotification, {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
        max: 50,
        duration: 1000,
    },
});

notificationWorker.on('completed', job => {
    logger.info(`Notification Job ${job.id} completed`);
});

notificationWorker.on('failed', (job, err) => {
    logger.error(`Notification Job ${job?.id} failed`, err);
});
