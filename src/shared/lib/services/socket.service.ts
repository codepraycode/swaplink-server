import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { JwtUtils } from '../utils/jwt-utils';
import logger from '../utils/logger';
import { UnauthorizedError } from '../utils/api-error';
import { redisConnection } from '../../config/redis.config';
import Redis from 'ioredis';

class SocketService {
    private io: Server | null = null;
    private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]
    private subscriber: Redis | null = null;
    private readonly CHANNEL_NAME = 'socket-events';

    initialize(httpServer: HttpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: '*', // Allow all origins as requested
                methods: ['GET', 'POST'],
                credentials: true,
            },
        });

        // Initialize Redis Subscriber
        this.subscriber = redisConnection.duplicate();
        this.subscriber.subscribe(this.CHANNEL_NAME, err => {
            if (err) {
                logger.error('Failed to subscribe to socket-events channel', err);
            } else {
                logger.info('✅ Subscribed to socket-events Redis channel');
            }
        });

        this.subscriber.on('message', (channel, message) => {
            if (channel === this.CHANNEL_NAME) {
                try {
                    const { userId, event, data } = JSON.parse(message);
                    this.emitLocal(userId, event, data);
                } catch (error) {
                    logger.error('Failed to parse socket event from Redis', error);
                }
            }
        });

        this.io.use(async (socket, next) => {
            try {
                const token =
                    socket.handshake.auth.token ||
                    socket.handshake.query.token || // Also check query params
                    socket.handshake.headers.authorization?.split(' ')[1];

                if (!token) {
                    return next(new Error('Authentication error: Token missing'));
                }

                const decoded = JwtUtils.verifyAccessToken(token);
                if (!decoded) {
                    return next(new Error('Authentication error: Invalid token'));
                }

                socket.data.userId = decoded.userId;
                next();
            } catch (error) {
                // Graceful error for client
                const err = new UnauthorizedError('Authentication error: Session invalid', {
                    code: 'INVALID_TOKEN',
                    message: 'Please log in again',
                });
                next(err);
            }
        });

        this.io.on('connection', (socket: Socket) => {
            const userId = socket.data.userId;
            logger.info(`🔌 User connected: ${userId} (${socket.id})`);

            this.addUserSocket(userId, socket.id);

            socket.on('disconnect', () => {
                this.removeUserSocket(userId, socket.id);
                logger.info(`🔌 User disconnected: ${userId}`);
            });
        });

        logger.info('✅ Socket.io initialized');
    }

    private addUserSocket(userId: string, socketId: string) {
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, []);
        }
        this.userSockets.get(userId)?.push(socketId);
    }

    private removeUserSocket(userId: string, socketId: string) {
        const sockets = this.userSockets.get(userId);
        if (sockets) {
            const updatedSockets = sockets.filter(id => id !== socketId);
            if (updatedSockets.length === 0) {
                this.userSockets.delete(userId);
            } else {
                this.userSockets.set(userId, updatedSockets);
            }
        }
    }

    /**
     * Emit event to a specific user.
     * If running in the API server (io initialized), emits locally.
     * If running in a worker (io null), publishes to Redis.
     */
    emitToUser(userId: string, event: string, data: any) {
        if (this.io) {
            this.emitLocal(userId, event, data);
        } else {
            // We are likely in a worker process, publish to Redis
            redisConnection
                .publish(this.CHANNEL_NAME, JSON.stringify({ userId, event, data }))
                .catch(err => logger.error('Failed to publish socket event to Redis', err));
        }
    }

    private emitLocal(userId: string, event: string, data: any) {
        if (!this.io) return;

        const sockets = this.userSockets.get(userId);
        if (sockets && sockets.length > 0) {
            sockets.forEach(socketId => {
                this.io?.to(socketId).emit(event, data);
            });
            logger.debug(`📡 Emitted '${event}' to User ${userId}`);
        }
    }

    getIO(): Server | null {
        return this.io;
    }
}

export const socketService = new SocketService();
