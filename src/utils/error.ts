import { Prisma } from '../generated/prisma';

export class ApiError extends Error {
    code = 500;
    context = '';
    constructor(message: string, code: number, context: string = 'API') {
        super(message);

        this.code = code;
        this.context = `[${context}]`;
    }
}

export function handlerEror(error: any, message: string = 'Unknown') {
    return new ApiError(error.message || message, error.code || 500, error.context);
}

type PrismaBase = {
    timestamp: Date;
    operation?: string;
};

type PrismaGood<T> = PrismaBase & {
    success: true;
    data: T;
};

type PrismaBad = PrismaBase & {
    success: false;
    data?: null;
    error: string;
    errorCode?: string;
    errorType: string;
};

export type PrismaErrorResult<T> = PrismaGood<T> | PrismaBad;

export class PrismaErrorHandler {
    private static logger = console; // Replace with your logger

    /**
     * Wrap Prisma operation with advanced error handling and logging
     */
    static async wrap<T>(
        operation: () => Promise<T>,
        context: {
            operationName: string;
            customErrorMessage?: string;
            logError?: boolean;
        } = { operationName: 'unknown', logError: true }
    ): Promise<PrismaErrorResult<T>> {
        const startTime = Date.now();

        try {
            const data = await operation();
            const duration = Date.now() - startTime;

            if (context.logError) {
                this.logger.log(`✅ ${context.operationName} completed in ${duration}ms`);
            }

            return {
                success: true,
                data,
                timestamp: new Date(),
                operation: context.operationName,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorInfo = this.extractErrorInfo(error);

            if (context.logError) {
                this.logger.error(`❌ ${context.operationName} failed after ${duration}ms`, {
                    error: errorInfo.message,
                    code: errorInfo.code,
                    type: errorInfo.type,
                    operation: context.operationName,
                    timestamp: new Date().toISOString(),
                });
            }

            return {
                success: false,
                error: context.customErrorMessage || errorInfo.message,
                errorCode: errorInfo.code,
                errorType: errorInfo.type,
                timestamp: new Date(),
                operation: context.operationName,
            };
        }
    }

    /**
     * Extract error information (same as basic version)
     */
    private static extractErrorInfo(error: unknown): {
        message: string;
        code?: string;
        type: string;
    } {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return {
                message: this.getKnownRequestErrorMessage(error),
                code: error.code,
                type: 'PrismaClientKnownRequestError',
            };
        }

        if (error instanceof Prisma.PrismaClientUnknownRequestError) {
            return {
                message: 'An unknown database error occurred',
                type: 'PrismaClientUnknownRequestError',
            };
        }

        if (error instanceof Prisma.PrismaClientValidationError) {
            return {
                message: 'Invalid query parameters provided',
                type: 'PrismaClientValidationError',
            };
        }

        if (error instanceof Prisma.PrismaClientInitializationError) {
            return {
                message: 'Database connection failed',
                type: 'PrismaClientInitializationError',
            };
        }

        if (error instanceof Prisma.PrismaClientRustPanicError) {
            return {
                message: 'A critical database error occurred',
                type: 'PrismaClientRustPanicError',
            };
        }

        if (error instanceof Error) {
            return {
                message: error.message,
                type: 'GenericError',
            };
        }

        return {
            message: 'An unexpected error occurred',
            type: 'UnknownError',
        };
    }

    private static getKnownRequestErrorMessage(
        error: Prisma.PrismaClientKnownRequestError
    ): string {
        const { code, meta } = error;

        switch (code) {
            case 'P2002':
                const fields = (meta?.target as string[]) || [];
                return `A record with this ${fields.join(', ')} already exists`;
            case 'P2025':
                return 'Record not found';
            case 'P2003':
                return 'Referenced record does not exist';
            case 'P2011':
                return 'Required field cannot be empty';
            case 'P2000':
                return 'The provided value is too long';
            case 'P2005':
                return 'Invalid data format provided';
            case 'P2006':
                return 'Invalid data type provided';
            case 'P2012':
                return 'Required relation is missing';
            case 'P1001':
                return 'Cannot connect to the database';
            case 'P1017':
                return 'Database connection closed';
            default:
                return `Database error: ${error.message}`;
        }
    }
}
