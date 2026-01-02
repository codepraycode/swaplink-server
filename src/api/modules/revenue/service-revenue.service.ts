import { prisma, Wallet } from '../../../shared/database';
import { InternalError } from '../../../shared/lib/utils/api-error';

export class ServiceRevenueService {
    private readonly SYSTEM_REVENUE_EMAIL = 'revenue@bcdees.com';

    /**
     * Get the System Revenue Wallet for crediting fees.
     */
    async getRevenueWallet(): Promise<Wallet> {
        const user = await prisma.user.findUnique({
            where: { email: this.SYSTEM_REVENUE_EMAIL },
            include: { wallet: true },
        });

        if (!user || !user.wallet) {
            throw new InternalError('System Revenue Wallet not configured');
        }

        return user.wallet;
    }
}

export const serviceRevenueService = new ServiceRevenueService();
