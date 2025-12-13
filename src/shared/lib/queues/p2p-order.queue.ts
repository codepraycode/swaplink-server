import { Queue } from 'bullmq';
import { redisConnection } from '../../config/redis.config';

export const p2pOrderQueue = new Queue('p2p-order-queue', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});
