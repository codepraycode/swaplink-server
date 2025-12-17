import { prisma, User } from '../../../shared/database/';
import bcrypt from 'bcryptjs';
import { BadRequestError, NotFoundError } from '../../../shared/lib/utils/api-error';

export class UserService {
    /**
     * Update the push token for a user.
     * @param userId The ID of the user.
     * @param token The Expo push token.
     */
    static async updatePushToken(userId: string, token: string): Promise<User> {
        return await prisma.user.update({
            where: { id: userId },
            data: { pushToken: token },
        });
    }

    static async changePassword(
        userId: string,
        data: { oldPassword: string; newPassword: string }
    ): Promise<User> {
        const { oldPassword, newPassword } = data;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            throw new NotFoundError('User not found');
        }

        const isValid = await bcrypt.compare(oldPassword, user.password);
        if (!isValid) {
            throw new BadRequestError('Invalid old password');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        return await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
    }

    static async updateProfile(
        userId: string,
        data: Partial<
            Omit<
                User,
                | 'id'
                | 'createdAt'
                | 'updatedAt'
                | 'pushToken'
                | 'password'
                | 'emailVerified'
                | 'phoneVerified'
                | 'kycVerified'
                | 'kycLevel'
                | 'kycDocument'
                | 'twoFactorEnabled'
                | 'lastLogin'
                | 'transactionPin'
                | 'pinAttempts'
                | 'pinLockedUntil'
                | 'role'
                | 'isActive'
            >
        >
    ): Promise<User> {
        return await prisma.user.update({
            where: { id: userId },
            data,
        });
    }
}
