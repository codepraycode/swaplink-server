import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import logger from '../../utils/logger';

export class PushNotificationService {
    private expo: Expo | null = null;

    constructor() {
        try {
            this.expo = new Expo();
            logger.debug('Push Notification service enabled');
        } catch (error) {
            logger.error('Failed to initialize Push Notification service:', error);
        }
    }

    private checkExpo() {
        if (!this.expo) {
            throw new Error('Push Notification service not initialized');
        }

        return this.expo;
    }

    /**
     * Send push notifications to a batch of tokens
     */
    async sendPushNotifications(tokens: string[], title: string, body: string, data: any = {}) {
        const messages: ExpoPushMessage[] = [];

        const expo = this.checkExpo();

        for (const token of tokens) {
            if (!Expo.isExpoPushToken(token)) {
                logger.warn(`[Push] Invalid Expo push token: ${token}`);
                continue;
            }

            messages.push({
                to: token,
                sound: 'default',
                title,
                body,
                data,
            });
        }

        const chunks = expo.chunkPushNotifications(messages);
        const tickets: ExpoPushTicket[] = [];

        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                logger.error('[Push] Error sending push notifications chunk:', error);
            }
        }

        // Handle errors in tickets (e.g., DeviceNotRegistered)
        // In a real app, we should process these tickets to remove invalid tokens from DB
        this.processTickets(tickets);
    }

    private processTickets(tickets: ExpoPushTicket[]) {
        for (const ticket of tickets) {
            if (ticket.status === 'error') {
                logger.error(`[Push] Error sending notification: ${ticket.message}`);
                if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
                    // TODO: Remove the invalid token from the user's profile in DB
                    logger.warn('[Push] Device not registered. Token should be removed.');
                }
            }
        }
    }
}

export const pushNotificationService = new PushNotificationService();
