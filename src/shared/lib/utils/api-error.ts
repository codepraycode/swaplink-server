/* eslint-disable no-case-declarations */
import {
    Prisma,
    PrismaClientInitializationError,
    PrismaClientKnownRequestError,
    PrismaClientValidationError,
} from '../../database';
import { HttpStatusCode } from './http-status-codes';

// Base Error Class
export class ApiError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly data?: any;
    // We keep originalError for server logs, but NEVER send it to client
    public readonly originalError?: Error;

    constructor(input: string | Error, statusCode: number, data?: any, isOperational = true) {
        const message = input instanceof Error ? input.message : input;
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);

        this.statusCode = statusCode;
        this.data = data;
        this.isOperational = isOperational;

        if (input instanceof Error) {
            this.originalError = input;
            this.stack = input.stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

// --- Standard HTTP Errors ---

export class BadRequestError extends ApiError {
    constructor(message = 'Bad Request', data?: any) {
        super(message, HttpStatusCode.BAD_REQUEST, data);
    }
}

export class BadGatewayError extends ApiError {
    constructor(message = 'Bad Gateway', data?: any) {
        super(message, HttpStatusCode.BAD_GATEWAY, data);
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message = 'Unauthorized access. Please login again.', data?: any) {
        super(message, HttpStatusCode.UNAUTHORIZED, data);
    }
}

/**
 * ForbiddenError (403)
 * USE CASE: User is logged in, but lacks permission (e.g., KYC Level 1 trying to do Level 3 transaction).
 * DIFFERENT FROM 401: 401 means "Who are you?", 403 means "I know you, but no."
 */
export class ForbiddenError extends ApiError {
    constructor(message = 'Access denied', data?: any) {
        super(message, HttpStatusCode.FORBIDDEN, data);
    }
}

export class NotFoundError extends ApiError {
    constructor(message = 'Resource not found', data?: any) {
        super(message, HttpStatusCode.NOT_FOUND, data);
    }
}

export class ConflictError extends ApiError {
    constructor(message = 'Resource already exists', data?: any) {
        super(message, HttpStatusCode.CONFLICT, data);
    }
}

/**
 * UnprocessableEntityError (422)
 * USE CASE: Form validation errors (Zod/Joi).
 * Mobile apps need this to highlight specific form fields in red.
 */
export class ValidationError extends ApiError {
    constructor(message = 'Validation failed', errors?: Record<string, string>) {
        super(message, HttpStatusCode.UNPROCESSABLE_ENTITY, errors);
    }
}

export class InternalError extends ApiError {
    constructor(message = 'Internal Server Error', originalError?: Error) {
        // isOperational = false means this is a bug we need to fix
        super(originalError || message, HttpStatusCode.INTERNAL_SERVER_ERROR, null, false);
    }
}

export class CorsError extends ApiError {
    constructor(message = 'CORS Error', originalError?: Error) {
        super(originalError || message, HttpStatusCode.FORBIDDEN, null, false);
    }
}

export class PrismaErrorConverter {
    /**
     * Converts a Prisma Error into an HTTP-friendly ApiError
     */
    static convert(error: unknown): ApiError {
        if (error instanceof ApiError) {
            return error;
        }

        if (error instanceof PrismaClientKnownRequestError) {
            return this.handleKnownRequestError(error as Prisma.PrismaClientKnownRequestError);
        }

        // SECURITY FIX 1: Sanitize Validation Errors
        // Never send error.message here. It contains raw query data.
        if (error instanceof PrismaClientValidationError) {
            return new BadRequestError('Invalid data format provided. Please check your input.');
        }

        if (error instanceof PrismaClientInitializationError) {
            // Database is down
            return new ApiError(
                'Service currently unavailable',
                HttpStatusCode.SERVICE_UNAVAILABLE,
                null,
                false
            );
        }

        // Default generic error
        return new InternalError(
            'An unexpected database error occurred',
            error instanceof Error ? error : undefined
        );
    }

    private static handleKnownRequestError(error: Prisma.PrismaClientKnownRequestError): ApiError {
        const { code, meta } = error;

        switch (code) {
            case 'P2002': // Unique constraint violation
                // SECURITY FIX 2: Sanitize Field Names
                // Convert "user_email_key" -> "email"
                const target = (meta?.target as string[]) || [];
                const field = target.length > 0 ? target[0] : 'record';

                // Humanize the field name for the mobile user
                const readableField = field.replace(/_/g, ' ').replace('key', '').trim();

                return new ConflictError(`A record with this ${readableField} already exists.`);

            case 'P2025': // Record not found
                return new NotFoundError('Requested record not found');

            case 'P2003': // Foreign key constraint violation
                // Example: Trying to add a transaction to a Wallet ID that doesn't exist
                return new BadRequestError('Invalid reference ID provided.');

            case 'P2011': // Null constraint violation
                return new BadRequestError('Required field cannot be empty');

            case 'P2000': // Input value too long
                return new BadRequestError('Input value is too long for one of the fields.');

            default:
                // Log unknown P-codes internally, generic message to client
                return new InternalError(`Database error: ${code}`);
        }
    }
}
