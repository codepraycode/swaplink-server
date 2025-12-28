import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma, KycLevel, KycStatus } from '../../database';
import logger from '../utils/logger';

/**
 * Initialize System Resources
 *
 * Ensures that critical system accounts and configurations exist on startup.
 */
export async function initializeSystemResources(): Promise<void> {
    logger.info('🔄 Initializing system resources...');

    try {
        await initializeSystemUser();
        logger.info('✅ System resources initialized successfully');
    } catch (error) {
        logger.error('❌ Failed to initialize system resources:', error);
        // We don't exit here, as the server might still be usable, but it's critical to log.
        // Depending on requirements, we might want to throw to stop startup.
        throw error;
    }
}

async function initializeSystemUser() {
    const systemEmail = 'revenue@swaplink.com';
    const systemPhone = '+2340000000000';

    // 1. Check if System User exists
    let systemUser = await prisma.user.findUnique({
        where: { email: systemEmail },
    });

    if (!systemUser) {
        logger.info('  → Creating System Revenue User...');
        const hashedPassword = await bcrypt.hash('SystemRevenue@123', 10);

        systemUser = await prisma.user.create({
            data: {
                email: systemEmail,
                phone: systemPhone,
                password: hashedPassword,
                firstName: 'System',
                lastName: 'Revenue',
                role: UserRole.SUPER_ADMIN,
                isVerified: true,
                emailVerified: true,
                phoneVerified: true,
                kycLevel: KycLevel.FULL,
                kycStatus: KycStatus.APPROVED,
                isActive: true,
            },
        });
        logger.info(`  ✅ System User created: ${systemUser.id}`);
    } else {
        logger.debug(`  ℹ️ System User already exists: ${systemUser.id}`);
    }

    // 2. Check if Wallet exists
    const wallet = await prisma.wallet.findUnique({
        where: { userId: systemUser.id },
    });

    if (!wallet) {
        logger.info('  → Creating System Revenue Wallet...');
        await prisma.wallet.create({
            data: {
                userId: systemUser.id,
                balance: 0,
                lockedBalance: 0,
            },
        });
        logger.info('  ✅ System Wallet created.');
    } else {
        logger.debug('  ℹ️ System Wallet already exists.');
    }
}
