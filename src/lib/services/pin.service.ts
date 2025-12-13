import bcrypt from 'bcrypt';
import { prisma } from '../../database';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/api-error';

export class PinService {
    private readonly MAX_ATTEMPTS = 3;
    private readonly LOCKOUT_DURATION_MS = 60 * 60 * 1000; // 1 hour

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

        return { message: 'Transaction PIN set successfully' };
    }

    /**
     * Verify PIN for a transaction
     */
    async verifyPin(userId: string, pin: string): Promise<boolean> {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundError('User not found');
        if (!user.transactionPin) throw new BadRequestError('Transaction PIN not set');

        // Check Lockout
        if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
            throw new ForbiddenError(
                `PIN is locked. Try again after ${user.pinLockedUntil.toISOString()}`
            );
        }

        const isValid = await bcrypt.compare(pin, user.transactionPin);

        if (!isValid) {
            await this.handleFailedAttempt(userId, user.pinAttempts);
            throw new ForbiddenError('Invalid Transaction PIN');
        }

        // Reset attempts on success
        if (user.pinAttempts > 0 || user.pinLockedUntil) {
            await prisma.user.update({
                where: { id: userId },
                data: { pinAttempts: 0, pinLockedUntil: null },
            });
        }

        return true;
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
            data: { transactionPin: hashedPin, pinAttempts: 0, pinLockedUntil: null },
        });

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

    /**
     * Handle failed PIN attempt
     */
    private async handleFailedAttempt(userId: string, currentAttempts: number) {
        const newAttempts = currentAttempts + 1;
        let lockUntil: Date | null = null;

        if (newAttempts >= this.MAX_ATTEMPTS) {
            lockUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MS);
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                pinAttempts: newAttempts,
                pinLockedUntil: lockUntil,
            },
        });

        if (lockUntil) {
            throw new ForbiddenError('Too many failed attempts. PIN locked for 1 hour.');
        }
    }
}

export const pinService = new PinService();
