import { prisma, UserRole, OrderStatus, AdminLog, P2POrder, User } from '../../../shared/database';
import { BadRequestError, NotFoundError } from '../../../shared/lib/utils/api-error';
import { socketService } from '../../../shared/lib/services/socket.service';
import bcrypt from 'bcryptjs';

export class AdminService {
    /**
     * Get all disputed orders with pagination and filters
     */
    async getDisputes(
        page: number = 1,
        limit: number = 20
    ): Promise<{ data: Partial<P2POrder>[]; meta: any }> {
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            prisma.p2POrder.findMany({
                where: { status: OrderStatus.DISPUTE },
                include: {
                    maker: { select: { id: true, firstName: true, lastName: true, email: true } },
                    taker: { select: { id: true, firstName: true, lastName: true, email: true } },
                    ad: { select: { type: true, currency: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.p2POrder.count({ where: { status: OrderStatus.DISPUTE } }),
        ]);

        return {
            data: orders,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get full details of a disputed order including chat history
     */
    async getOrderDetails(orderId: string): Promise<P2POrder> {
        const order = await prisma.p2POrder.findUnique({
            where: { id: orderId },
            include: {
                maker: {
                    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
                },
                taker: {
                    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
                },
                ad: true,
                messages: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!order) throw new NotFoundError('Order not found');
        return order;
    }

    /**
     * Resolve a dispute by forcing completion or cancellation
     */
    async resolveDispute(
        adminId: string,
        orderId: string,
        decision: 'RELEASE' | 'REFUND',
        notes: string,
        ipAddress: string
    ): Promise<{ success: boolean; decision: string; orderId: string }> {
        const result = await prisma.$transaction(async tx => {
            const order = await tx.p2POrder.findUnique({
                where: { id: orderId },
                include: { ad: true },
            });

            if (!order) throw new NotFoundError('Order not found');
            if (order.status !== OrderStatus.DISPUTE)
                throw new BadRequestError('Order is not in dispute');

            // Determine Payer and Receiver
            const isBuyAd = order.ad.type === 'BUY_FX';
            // If BUY_FX: Maker (Buyer) gives NGN (Payer), Taker (Seller) gives FX (Receiver) -> WAIT.
            // Let's re-verify logic.
            // BUY_FX Ad: Maker wants to BUY FX. Maker pays NGN. Taker gives FX.
            // So Maker = NGN Payer. Taker = FX Receiver.

            // SELL_FX Ad: Maker wants to SELL FX. Maker gives FX. Taker pays NGN.
            // So Maker = FX Receiver. Taker = NGN Payer.

            const ngnPayerId = isBuyAd ? order.makerId : order.takerId;
            const fxReceiverId = isBuyAd ? order.takerId : order.makerId; // The one who gets NGN if completed

            if (decision === 'RELEASE') {
                // VERDICT: Buyer Wins (Funds Released to Seller/Receiver of NGN)
                // Wait, "Release Funds" usually means releasing the crypto/FX to the buyer?
                // OR releasing the NGN to the seller?
                // In P2P, "Release" usually means the Seller releases the crypto to the Buyer.
                // BUT here we are holding NGN in Escrow (Locked Balance).
                // So "Release" means moving NGN from Escrow to the Seller (FX Receiver).

                // Logic:
                // 1. Deduct Locked from Payer
                // 2. Credit Available to Receiver (Minus Fee)

                await tx.wallet.update({
                    where: { userId: ngnPayerId },
                    data: { lockedBalance: { decrement: order.totalNgn } },
                });

                const fee = order.fee;
                const finalAmount = order.totalNgn - fee;

                await tx.wallet.update({
                    where: { userId: fxReceiverId },
                    data: { balance: { increment: finalAmount } },
                });

                // Update Order
                await tx.p2POrder.update({
                    where: { id: orderId },
                    data: {
                        status: OrderStatus.COMPLETED,
                        resolvedBy: adminId,
                        resolvedAt: new Date(),
                        resolutionNotes: notes,
                    },
                });
            } else {
                // VERDICT: Seller Wins (Refund NGN to Payer)
                // "Refund Payer"

                // Logic:
                // 1. Deduct Locked from Payer
                // 2. Credit Available to Payer (Full Refund)

                await tx.wallet.update({
                    where: { userId: ngnPayerId },
                    data: { lockedBalance: { decrement: order.totalNgn } },
                });

                await tx.wallet.update({
                    where: { userId: ngnPayerId },
                    data: { balance: { increment: order.totalNgn } },
                });

                // Update Order
                await tx.p2POrder.update({
                    where: { id: orderId },
                    data: {
                        status: OrderStatus.CANCELLED,
                        resolvedBy: adminId,
                        resolvedAt: new Date(),
                        resolutionNotes: notes,
                    },
                });
            }

            // Log Action
            await tx.adminLog.create({
                data: {
                    adminId,
                    action: decision === 'RELEASE' ? 'RESOLVE_RELEASE' : 'RESOLVE_REFUND',
                    targetId: orderId,
                    metadata: { notes, decision },
                    ipAddress,
                },
            });

            return { success: true, decision, orderId };
        });

        // Post-Transaction: Emit Sockets
        const updatedOrder = await prisma.p2POrder.findUnique({ where: { id: orderId } });
        if (updatedOrder) {
            socketService.emitToUser(updatedOrder.makerId, 'ORDER_RESOLVED', updatedOrder);
            socketService.emitToUser(updatedOrder.takerId, 'ORDER_RESOLVED', updatedOrder);
        }

        return result;
    }

    /**
     * Create a new Admin (Super Admin Only)
     */
    async createAdmin(data: any, creatorId: string, ipAddress: string): Promise<User> {
        const { email, password, firstName, lastName, role } = data;

        // Validate Role
        if (![UserRole.ADMIN, UserRole.SUPPORT].includes(role)) {
            throw new BadRequestError('Invalid role. Can only create ADMIN or SUPPORT.');
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) throw new BadRequestError('User already exists');

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                phone: `+000${Date.now()}`, // Placeholder phone
                role,
                isVerified: true,
                isActive: true,
                kycLevel: 'FULL',
                kycStatus: 'APPROVED',
                wallet: { create: { balance: 0, lockedBalance: 0 } },
            },
        });

        // Log Action
        await prisma.adminLog.create({
            data: {
                adminId: creatorId,
                action: 'CREATE_ADMIN',
                targetId: newAdmin.id,
                metadata: { role, email },
                ipAddress,
            },
        });

        return newAdmin;
    }

    /**
     * List all admins
     */
    async getAdmins(): Promise<Partial<User>[]> {
        return await prisma.user.findMany({
            where: {
                role: { in: [UserRole.ADMIN, UserRole.SUPPORT, UserRole.SUPER_ADMIN] },
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                createdAt: true,
                isActive: true,
            },
        });
    }
}

export const adminService = new AdminService();
