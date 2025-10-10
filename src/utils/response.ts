import { Response } from 'express';
import { ApiError } from './error';
import { isDevEnv } from '../config/env';

export type ApiResponse<T = any> = {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
};

export const sendSuccess = <T>(
    res: Response,
    data?: T,
    message: string = 'Success',
    statusCode: number = 200
) => {
    const response: ApiResponse<T> = {
        success: true,
        message,
        data,
    };
    res.status(statusCode).json(response);
};

export const sendError = (res: Response, error: ApiError) => {
    const message = error.message;
    const statusCode = error.code;

    const response: ApiResponse = {
        success: false,
        message,
        error: isDevEnv ? JSON.stringify(error, null, 2) : undefined,
    };
    res.status(statusCode).json(response);
};
