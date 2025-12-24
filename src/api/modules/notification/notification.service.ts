import { prisma, Notification, Prisma } from '../../../shared/database';

export class NotificationService {
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
