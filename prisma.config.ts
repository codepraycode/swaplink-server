// prisma.config.ts
import { defineConfig } from '@prisma/config';
import { envConfig } from './src/config/env.config';

export default defineConfig({
    datasource: {
        url: envConfig.DATABASE_URL,
    },
});
