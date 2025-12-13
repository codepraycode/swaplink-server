import { envConfig } from './env.config';
import IORedis from 'ioredis';

// Parse REDIS_URL or construct connection options
const redisUrl = envConfig.REDIS_URL;

export const redisConnection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null, // Required by BullMQ
});

export const redisConfig = {
    connection: redisConnection,
};
