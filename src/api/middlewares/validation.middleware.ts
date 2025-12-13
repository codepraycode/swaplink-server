import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../../shared/lib/utils/api-error';

/**
 * Validates the request body against a Zod schema.
 * - Strips unknown fields (security).
 * - Formats errors for easy mobile app consumption.
 * - Supports async validations (e.g. database checks).
 */
export const validateBody =
    (schema: ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
        try {
            // 1. Use safeParseAsync to support async refinements (database lookups inside Zod)
            const result = await schema.safeParseAsync(req.body);

            if (!result.success) {
                // 2. Format errors for the Client
                // result.error.flatten() returns both fieldErrors and formErrors
                const flattenedErrors = result.error.flatten();

                // 3. Simplify: Mobile apps usually only want ONE error message per field at a time.
                const formattedErrors: Record<string, string> = {};

                // Handle field-specific errors
                if (flattenedErrors.fieldErrors) {
                    Object.entries(flattenedErrors.fieldErrors).forEach(([key, value]) => {
                        if (Array.isArray(value) && value.length > 0) {
                            formattedErrors[key] = value[0]; // Take the first error message
                        }
                    });
                }

                // Handle form errors (general errors not tied to a specific field)
                if (flattenedErrors.formErrors && flattenedErrors.formErrors.length > 0) {
                    formattedErrors['_form'] = flattenedErrors.formErrors[0];
                }

                // 4. Throw 422 Unprocessable Entity
                return next(new ValidationError('Invalid input data', formattedErrors));
            }

            // 5. Replace raw body with the sanitized, typed data
            req.body = result.data;
            next();
        } catch (error) {
            next(error);
        }
    };

/**
 * Validates URL Query Parameters (e.g., ?page=1&limit=10)
 */
export const validateQuery =
    (schema: ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await schema.safeParseAsync(req.query);

            if (!result.success) {
                const flattenedErrors = result.error.flatten();
                const formattedErrors: Record<string, string> = {};

                // Handle field-specific errors
                if (flattenedErrors.fieldErrors) {
                    Object.entries(flattenedErrors.fieldErrors).forEach(([key, value]) => {
                        if (Array.isArray(value) && value.length > 0) {
                            formattedErrors[key] = value[0];
                        }
                    });
                }

                return next(new ValidationError('Invalid query parameters', formattedErrors));
            }

            req.query = result.data as any;
            next();
        } catch (error) {
            next(error);
        }
    };

/**
 * Validates URL Path Parameters (e.g., /wallets/:walletId)
 */
export const validateParams =
    (schema: ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await schema.safeParseAsync(req.params);

            if (!result.success) {
                // Param errors are usually Bad Requests (400) or Not Found (404),
                // but validation failure implies the ID format is wrong (e.g. UUID expected but got 'abc')
                return next(new ValidationError('Invalid URL parameters'));
            }

            req.params = result.data as any;
            next();
        } catch (error) {
            next(error);
        }
    };
