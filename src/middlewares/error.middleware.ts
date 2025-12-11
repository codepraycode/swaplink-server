import { Request, Response, NextFunction } from 'express';
import { PrismaErrorConverter } from '../lib/utils/api-error';
import logger from '../lib/utils/logger';

export const globalErrorHandler = (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // 1. Convert to ApiError (Handles Prisma, Generic Errors, etc.)
    const error = PrismaErrorConverter.convert(err);

    // 2. Log the error
    if (error.isOperational) {
        logger.warn(
            `${error.statusCode} - ${error.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`
        );
    } else {
        // Critical system errors
        logger.error(
            `${error.statusCode} - ${error.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`,
            {
                stack: error.stack,
                originalError: error.originalError,
            }
        );
    }

    // 3. Prepare response
    const isDev = process.env.NODE_ENV === 'development';

    const response = {
        status: 'error',
        statusCode: error.statusCode,
        message: error.message,
        ...(error.data && { data: error.data }),
        ...(isDev && { stack: error.stack }), // Only show stack in dev
    };

    // 4. Send response
    res.status(error.statusCode).json(response);
};
