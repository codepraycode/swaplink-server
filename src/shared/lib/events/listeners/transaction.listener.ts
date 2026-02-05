import { eventBus, EventType } from '../event-bus';
import { NotificationType, prisma } from '../../../database';
import NotificationUtil from '../../services/notification/notification-utils';
import { emailService } from '../../services/email-service/email.service';
import logger from '../../utils/logger';
import { scrambleAccountNumber, formatTransactionReference } from '../../utils/email-formatter';

export function setupTransactionListeners() {
    // Transaction Completed
    eventBus.subscribe(EventType.TRANSACTION_COMPLETED, async data => {
        const {
            userId,
            amount,
            type,
            counterpartyName,
            reference,
            description,
            status,
            date,
            accountNumber,
            counterpartyAccount,
            transactionId,
        } = data;

        const title = type === 'DEPOSIT' ? 'Credit Alert' : 'Debit Alert';
        const body =
            type === 'DEPOSIT'
                ? `You received ₦${amount} from ${counterpartyName}`
                : `You sent ₦${amount} to ${counterpartyName}`;

        await NotificationUtil.sendToUser(userId, title, body, data, NotificationType.TRANSACTION);

        // Send Email
        try {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user && user.email) {
                // Scramble account numbers for security
                const scrambledUserAccount = accountNumber
                    ? scrambleAccountNumber(accountNumber)
                    : undefined;
                const scrambledCounterpartyAccount = counterpartyAccount
                    ? scrambleAccountNumber(counterpartyAccount)
                    : undefined;

                // Format transaction reference
                const formattedReference = formatTransactionReference(reference || transactionId);

                await emailService.sendTransactionEmail(user.email, user.firstName, {
                    isTransaction: true,
                    type: type === 'DEPOSIT' ? 'CREDIT' : 'DEBIT',
                    amount: amount.toString(),
                    currency: '₦',
                    reference: formattedReference,
                    transactionId: transactionId || reference,
                    date: date ? new Date(date).toLocaleString() : new Date().toLocaleString(),
                    status: status || 'SUCCESS',
                    description: description || body,
                    color: type === 'DEPOSIT' ? '#28a745' : '#dc3545',
                    // Include scrambled account information
                    accountNumber: scrambledUserAccount,
                    ...(type === 'DEPOSIT'
                        ? {
                              senderAccount: scrambledCounterpartyAccount,
                              senderName: counterpartyName,
                          }
                        : {
                              recipientAccount: scrambledCounterpartyAccount,
                              recipientName: counterpartyName,
                          }),
                });
            }
        } catch (error) {
            logger.error(`[Transaction Listener] Failed to send email for user ${userId}`, error);
        }
    });

    // Transaction Failed
    eventBus.subscribe(EventType.TRANSACTION_FAILED, async data => {
        const {
            userId,
            amount,
            reason,
            reference,
            description,
            date,
            accountNumber,
            transactionId,
        } = data;

        await NotificationUtil.sendToUser(
            userId,
            'Transaction Failed',
            `Your transaction of ₦${amount} failed. Reason: ${reason}`,
            data,
            NotificationType.TRANSACTION
        );

        // Send Email
        try {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user && user.email) {
                // Scramble account number for security
                const scrambledUserAccount = accountNumber
                    ? scrambleAccountNumber(accountNumber)
                    : undefined;

                // Format transaction reference
                const formattedReference = formatTransactionReference(reference || transactionId);

                await emailService.sendTransactionEmail(user.email, user.firstName, {
                    isTransaction: true,
                    type: 'DEBIT', // Usually failed transactions are debits that failed
                    amount: amount.toString(),
                    currency: '₦',
                    reference: formattedReference,
                    transactionId: transactionId || reference,
                    date: date ? new Date(date).toLocaleString() : new Date().toLocaleString(),
                    status: 'FAILED',
                    description: description || `Transaction Failed: ${reason}`,
                    color: '#dc3545',
                    accountNumber: scrambledUserAccount,
                });
            }
        } catch (error) {
            logger.error(`[Transaction Listener] Failed to send email for user ${userId}`, error);
        }
    });
}
