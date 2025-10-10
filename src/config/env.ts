export const JWT_SECRET = process.env.JWT_SECRET!;
export const NODE_ENV = process.env.NODE_ENV;

export const isDevEnv = NODE_ENV === 'development';
export const isTestEnv = NODE_ENV === 'test';
export const isProdEnv = !isDevEnv && !isTestEnv;

export const DATABASE_URL = process.env.DATABASE_URL;
