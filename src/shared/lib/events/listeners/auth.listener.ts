import { eventBus, EventType } from '../event-bus';
import NotificationUtil from '../../services/notification/notification-utils';
import { NotificationType } from '../../../database';
import { emailService } from '../../services/email-service/email.service';
import { smsService } from '../../services/sms-service/sms.service';
import logger from '../../utils/logger';

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
    eventBus.subscribe(EventType.LOGIN_DETECTED, async data => {
        const { userId, deviceId, ip, timestamp } = data;
        await NotificationUtil.sendToUser(
            userId,
            'New Login Detected',
            `A new login was detected on your account from device ${
                deviceId || 'Unknown'
            } at ${new Date(timestamp).toLocaleString()}.`,
            { ip, deviceId },
            NotificationType.SECURITY
        );
    });

    // OTP Requested
    eventBus.subscribe(EventType.OTP_REQUESTED, async data => {
        const { identifier, type, code, purpose } = data;

        logger.info(`[AuthListener] Processing OTP request for ${identifier} (${type})`);

        try {
            if (type === 'email') {
                await emailService.sendVerificationEmail(identifier, code);
            } else if (type === 'phone') {
                await smsService.sendOtp(identifier, code);
            }
        } catch (error) {
            logger.error(`[AuthListener] Failed to send OTP to ${identifier}`, error);
        }
    });
}
