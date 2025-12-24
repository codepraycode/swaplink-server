import EventEmitter from 'events';
import logger from '../utils/logger';

export enum EventType {
    // Auth Events
    USER_REGISTERED = 'USER_REGISTERED',
    USER_LOGGED_IN = 'USER_LOGGED_IN',
    PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',

    // Transaction Events
    TRANSACTION_COMPLETED = 'TRANSACTION_COMPLETED',
    TRANSACTION_FAILED = 'TRANSACTION_FAILED',

    // P2P Events
    P2P_ORDER_CREATED = 'P2P_ORDER_CREATED',
    P2P_ORDER_MATCHED = 'P2P_ORDER_MATCHED',
    P2P_ORDER_COMPLETED = 'P2P_ORDER_COMPLETED',
    P2P_DISPUTE_OPENED = 'P2P_DISPUTE_OPENED',

    // KYC Events
    KYC_SUBMITTED = 'KYC_SUBMITTED',
    KYC_APPROVED = 'KYC_APPROVED',
    KYC_REJECTED = 'KYC_REJECTED',

    // Audit Events
    AUDIT_LOG = 'AUDIT_LOG',
}

class EventBus extends EventEmitter {
    constructor() {
        super();
        this.on('error', error => {
            logger.error('EventBus Error:', error);
        });
    }

    publish(event: EventType, data: any) {
        logger.info(`[EventBus] Publishing event: ${event}`);
        this.emit(event, data);
    }

    subscribe(event: EventType, callback: (data: any) => void) {
        this.on(event, async data => {
            try {
                logger.info(`[EventBus] Processing event: ${event}`);
                await callback(data);
            } catch (error) {
                logger.error(`[EventBus] Error processing event ${event}:`, error);
            }
        });
    }
}

export const eventBus = new EventBus();
