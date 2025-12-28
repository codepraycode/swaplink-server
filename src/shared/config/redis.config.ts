import { envConfig } from './env.config';
import IORedis from 'ioredis';
import logger from '../lib/utils/logger';

// Parse REDIS_URL or construct connection options
const redisUrl = envConfig.REDIS_URL;

export const redisConnection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null, // Required by BullMQ
    retryStrategy: times => {
        const delay = Math.min(times * 50, 2000);
        if (times % 10 === 0) {
            logger.warn(`Redis connection failed. Retrying in ${delay}ms... (Attempt ${times})`);
        }
        return delay;
    },
    reconnectOnError: err => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
            // Only reconnect when the error starts with "READONLY"
            return true;
        }
        return false;
    },
});

redisConnection.on('connect', () => {
    logger.info('Redis connected successfully');
});

redisConnection.on('error', (err: any) => {
    // Suppress ECONNREFUSED logs to avoid spamming, only log periodically via retryStrategy
    if (err.code === 'ECONNREFUSED') {
        // We rely on retryStrategy to log warnings
        return;
    }
    logger.error('Redis connection error:', err);
});

redisConnection.on('ready', () => {
    logger.info('Redis client is ready');
});

export const redisConfig = {
    connection: redisConnection,
};
