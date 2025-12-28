import bcrypt from 'bcryptjs';
import { prisma, NotificationType, NotificationChannel } from '../../../shared/database';
import { redisConnection } from '../../../shared/config/redis.config';
import {
    BadRequestError,
    ForbiddenError,
    NotFoundError,
} from '../../../shared/lib/utils/api-error';
import { eventBus, EventType } from '../../../shared/lib/events/event-bus';
import NotificationUtil from '../../../shared/lib/services/notification/notification-utils';

export class PinService {
    private readonly MAX_ATTEMPTS = 3;
    private readonly LOCKOUT_DURATION_SEC = 60 * 15; // 15 Minutes

    /**
     * Set a new PIN for a user (only if not already set)
     */
    async setPin(userId: string, pin: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundError('User not found');
        if (user.transactionPin)
            throw new BadRequestError('PIN already set. Use updatePin instead.');

        await this.validatePinFormat(pin);

        const hashedPin = await bcrypt.hash(pin, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { transactionPin: hashedPin },
        });

        // Notify User
        await NotificationUtil.sendToUser(
            userId,
            'Transaction PIN Set',
            'Your transaction PIN has been set successfully. If this was not you, please contact support immediately.',
            {},
            NotificationType.SECURITY,
            NotificationChannel.EMAIL
        );

        return { message: 'Transaction PIN set successfully' };
    }

    /**
     * Verify PIN for a transaction with Redis Rate Limiting
     */
    async verifyPin(userId: string, pin: string): Promise<boolean> {
        const attemptKey = `pin_attempts:${userId}`;

        // 1. Check if Locked
        const attempts = await redisConnection.get(attemptKey);
        if (attempts && parseInt(attempts) >= this.MAX_ATTEMPTS) {
            const ttl = await redisConnection.ttl(attemptKey);
            throw new ForbiddenError(`PIN locked. Try again in ${Math.ceil(ttl / 60)} minutes.`);
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { transactionPin: true },
        });

        if (!user) throw new NotFoundError('User not found');
        if (!user.transactionPin) throw new BadRequestError('Transaction PIN not set');

        const isValid = await bcrypt.compare(pin, user.transactionPin);

        if (!isValid) {
            // Increment Failed Attempts
            const newCount = await redisConnection.incr(attemptKey);
            if (newCount === 1) {
                await redisConnection.expire(attemptKey, this.LOCKOUT_DURATION_SEC);
            }

            // Emit Security Event
            eventBus.publish(EventType.FAILED_PIN_ATTEMPTS, {
                userId,
                attempts: newCount,
                timestamp: new Date(),
            });

            const remaining = this.MAX_ATTEMPTS - newCount;
            if (remaining <= 0) {
                throw new ForbiddenError('PIN locked due to too many failed attempts.');
            }
            throw new BadRequestError(`Invalid PIN. ${remaining} attempts remaining.`);
        }

        // Success? Clear attempts
        await redisConnection.del(attemptKey);
        return true;
    }

    /**
     * Verify PIN for Transfer and Generate Idempotency Key
     * This is Step 1 of the transfer process
     */
    async verifyPinForTransfer(userId: string, pin: string) {
        // Verify the PIN using existing logic
        await this.verifyPin(userId, pin);

        // Generate a unique idempotency key
        const { randomUUID } = await import('crypto');
        const idempotencyKey = randomUUID();

        // Store the idempotency key in Redis with the userId
        // This allows us to validate that the key belongs to this user
        const idempotencyKeyRedis = `idempotency:${idempotencyKey}`;
        await redisConnection.setex(idempotencyKeyRedis, 300, userId); // 5 minutes expiry

        return {
            message: 'PIN verified successfully',
            idempotencyKey,
            expiresIn: 300, // seconds
        };
    }

    /**
     * Update existing PIN
     */
    async updatePin(userId: string, oldPin: string, newPin: string) {
        await this.verifyPin(userId, oldPin); // Validates old PIN and checks lockout
        await this.validatePinFormat(newPin);

        const hashedPin = await bcrypt.hash(newPin, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { transactionPin: hashedPin },
        });

        // Notify User
        await NotificationUtil.sendToUser(
            userId,
            'Transaction PIN Changed',
            'Your transaction PIN has been changed successfully. If this was not you, please contact support immediately.',
            {},
            NotificationType.SECURITY,
            NotificationChannel.EMAIL
        );

        return { message: 'Transaction PIN updated successfully' };
    }

    /**
     * Validate PIN format (4 digits)
     */
    private async validatePinFormat(pin: string) {
        if (!/^\d{4}$/.test(pin)) {
            throw new BadRequestError('PIN must be exactly 4 digits');
        }
    }
}

export const pinService = new PinService();
