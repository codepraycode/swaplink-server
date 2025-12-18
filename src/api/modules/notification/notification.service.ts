import { prisma, NotificationType, Notification, Prisma } from '../../../shared/database';
import { logError } from '../../../shared/lib/utils/logger';
import { socketService } from '../../../shared/lib/services/socket.service';
import { getNotificationQueue } from '../../../shared/lib/init/service-initializer';

export class NotificationService {
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

    /**
     * Get all notifications for a user.
     */
    static async getAll(userId: string): Promise<Notification[]> {
        return prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Mark a notification as read.
     */
    static async markAsRead(userId: string, notificationId: string): Promise<Notification> {
        return prisma.notification.update({
            where: { id: notificationId, userId }, // Ensure ownership
            data: { isRead: true },
        });
    }

    /**
     * Mark all notifications as read for a user.
     */
    static async markAllAsRead(userId: string): Promise<Prisma.BatchPayload> {
        return prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }
}
