import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { prisma } from '../shared/database';
import { logDebug, logError } from '../shared/lib/utils/logger';

const expo = new Expo();

export class NotificationService {
    /**
     * Send a push notification to a specific user by their User ID.
     */
    static async sendToUser(userId: string, title: string, body: string, data: any = {}) {
        try {
            // 1. Get user's push token
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { pushToken: true },
            });

            if (!user || !user.pushToken) {
                console.warn(`User ${userId} has no push token.`);
                return;
            }

            const pushToken = user.pushToken;

            // 2. Check if token is valid
            if (!Expo.isExpoPushToken(pushToken)) {
                console.error(`Push token ${pushToken} is not a valid Expo push token`);
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
            logError(error, 'Error in sendToUser:');
        }
    }
}
