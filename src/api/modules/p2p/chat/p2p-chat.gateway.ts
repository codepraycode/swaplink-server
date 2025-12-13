import { Server, Socket } from 'socket.io';
import { P2PChatService } from './p2p-chat.service';
import { redisConnection } from '../../../../shared/config/redis.config';
import { ChatType } from '../../../../shared/database/generated/prisma';
import logger from '../../../../shared/lib/utils/logger';

// This should be initialized in the main server setup
export class P2PChatGateway {
    private io: Server;

    constructor(io: Server) {
        this.io = io;
        this.initialize();
    }

    private initialize() {
        // Auth is handled by global SocketService middleware

        this.io.on('connection', socket => {
            const userId = (socket as any).data?.userId || (socket as any).user?.id;
            if (!userId) return; // Should not happen if auth middleware works

            logger.debug(`User connected to P2P Chat: ${userId}`);

            // Track Presence
            this.setUserOnline(userId, socket.id);

            socket.on('join_order', (orderId: string) => {
                socket.join(`order:${orderId}`);
                logger.debug(`User ${userId} joined order ${orderId}`);
            });

            socket.on(
                'send_message',
                async (data: {
                    orderId: string;
                    message: string;
                    type?: ChatType;
                    imageUrl?: string;
                }) => {
                    try {
                        const { orderId, message, type, imageUrl } = data;

                        // Save to DB
                        const chat = await P2PChatService.saveMessage(
                            userId,
                            orderId,
                            message,
                            type,
                            imageUrl
                        );

                        // Emit to Room
                        this.io.to(`order:${orderId}`).emit('new_message', chat);
                    } catch (error) {
                        logger.error('Send message error:', error);
                        socket.emit('error', { message: 'Failed to send message' });
                    }
                }
            );

            socket.on('typing', (data: { orderId: string }) => {
                socket.to(`order:${data.orderId}`).emit('user_typing', { userId });
            });

            socket.on('stop_typing', (data: { orderId: string }) => {
                socket.to(`order:${data.orderId}`).emit('user_stop_typing', { userId });
            });

            socket.on('disconnect', () => {
                this.setUserOffline(userId);
                logger.debug(`User disconnected: ${userId}`);
            });
        });
    }

    private async setUserOnline(userId: string, socketId: string) {
        await redisConnection.set(`user:online:${userId}`, socketId);
        // Optionally emit to friends or relevant users
    }

    private async setUserOffline(userId: string) {
        await redisConnection.del(`user:online:${userId}`);
    }
}
