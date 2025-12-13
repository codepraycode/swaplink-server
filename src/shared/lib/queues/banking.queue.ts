import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../../config/redis.config';
import { globusService } from '../integrations/banking/globus.service';
import { prisma } from '../../database';
import logger from '../utils/logger';
import { socketService } from '../services/socket.service';

// 1. Define Queue Name
export const BANKING_QUEUE_NAME = 'banking-queue';

// 2. Create Producer (Queue)
export const bankingQueue = new Queue(BANKING_QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000, // 5s, 10s, 20s...
        },
        removeOnComplete: true,
    },
});

// 3. Define Job Data Interface
export interface CreateAccountJob {
    userId: string;
    walletId: string;
}
