import { execSync } from 'child_process';

// Global setup for integration tests
export default async function globalSetup() {
    console.log('🚀 Setting up integration test environment...');

    // Start test database
    execSync('npm run docker:test:up', { stdio: 'inherit' });

    // Wait for database to be ready
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Run migrations
    execSync('npm run db:migrate', { stdio: 'inherit' });

    console.log('✅ Integration test environment ready');
}
