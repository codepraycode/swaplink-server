import { eventBus, EventType } from '../event-bus';
import NotificationUtil from '../../services/notification/notification-utils';
import { NotificationType } from '../../../database';

export function setupAuthListeners() {
    // User Registered (Welcome)
    eventBus.subscribe(EventType.USER_REGISTERED, async data => {
        const { userId, name } = data;

        await NotificationUtil.sendToUser(
            userId,
            'Welcome to SwapLink!',
            `Hi ${name}, we are glad to have you on board.`,
            data,
            NotificationType.SYSTEM
        );
    });

    // Login on New Device (Security Alert)
    // TODO: Implement logic to detect new device
}
