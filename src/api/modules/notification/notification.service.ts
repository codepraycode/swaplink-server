import { prisma, Notification, Prisma, NotificationType } from '../../../shared/database';
import { socketService } from '../../../shared/lib/services/socket.service';

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

    /**
     * Send a notification to a user.
     */
    static async sendToUser(
        userId: string,
        title: string,
        message: string,
        metadata: any = {},
        type: NotificationType = NotificationType.SYSTEM
    ): Promise<Notification> {
        // 1. Create in DB
        const notification = await prisma.notification.create({
            data: {
                userId,
                title,
                body: message,
                data: metadata,
                type,
                isRead: false,
            },
        });

        // 2. Emit Socket Event
        socketService.emitToUser(userId, 'NOTIFICATION_NEW', notification);

        return notification;
    }
}
