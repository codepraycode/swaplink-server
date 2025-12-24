import { Notification, NotificationType } from '../../../database/generated/prisma';
import { prisma } from '../../../database';
import { logError } from '../../utils/logger';
import { socketService } from '../socket.service';
import { getNotificationQueue } from '../../init/service-initializer';

export default class NotificationUtil {
    /**
     * Send a notification to a specific user.
     * Persists to DB and adds to worker queue for push notification.
     */
    static async sendToUser(
        userId: string,
        title: string,
        body: string,
        data: any = {},
        type: NotificationType = NotificationType.SYSTEM
    ): Promise<Notification> {
        try {
            // 1. Persist Notification to DB
            const notification = await prisma.notification.create({
                data: {
                    userId,
                    title,
                    body,
                    type,
                    data,
                    isRead: false,
                },
            });

            // 2. Add to Queue for Push Notification
            await getNotificationQueue().add('send-notification', {
                userId,
                title,
                body,
                data: { ...data, notificationId: notification.id },
            });

            // 3. Emit Socket Event
            socketService.emitToUser(userId, 'NEW_NOTIFICATION', notification);

            return notification;
        } catch (error) {
            logError(error, 'Error in sendToUser:');
            throw error;
        }
    }
}
