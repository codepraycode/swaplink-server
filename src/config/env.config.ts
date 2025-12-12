import dotenv from 'dotenv';
import path from 'path';
import logger from '../lib/utils/logger';

interface EnvConfig {
    NODE_ENV: string;
    PORT: number;
    ENABLE_FILE_LOGGING: boolean;
    SERVER_URL: string;

    DB_HOST: string;
    DB_USER: string;
    DB_PASSWORD: string;
    DB_NAME: string;
    DATABASE_URL: string;

    REDIS_URL: string;
    REDIS_PORT: number;

    JWT_SECRET: string;
    JWT_ACCESS_EXPIRATION: string;
    JWT_REFRESH_SECRET: string;
    JWT_REFRESH_EXPIRATION: string;

    GLOBUS_SECRET_KEY: string;
    GLOBUS_WEBHOOK_SECRET: string;

    CORS_URLS: string;

    SMTP_HOST: string;
    SMTP_PORT: number;
    SMTP_USER: string;
    SMTP_PASSWORD: string;
    EMAIL_TIMEOUT: number;
    FROM_EMAIL: string;
    FRONTEND_URL: string;
}

const loadEnv = () => {
    const env = process.env.NODE_ENV || 'development';
    const envFile = path.resolve(process.cwd(), `.env.${env}`);
    const genericEnvFile = path.resolve(process.cwd(), `.env`);

    // Load the environment-specific file first, if it exists
    const configResult = dotenv.config({ path: envFile });

    // If the specific file failed (e.g., it doesn't exist), try loading the generic one
    if (configResult.error && configResult.error.message.includes('ENOENT')) {
        logger.warn(`Specific env file not found (${envFile}). Falling back to generic .env.`);
        dotenv.config({ path: genericEnvFile });
    } else if (configResult.error) {
        // Log other potential errors with loading the file
        logger.error(`Error loading env file (${envFile}):`, configResult.error.message);
    }
};

loadEnv();

const getEnv = (key: string, defaultValue?: string): string => {
    const value = process.env[key];
    if (value === undefined) {
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

export const envConfig: EnvConfig = {
    NODE_ENV: getEnv('NODE_ENV', 'development'),
    PORT: parseInt(getEnv('PORT', '8080'), 10),
    SERVER_URL: getEnv('SERVER_URL', 'http://localhost'),
    ENABLE_FILE_LOGGING: getEnv('ENABLE_FILE_LOGGING', 'true') === 'true',
    DB_HOST: getEnv('DB_HOST', 'localhost'),
    DB_USER: getEnv('DB_USER', 'root'),
    DB_PASSWORD: getEnv('DB_PASSWORD', 'password'),
    DB_NAME: getEnv('DB_NAME', 'verivo_bkend'),
    DATABASE_URL: getEnv('DATABASE_URL'),
    REDIS_URL: getEnv('REDIS_URL', 'redis://localhost:6379'),
    REDIS_PORT: parseInt(getEnv('REDIS_PORT', '6379'), 10),
    JWT_SECRET: getEnv('JWT_SECRET'),
    JWT_ACCESS_EXPIRATION: getEnv('JWT_ACCESS_EXPIRATION'),
    JWT_REFRESH_SECRET: getEnv('JWT_REFRESH_SECRET'),
    JWT_REFRESH_EXPIRATION: getEnv('JWT_REFRESH_EXPIRATION'),
    GLOBUS_SECRET_KEY: getEnv('GLOBUS_SECRET_KEY'),
    GLOBUS_WEBHOOK_SECRET: getEnv('GLOBUS_WEBHOOK_SECRET'),
    CORS_URLS: getEnv('CORS_URLS'),
    SMTP_HOST: getEnv('SMTP_HOST'),
    SMTP_PORT: parseInt(getEnv('SMTP_PORT', '587'), 10),
    SMTP_USER: getEnv('SMTP_USER'),
    SMTP_PASSWORD: getEnv('SMTP_PASSWORD'),
    EMAIL_TIMEOUT: parseInt(getEnv('EMAIL_TIMEOUT', '10000'), 10),
    FROM_EMAIL: getEnv('FROM_EMAIL', 'no-reply@example.com'),
    FRONTEND_URL: getEnv('FRONTEND_URL', 'http://localhost:3000'),
};

/**
 * Validates that all required environment variables are set.
 * Throws an error if any are missing.
 */
export const validateEnv = (): void => {
    const requiredKeys: (keyof EnvConfig)[] = [
        'DATABASE_URL',
        'JWT_SECRET',
        'JWT_ACCESS_EXPIRATION',
        'JWT_REFRESH_SECRET',
        'JWT_REFRESH_EXPIRATION',
        'GLOBUS_SECRET_KEY',
        'GLOBUS_WEBHOOK_SECRET',
        'CORS_URLS',
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_USER',
        'SMTP_PASSWORD',
        'FROM_EMAIL',
    ];

    const missingKeys = requiredKeys.filter(key => !process.env[key]);

    if (missingKeys.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missingKeys.join(
                ', '
            )}. Please check your .env file.`
        );
    }
};

// Validate environment variables early
validateEnv();
