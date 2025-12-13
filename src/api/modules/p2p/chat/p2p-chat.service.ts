import { prisma } from '../../../../shared/database';
import { ChatType } from '../../../../shared/database';

export class P2PChatService {
    static async saveMessage(
        userId: string,
        orderId: string,
        message: string,
        type: ChatType = ChatType.TEXT,
        imageUrl?: string
    ) {
        return await prisma.p2PChat.create({
            data: {
                orderId,
                senderId: userId,
                message,
                imageUrl,
                type,
            },
            include: { sender: { select: { id: true, firstName: true, lastName: true } } },
        });
    }

    static async getMessages(orderId: string) {
        return await prisma.p2PChat.findMany({
            where: { orderId },
            orderBy: { createdAt: 'asc' },
            include: { sender: { select: { id: true, firstName: true, lastName: true } } },
        });
    }

    static async createSystemMessage(orderId: string, message: string) {
        // System messages might not have a senderId, or use a system bot ID.
        // Schema requires senderId.
        // We can use the order Maker or Taker as "sender" but type=SYSTEM?
        // Or we need a dedicated System User ID.
        // For now, let's pick the Maker as sender but mark as SYSTEM type.
        // Or better, make senderId optional in schema? Too late for schema change without migration.
        // Let's use the Order's Maker ID for now, or find a better way.
        // Actually, usually system messages are just informational.
        // Let's fetch the order to get a valid user ID.

        const order = await prisma.p2POrder.findUnique({ where: { id: orderId } });
        if (!order) return;

        return await prisma.p2PChat.create({
            data: {
                orderId,
                senderId: order.makerId, // Attribute to Maker for now
                message,
                type: ChatType.SYSTEM,
            },
        });
    }
}
