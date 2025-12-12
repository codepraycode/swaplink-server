import { Request, Response, NextFunction } from 'express';
import { ApiError, InternalError, PrismaErrorConverter } from '../lib/utils/api-error';
import logger from '../lib/utils/logger';
import { envConfig } from '../config/env.config';

export const globalErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    // 1. Convert to ApiError (Handles Prisma, Generic Errors, etc.)
    let error = PrismaErrorConverter.convert(err);

    // 2. Log the error
    if (!(error instanceof ApiError)) {
        error = new InternalError('Something went wrong', err);
    }
    // if (error.isOperational) {
    //     logger.warn(
    //         `${error.statusCode} - ${error.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`
    //     );
    // } else {
    //     // Critical system errors
    //     logger.error(
    //         `${error.statusCode} - ${error.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`,
    //         {
    //             stack: error.stack,
    //             originalError: error.originalError,
    //         }
    //     );
    // }

    // 3. Prepare response

    const response = {
        success: false,
        statusCode: error.statusCode,
        message: error.message,
        data: error.data || null,
        stack: envConfig.NODE_ENV === 'development' ? error.stack : undefined,
    };

    // 4. Send response
    res.status(error.statusCode).json(response);
};
