import { Response } from 'express';
import { HttpStatusCode } from './http-status-codes';

// ======================================================
// 1. Strict Typing for Meta/Pagination
// ======================================================

/**
 * Standard Pagination Metadata
 * Ensures all lists in the mobile app use the same structure
 * for Infinite Scroll or "Load More" features.
 */
export interface PaginationMeta {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
}

/**
 * Standardized API Response Structure
 */
export type ApiResponse<T = any> = {
    success: boolean; // <--- CHANGED: Boolean is easier to parse
    statusCode: number;
    message: string;
    data?: T;
    meta?: PaginationMeta | any;
};

// ======================================================
// 2. Main Success Responder
// ======================================================

/**
 * Helper to send successful responses (200 OK)
 */
export const sendSuccess = <T>(
    res: Response,
    data?: T,
    message: string = 'Success',
    meta?: PaginationMeta | any
) => {
    const response: ApiResponse<T> = {
        success: true,
        statusCode: HttpStatusCode.OK,
        message,
        data,
        ...(meta && { meta }),
    };

    return res.status(HttpStatusCode.OK).json(response);
};

// ======================================================
// 3. specialized Helpers (Syntactic Sugar)
// ======================================================

/**
 * Helper for Resource Creation (201 Created)
 * Use this for Registration, New Transactions, etc.
 */
export const sendCreated = <T>(
    res: Response,
    data?: T,
    message: string = 'Resource created successfully'
) => {
    const response: ApiResponse<T> = {
        success: true,
        statusCode: HttpStatusCode.CREATED,
        message,
        data,
    };

    return res.status(HttpStatusCode.CREATED).json(response);
};

/**
 * Helper for Empty Responses (204 No Content)
 * Use this for creating "Favorites" or un-liking/deleting where no data is returned.
 * Note: 204 does not return a body in standard HTTP,
 * but sometimes mobile apps prefer 200 with null data to verify success.
 * If you strictly want 204 (no body), just use `res.sendStatus(204)`.
 */
export const sendNoContent = (res: Response) => {
    return res.status(HttpStatusCode.NO_CONTENT).send();
};
