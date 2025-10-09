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
