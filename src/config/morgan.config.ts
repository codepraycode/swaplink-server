import morgan, { StreamOptions } from 'morgan';
import { Request, Response } from 'express';
import logger from '../lib/utils/logger'; // Your Winston logger
import { envConfig } from './env.config';

const isDevelopment = envConfig.NODE_ENV === 'development';
// 1. Define a stream to pipe morgan logs to Winston
const stream: StreamOptions = {
    write: message => logger.http(message.trim()),
};

// 2. Skip logging in test environment
const skip = () => envConfig.NODE_ENV === 'test';

// 3. Register Custom Token: Log User ID if authenticated
morgan.token('user-id', (req: Request) => {
    // Adjust based on where you store user info (req.session.user or req.user)
    return (req as any).session?.user?.id || (req as any).user?.id || 'guest';
});

// 4. Define Format
// Dev: Concise colorized output
// Prod: Detailed JSON-like string for parsing
const format = isDevelopment
    ? ':method :url :status :response-time ms - User: :user-id'
    : ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms';

export const morganMiddleware = morgan(format, { stream, skip });
