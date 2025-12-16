import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { JwtUtils } from '../utils/jwt-utils';
import logger from '../utils/logger';
import { UnauthorizedError } from '../utils/api-error';

class SocketService {
    private io: Server | null = null;
    private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]

    initialize(httpServer: HttpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: '*', // Allow all origins as requested
                methods: ['GET', 'POST'],
                credentials: true,
            },
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

    emitToUser(userId: string, event: string, data: any) {
        if (!this.io) {
            logger.error('Socket.io not initialized');
            return;
        }

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
