import { prisma, User } from '../../../../shared/database/';
import bcrypt from 'bcryptjs';
import { BadRequestError, NotFoundError } from '../../../../shared/lib/utils/api-error';
import { AuditService } from '../../../../shared/lib/services/audit.service';

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

    static async updateAvatar(userId: string, avatarUrl: string) {
        return await prisma.user.update({
            where: { id: userId },
            data: { avatarUrl },
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
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

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        AuditService.log({
            userId: userId,
            action: 'PASSWORD_CHANGED',
            resource: 'User',
            resourceId: userId,
            status: 'SUCCESS',
        });

        return updatedUser;
    }

    /**
     * Update user address with proof of address document
     * @param userId User ID
     * @param addressData Address information
     * @param proofOfAddressUrl URL of uploaded proof of address document
     */
    static async updateAddress(
        userId: string,
        addressData: {
            address?: string;
            city?: string;
            state?: string;
            country?: string;
            postalCode?: string;
        },
        proofOfAddressUrl: string
    ): Promise<{
        user: User;
        kycInfo: {
            id: string;
            userId: string;
            address?: string | null;
            city?: string | null;
            state?: string | null;
            country?: string | null;
            postalCode?: string | null;
        };
    }> {
        // Validate that at least one address field is being updated
        const hasAddressUpdate = Object.values(addressData).some(value => value !== undefined);
        if (!hasAddressUpdate) {
            throw new BadRequestError('At least one address field must be provided');
        }

        // Validate proof of address is provided
        if (!proofOfAddressUrl) {
            throw new BadRequestError(
                'Proof of address document (utility bill or bank statement) is required when updating address'
            );
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { kycInfo: true },
        });

        if (!user) {
            throw new NotFoundError('User not found');
        }

        // Update or create KYC info with new address and proof
        const kycInfo = await prisma.kycInfo.upsert({
            where: { userId },
            create: {
                userId,
                ...addressData,
            },
            update: {
                ...addressData,
            },
        });

        // Create a KYC document record for the proof of address
        await prisma.kycDocument.create({
            data: {
                kycInfoId: kycInfo.id,
                documentType: 'PROOF_OF_ADDRESS',
                documentUrl: proofOfAddressUrl,
                status: 'PENDING', // Will need admin review
            },
        });

        // Get updated user with KYC info
        const updatedUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { kycInfo: true },
        });

        AuditService.log({
            userId: userId,
            action: 'ADDRESS_UPDATED',
            resource: 'User',
            resourceId: userId,
            details: {
                addressData,
                proofOfAddressUrl,
            },
            status: 'SUCCESS',
        });

        return {
            user: updatedUser!,
            kycInfo,
        };
    }

    /**
     * @deprecated Use updateAddress instead. Name changes are no longer allowed.
     * This method is kept for backward compatibility but will throw an error.
     */
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
        // Block name changes
        if (data.firstName || data.lastName) {
            throw new BadRequestError(
                'Name changes are not allowed. Please contact support if you need to update your name.'
            );
        }

        // Only allow non-sensitive field updates (avatarUrl, etc.)
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data,
        });

        AuditService.log({
            userId: userId,
            action: 'PROFILE_UPDATED',
            resource: 'User',
            resourceId: userId,
            details: data,
            status: 'SUCCESS',
        });

        return updatedUser;
    }
}
