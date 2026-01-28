import { eventBus, EventType } from '../event-bus';
import { setupTransactionListeners } from '../listeners/transaction.listener';
import { NotificationType } from '../../../database';
import NotificationUtil from '../../services/notification/notification-utils';

// Mock NotificationUtil
jest.mock('../../services/notification/notification-utils', () => {
    return {
        __esModule: true,
        default: {
            sendToUser: jest.fn(),
        },
    };
});

// Mock Database Connection check in setup.ts
jest.mock('../../../database', () => ({
    checkDatabaseConnection: jest.fn().mockResolvedValue(true),
    prisma: {
        notification: {
            create: jest.fn(),
        },
    },
    NotificationType: {
        TRANSACTION: 'TRANSACTION',
        SYSTEM: 'SYSTEM',
    },
}));

describe('Event Bus & Listeners', () => {
    beforeAll(() => {
        setupTransactionListeners();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should handle TRANSACTION_COMPLETED event', async () => {
        const payload = {
            userId: 'user-123',
            amount: 5000,
            type: 'DEPOSIT',
            counterpartyName: 'John Doe',
        };

        eventBus.publish(EventType.TRANSACTION_COMPLETED, payload);

        // Wait for async event processing
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(NotificationUtil.sendToUser).toHaveBeenCalledWith(
            payload.userId,
            'Credit Alert',
            `You received ₦${payload.amount} from ${payload.counterpartyName}`,
            payload,
            NotificationType.TRANSACTION
        );
    });

    it('should handle TRANSACTION_FAILED event', async () => {
        const payload = {
            userId: 'user-123',
            amount: 2000,
            reason: 'Insufficient funds',
        };

        eventBus.publish(EventType.TRANSACTION_FAILED, payload);

        // Wait for async event processing
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(NotificationUtil.sendToUser).toHaveBeenCalledWith(
            payload.userId,
            'Transaction Failed',
            `Your transaction of ₦${payload.amount} failed. Reason: ${payload.reason}`,
            payload,
            NotificationType.TRANSACTION
        );
    });
});
