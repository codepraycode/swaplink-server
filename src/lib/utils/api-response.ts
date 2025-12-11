import { Response } from 'express';
import { HttpStatusCode } from './http-status-codes';

/**
 * Standardized API Response Structure
 * Aligns with the error handler response format
 */
export type ApiResponse<T = any> = {
    status: 'success';
    statusCode: number;
    message: string;
    data?: T;
    meta?: any; // Useful for pagination, total counts, etc.
};

/**
 * Helper to send successful responses
 * @param res - Express Response Object
 * @param data - The payload to send
 * @param message - Human readable message
 * @param statusCode - HTTP Status Code (default 200)
 * @param meta - Optional metadata (pagination, etc.)
 */
export const sendSuccess = <T>(
    res: Response,
    data?: T,
    message: string = 'Success',
    statusCode: HttpStatusCode = HttpStatusCode.OK,
    meta?: any
) => {
    const response: ApiResponse<T> = {
        status: 'success',
        statusCode,
        message,
        data,
        ...(meta && { meta }), // Only include meta if it exists
    };

    return res.status(statusCode).json(response);
};
