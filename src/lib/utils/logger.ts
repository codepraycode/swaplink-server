import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import util from 'util';
import { SENSITIVE_KEYS } from './sensitive-data';

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

// --- Custom Formats ---

/**
 * Redactor Format
 * Recursively masks sensitive keys in the log object before writing.
 */
const redactor = winston.format(info => {
    const maskSensitiveData = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;

        // Handle Arrays
        if (Array.isArray(obj)) return obj.map(maskSensitiveData);

        // Handle Objects
        const newObj: any = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                if (SENSITIVE_KEYS.includes(key)) {
                    newObj[key] = '*****'; // Mask the value
                } else if (typeof obj[key] === 'object') {
                    newObj[key] = maskSensitiveData(obj[key]); // Recurse
                } else {
                    newObj[key] = obj[key];
                }
            }
        }
        return newObj;
    };

    // Apply masking to the info object (excluding internal winston props)
    const { level, message, timestamp, ...meta } = info;
    const maskedMeta = maskSensitiveData(meta);

    return { ...info, ...maskedMeta };
});

/**
 * Custom Console Format
 */
const consoleFormat = winston.format.combine(
    redactor(), // <--- Apply redaction FIRST
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(info => {
        const { timestamp, level, message, ...meta } = info;
        let metaStr = '';

        if (Object.keys(meta).length > 0) {
            if (meta.stack) {
                metaStr = `\n${meta.stack}`;
            } else {
                const cleanMeta = Object.fromEntries(
                    Object.entries(meta).filter(
                        ([key]) =>
                            ![Symbol.for('level'), Symbol.for('message')].includes(key as any)
                    )
                );
                if (Object.keys(cleanMeta).length > 0) {
                    // Limit depth to 3 to prevent terminal flooding
                    metaStr = `\n${util.inspect(cleanMeta, {
                        colors: true,
                        depth: 3,
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
 */
const jsonFileFormat = winston.format.combine(
    redactor(), // <--- Apply redaction here too
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
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

// --- Helper Functions ---

/**
 * Logs an error message with optional context.
 * Enhanced to handle Prisma/Axios errors intelligently.
 */
export const logError = (
    error: Error | unknown,
    context?: string,
    meta: Record<string, any> = {}
) => {
    const contextPrefix = context ? `[${context}] ` : '';

    if (error instanceof Error) {
        // Log the message and the stack trace
        logger.error(`${contextPrefix}${error.message}`, {
            ...meta,
            stack: error.stack,
            // If it has specific data (like ApiError), log that too
            data: (error as any).data,
        });
    } else {
        logger.error(`${contextPrefix}${String(error)}`, meta);
    }
};

export const logInfo = (message: string, meta?: Record<string, any>) => {
    logger.info(message, meta);
};

export const logWarn = (message: string, meta?: Record<string, any>) => {
    logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: Record<string, any>) => {
    logger.debug(message, meta);
};

export const logRequest = (method: string, url: string, statusCode?: number, duration?: number) => {
    const message = `${method} ${url}${statusCode ? ` - ${statusCode}` : ''}${
        duration ? ` (${duration}ms)` : ''
    }`;
    logger.http(message);
};

export default logger;
