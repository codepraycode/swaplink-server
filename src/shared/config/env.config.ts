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
    GLOBUS_BASE_URL: string;
    GLOBUS_CLIENT_ID: string;

    CORS_URLS: string;

    SMTP_HOST: string;
    SMTP_PORT: number;
    SMTP_USER: string;
    SMTP_PASSWORD: string;
    EMAIL_TIMEOUT: number;
    FROM_EMAIL: string;
    FRONTEND_URL: string;

    // Resend Email Service
    RESEND_API_KEY: string;

    // SendGrid Email Service (for staging)
    SENDGRID_API_KEY: string;

    // Mailtrap Email Service (for staging - API)
    MAILTRAP_API_TOKEN: string;

    // Mailtrap SMTP (deprecated - kept for backward compatibility)
    MAILTRAP_HOST: string;
    MAILTRAP_PORT: number;
    MAILTRAP_USER: string;
    MAILTRAP_PASSWORD: string;

    // Storage (S3/Cloudflare R2)
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
    AWS_REGION: string;
    AWS_BUCKET_NAME: string;
    AWS_ENDPOINT: string; // For Cloudflare R2

    // System
    SYSTEM_USER_ID: string;
}

import fs from 'fs';

const loadEnv = () => {
    const env = process.env.NODE_ENV || 'development';
    const envFile = path.resolve(process.cwd(), `.env.${env}`);
    const genericEnvFile = path.resolve(process.cwd(), `.env`);

    // Check if specific env file exists
    if (fs.existsSync(envFile)) {
        const configResult = dotenv.config({ path: envFile });
        if (configResult.error) {
            logger.error(`Error loading env file (${envFile}):`, configResult.error.message);
        }
    } else {
        // Only warn if we are NOT in production, because in production we expect env vars to be injected
        if (env !== 'production') {
            logger.warn(`Specific env file not found (${envFile}). Falling back to generic .env.`);
        }

        // Try generic .env
        if (fs.existsSync(genericEnvFile)) {
            dotenv.config({ path: genericEnvFile });
        }
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
    JWT_SECRET: getEnv('JWT_SECRET', 'JWT_SECRET'),
    JWT_ACCESS_EXPIRATION: getEnv('JWT_ACCESS_EXPIRATION', 'JWT_ACCESS_EXPIRATION'),
    JWT_REFRESH_SECRET: getEnv('JWT_REFRESH_SECRET', 'JWT_REFRESH_SECRET'),
    JWT_REFRESH_EXPIRATION: getEnv('JWT_REFRESH_EXPIRATION', 'JWT_REFRESH_EXPIRATION'),
    GLOBUS_SECRET_KEY: getEnv('GLOBUS_SECRET_KEY'),
    GLOBUS_WEBHOOK_SECRET: getEnv('GLOBUS_WEBHOOK_SECRET'),
    GLOBUS_BASE_URL: getEnv('GLOBUS_BASE_URL'),
    GLOBUS_CLIENT_ID: getEnv('GLOBUS_CLIENT_ID'),
    CORS_URLS: getEnv('CORS_URLS', 'http://localhost:3000'),
    SMTP_HOST: getEnv('SMTP_HOST', 'smtp.example.com'),
    SMTP_PORT: parseInt(getEnv('SMTP_PORT', '587'), 10),
    SMTP_USER: getEnv('SMTP_USER', 'smtp@example.com'),
    SMTP_PASSWORD: getEnv('SMTP_PASSWORD', 'smtp-password'),
    EMAIL_TIMEOUT: parseInt(getEnv('EMAIL_TIMEOUT', '10000'), 10),
    FROM_EMAIL: getEnv('FROM_EMAIL', 'onboarding@resend.dev'),
    FRONTEND_URL: getEnv('FRONTEND_URL', 'http://localhost:3000'),

    RESEND_API_KEY: getEnv('RESEND_API_KEY', ''),

    SENDGRID_API_KEY: getEnv('SENDGRID_API_KEY', ''),

    MAILTRAP_API_TOKEN: getEnv('MAILTRAP_API_TOKEN', ''),

    MAILTRAP_HOST: getEnv('MAILTRAP_HOST', 'sandbox.smtp.mailtrap.io'),
    MAILTRAP_PORT: parseInt(getEnv('MAILTRAP_PORT', '2525'), 10),
    MAILTRAP_USER: getEnv('MAILTRAP_USER', ''),
    MAILTRAP_PASSWORD: getEnv('MAILTRAP_PASSWORD', ''),

    AWS_ACCESS_KEY_ID: getEnv('AWS_ACCESS_KEY_ID', 'minioadmin'),
    AWS_SECRET_ACCESS_KEY: getEnv('AWS_SECRET_ACCESS_KEY', 'minioadmin'),
    AWS_REGION: getEnv('AWS_REGION', 'us-east-1'),
    AWS_BUCKET_NAME: getEnv('AWS_BUCKET_NAME', 'swaplink'),
    AWS_ENDPOINT: getEnv('AWS_ENDPOINT', 'http://localhost:9000'),

    SYSTEM_USER_ID: getEnv('SYSTEM_USER_ID', 'system-wallet-user'),
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

        'CORS_URLS',
        // 'SMTP_HOST',
        // 'SMTP_PORT',
        // 'SMTP_USER',
        // 'SMTP_PASSWORD',
        'FROM_EMAIL',
        'SYSTEM_USER_ID',
    ];

    if (process.env.NODE_ENV === 'production') {
        // Only require Globus credentials in true production
        // In staging, we can use mock services for payment processing
        const isStaging = process.env.STAGING === 'true';

        if (!isStaging) {
            requiredKeys.push(
                'GLOBUS_SECRET_KEY',
                'GLOBUS_WEBHOOK_SECRET',
                'GLOBUS_BASE_URL',
                'GLOBUS_CLIENT_ID'
            );
        }
    }

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
