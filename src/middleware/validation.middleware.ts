import { Request, Response, NextFunction } from 'express';
import { ZodObject } from 'zod';
import { sendError } from '../utils/response';
import { ApiError } from '../utils/error';

export const validateBody =
    (schema: ZodObject) => (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors = result.error;

            const err = new ApiError('Bad Input', 400, 'Authentication');
            err.obj = errors;

            return sendError(res, err);

            // return res.status(400).json({
            //     success: false,
            //     message: 'Validation failed',
            //     errors,
            // });
        }

        // replace raw body with validated and parsed data
        req.body = result.data;
        next();
    };
