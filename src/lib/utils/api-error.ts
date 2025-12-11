import { Prisma } from '../../database/generated/prisma';
import { HttpStatusCode } from './http-status-codes';

export class ApiError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly data?: any;
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

// --- Convenience Subclasses ---

export class BadRequestError extends ApiError {
    constructor(message = 'Bad Request', data?: any) {
        super(message, HttpStatusCode.BAD_REQUEST, data);
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message = 'Unauthorized access', data?: any) {
        super(message, HttpStatusCode.UNAUTHORIZED, data);
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

export class InternalError extends ApiError {
    constructor(message = 'Internal Server Error', originalError?: Error) {
        super(originalError || message, HttpStatusCode.INTERNAL_SERVER, null, false);
    }
}

// --- Prisma Error Conversion Logic ---

export class PrismaErrorConverter {
    /**
     * Converts a Prisma Error into an HTTP-friendly ApiError
     */
    static convert(error: unknown): ApiError {
        if (error instanceof ApiError) {
            return error;
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return this.handleKnownRequestError(error);
        }

        if (error instanceof Prisma.PrismaClientValidationError) {
            return new BadRequestError('Invalid database query parameters', {
                details: error.message,
            });
        }

        if (error instanceof Prisma.PrismaClientInitializationError) {
            return new ApiError(
                'Database connection failed',
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
                const target = (meta?.target as string[]) || [];
                return new ConflictError(`Duplicate record found: ${target.join(', ')}`);

            case 'P2025': // Record not found
                return new NotFoundError('Record not found');

            case 'P2003': // Foreign key constraint violation
                return new BadRequestError('Related record not found (Foreign Key Constraint)');

            case 'P2011': // Null constraint violation
                return new BadRequestError('Required field cannot be empty');

            default:
                // Log unknown P-codes as 500s but keep message
                return new ApiError(`Database error: ${error.message}`, HttpStatusCode.BAD_REQUEST);
        }
    }
}
