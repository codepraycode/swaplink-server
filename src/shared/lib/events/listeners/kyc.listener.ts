import { eventBus, EventType } from '../event-bus';
import NotificationUtil from '../../services/notification/notification-utils';
import { NotificationType, NotificationChannel, prisma } from '../../../database';
import logger from '../../utils/logger';
import { emailService } from '../../services/email-service/email.service';
import { envConfig } from '../../../config/env.config';

export function setupKycListeners() {
    // KYC Submitted
    eventBus.subscribe(EventType.KYC_SUBMITTED, async data => {
        const { userId } = data;

        await NotificationUtil.sendToUser(
            userId,
            'KYC Submitted',
            'Your documents have been received and are under review.',
            data,
            NotificationType.KYC,
            NotificationChannel.INAPP
        );

        // Send Email
        try {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user && user.email) {
                await emailService.sendKycStatusEmail(user.email, user.firstName, {
                    isSubmitted: true,
                    dashboard_url: `${envConfig.FRONTEND_URL}/dashboard`,
                });
            }
        } catch (error) {
            logger.error(`[KYC Listener] Failed to send email for user ${userId}`, error);
        }

        // TODO: Notify Admin (e.g., via Slack or Admin Dashboard Notification)
        logger.info(`[KYC Listener] Admin Alert: User ${userId} submitted KYC.`);
    });

    // KYC Approved
    eventBus.subscribe(EventType.KYC_APPROVED, async data => {
        const { userId, level } = data;

        await NotificationUtil.sendToUser(
            userId,
            'KYC Approved',
            `Congratulations! Your account has been upgraded to ${level} level.`,
            data,
            NotificationType.KYC,
            NotificationChannel.PUSH
        );

        // Send Email
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { wallet: { include: { virtualAccount: true } } },
            });
            if (user && user.email) {
                const virtualAccount = user.wallet?.virtualAccount;
                await emailService.sendKycStatusEmail(user.email, user.firstName, {
                    isSuccess: true,
                    dashboard_url: `${envConfig.FRONTEND_URL}/dashboard`,
                    account_number: virtualAccount?.accountNumber,
                    account_name: virtualAccount?.accountName,
                    bank_name: virtualAccount?.bankName,
                });
            }
        } catch (error) {
            logger.error(`[KYC Listener] Failed to send email for user ${userId}`, error);
        }
    });

    // KYC Rejected
    eventBus.subscribe(EventType.KYC_REJECTED, async data => {
        const { userId, reason } = data;

        await NotificationUtil.sendToUser(
            userId,
            'KYC Rejected',
            `Your KYC application was rejected. Reason: ${reason}`,
            data,
            NotificationType.KYC,
            NotificationChannel.PUSH
        );

        // Send Email
        try {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user && user.email) {
                await emailService.sendKycStatusEmail(user.email, user.firstName, {
                    isFailed: true,
                    reason,
                    dashboard_url: `${envConfig.FRONTEND_URL}/dashboard`,
                });
            }
        } catch (error) {
            logger.error(`[KYC Listener] Failed to send email for user ${userId}`, error);
        }
    });
}
