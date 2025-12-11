import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import util from 'util';

// --- Configuration Constants ---

const LOG_DIR = path.join(process.cwd(), 'logs');
const IS_PROD = process.env.NODE_ENV === 'production';
const ENABLE_FILE_LOGGING = IS_PROD || process.env.ENABLE_FILE_LOGGING === 'true';
const LOG_LEVEL = process.env.LOG_LEVEL || (IS_PROD ? 'info' : 'debug');

// --- Log Levels & Colors ---

const logLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4,
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        http: 'magenta',
        debug: 'blue',
    },
};

winston.addColors(logLevels.colors);

// --- Formats ---

/**
 * Custom Console Format
 * Displays logs in a readable, colorful format for development.
 * Format: [TIMESTAMP] [LEVEL]: MESSAGE \n { METADATA }
 */
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }), // Colorize the entire line for better visibility
    winston.format.printf(info => {
        const { timestamp, level, message, ...meta } = info;
        let metaStr = '';

        // Handle Metadata Display
        if (Object.keys(meta).length > 0) {
            // If it's an error with a stack trace
            if (meta.stack) {
                metaStr = `\n${meta.stack}`;
            } else {
                // Pretty print objects using util.inspect for better readability in console
                // We filter out internal winston symbols if any leak through
                const cleanMeta = Object.fromEntries(
                    Object.entries(meta).filter(
                        ([key]) =>
                            ![Symbol.for('level'), Symbol.for('message')].includes(key as any)
                    )
                );
                if (Object.keys(cleanMeta).length > 0) {
                    metaStr = `\n${util.inspect(cleanMeta, {
                        colors: true,
                        depth: null,
                        breakLength: 80,
                    })}`;
                }
            }
        }

        return `[${timestamp}] ${level}: ${message}${metaStr}`;
    })
);

/**
 * JSON File Format
 * Structured JSON logs for production and file storage.
 * Ideal for log aggregation systems (ELK, Datadog, etc.)
 */
const jsonFileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }), // Ensure stack traces are included in JSON
    winston.format.json()
);

// --- Transports ---

const transports: winston.transport[] = [
    new winston.transports.Console({
        format: consoleFormat,
        level: LOG_LEVEL,
    }),
];

if (ENABLE_FILE_LOGGING) {
    // Error logs - separate file for errors only
    transports.push(
        new DailyRotateFile({
            filename: path.join(LOG_DIR, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            format: jsonFileFormat,
            maxSize: '20m',
            maxFiles: '14d',
            zippedArchive: true,
            handleExceptions: true,
        })
    );

    // Combined logs - all levels
    transports.push(
        new DailyRotateFile({
            filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            format: jsonFileFormat,
            maxSize: '20m',
            maxFiles: '14d',
            zippedArchive: true,
        })
    );
}

// --- Logger Instance ---

const logger = winston.createLogger({
    level: LOG_LEVEL,
    levels: logLevels.levels,
    transports,
    exitOnError: false,
});

// --- Helper Functions with JSDoc ---

/**
 * Logs an error message with optional context and metadata.
 * Automatically handles Error objects to preserve stack traces.
 *
 * @param error - The error object or message string.
 * @param context - (Optional) A string indicating where the error occurred (e.g., "UserService").
 * @param meta - (Optional) Additional metadata to log.
 *
 * @example
 * logError(new Error("Database failed"), "DatabaseConnection", { host: "localhost" });
 */
export const logError = (
    error: Error | unknown,
    context?: string,
    meta: Record<string, any> = {}
) => {
    const contextPrefix = context ? `[${context}] ` : '';
    if (error instanceof Error) {
        logger.error(`${contextPrefix}${error.message}`, { ...meta, stack: error.stack, error });
    } else {
        logger.error(`${contextPrefix}${String(error)}`, meta);
    }
};

/**
 * Logs an informational message.
 * Use this for general application flow events (e.g., "User logged in").
 *
 * @param message - The message to log.
 * @param meta - (Optional) Additional structured data to include.
 *
 * @example
 * logInfo("User created successfully", { userId: 123 });
 */
export const logInfo = (message: string, meta?: Record<string, any>) => {
    logger.info(message, meta);
};

/**
 * Logs a warning message.
 * Use this for non-critical issues that should be looked at (e.g., "Rate limit approaching").
 *
 * @param message - The warning message.
 * @param meta - (Optional) Additional structured data.
 */
export const logWarn = (message: string, meta?: Record<string, any>) => {
    logger.warn(message, meta);
};

/**
 * Logs a debug message.
 * Use this for detailed information useful during development (e.g., "Variable state").
 *
 * @param message - The debug message.
 * @param meta - (Optional) Additional structured data.
 */
export const logDebug = (message: string, meta?: Record<string, any>) => {
    logger.debug(message, meta);
};

/**
 * Logs an HTTP request details.
 * Useful for middleware logging.
 *
 * @param method - HTTP method (GET, POST, etc.)
 * @param url - Request URL
 * @param statusCode - (Optional) HTTP status code
 * @param duration - (Optional) Request duration in ms
 */
export const logRequest = (method: string, url: string, statusCode?: number, duration?: number) => {
    const message = `${method} ${url}${statusCode ? ` - ${statusCode}` : ''}${
        duration ? ` (${duration}ms)` : ''
    }`;
    logger.http(message);
};

/**
 * Logs a SQL query execution.
 *
 * @param message - The SQL query string.
 * @param duration - (Optional) Execution time in ms.
 */
export const logSQL = (message: string, duration?: number) => {
    const logMessage = duration ? `[SQL EXEC] (${duration}ms) ${message}` : `[SQL EXEC] ${message}`;
    logger.debug(logMessage);
};

export default logger;
