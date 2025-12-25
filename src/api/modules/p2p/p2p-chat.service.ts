import { prisma, P2PChat } from '../../../shared/database';
import { BadRequestError, NotFoundError } from '../../../shared/lib/utils/api-error';
import { socketService } from '../../../shared/lib/services/socket.service';

export class P2PChatService {
    /**
     * Send a message in a P2P Order Chat.
     * - Persists to DB.
     * - Emits 'p2p:new-message' event to the other party.
     */
    async sendMessage(
        userId: string,
        data: {
            orderId: string;
            message?: string;
            imageUrl?: string;
            system?: boolean;
        }
    ): Promise<P2PChat> {
        const { orderId, message, imageUrl, system } = data;

        if (!message && !imageUrl) {
            throw new BadRequestError('Message or Image is required');
        }

        // 1. Validate Order & Membership
        const order = await prisma.p2POrder.findUnique({
            where: { id: orderId },
        });

        if (!order) throw new NotFoundError('Order not found');

        // Allow system messages to bypass user check (senderId might be system user or admin)
        // But for normal chat, check userId
        if (!system) {
            if (order.makerId !== userId && order.takerId !== userId) {
                throw new BadRequestError('Not authorized to chat in this order');
            }
        }

        // 2. Persist Message
        const chat = await prisma.p2PChat.create({
            data: {
                orderId,
                senderId: userId,
                message,
                imageUrl,
                system: system || false,
            },
        });

        // 3. Emit Socket Event
        // Determine recipient
        const recipientId = userId === order.makerId ? order.takerId : order.makerId;

        // Emit to Recipient
        socketService.emitToUser(recipientId, 'p2p:new-message', chat);

        // Emit to Sender (for confirmation/multi-device sync)
        socketService.emitToUser(userId, 'p2p:new-message', chat);

        return chat;
    }

    /**
     * Get Chat History for an Order.
     */
    async getMessages(userId: string, orderId: string): Promise<P2PChat[]> {
        const order = await prisma.p2POrder.findUnique({
            where: { id: orderId },
        });

        if (!order) throw new NotFoundError('Order not found');
        if (order.makerId !== userId && order.takerId !== userId) {
            throw new BadRequestError('Not authorized');
        }

        return prisma.p2PChat.findMany({
            where: { orderId },
            orderBy: { createdAt: 'asc' },
        });
    }
}

export const p2pChatService = new P2PChatService();
