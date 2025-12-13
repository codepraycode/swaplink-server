import { execSync } from 'child_process';
import logger from '../shared/lib/utils/logger';

// Global setup for integration tests
export default async function globalSetup() {
    logger.debug('🚀 Setting up integration test environment...');

    // Start test database
    execSync('npm run docker:test:up', { stdio: 'inherit' });

    // Wait for database to be ready
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Run migrations
    execSync('npm run db:migrate', { stdio: 'inherit' });

    logger.debug('✅ Integration test environment ready');
}
