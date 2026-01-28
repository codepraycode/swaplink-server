import { eventBus, EventType } from '../event-bus';
import { NotificationType } from '../../../database';
import NotificationUtil from '../../services/notification/notification-utils';

export function setupTransactionListeners() {
    // Transaction Completed
    eventBus.subscribe(EventType.TRANSACTION_COMPLETED, async data => {
        const { userId, amount, type, counterpartyName } = data;

        const title = type === 'DEPOSIT' ? 'Credit Alert' : 'Debit Alert';
        const body =
            type === 'DEPOSIT'
                ? `You received ₦${amount} from ${counterpartyName}`
                : `You sent ₦${amount} to ${counterpartyName}`;

        await NotificationUtil.sendToUser(userId, title, body, data, NotificationType.TRANSACTION);
    });

    // Transaction Failed
    eventBus.subscribe(EventType.TRANSACTION_FAILED, async data => {
        const { userId, amount, reason } = data;

        await NotificationUtil.sendToUser(
            userId,
            'Transaction Failed',
            `Your transaction of ₦${amount} failed. Reason: ${reason}`,
            data,
            NotificationType.TRANSACTION
        );
    });
}
