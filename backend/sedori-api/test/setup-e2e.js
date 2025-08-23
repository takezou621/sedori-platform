// E2E Test Setup Configuration
process.env.NODE_ENV = 'test';
process.env.DB_DATABASE = 'sedori_e2e';

// Increase timeout for database operations
jest.setTimeout(30000);

// Setup global test configuration
global.beforeAll(async () => {
  // Global setup if needed
});

global.afterAll(async () => {
  // Global cleanup if needed
  await new Promise(resolve => setTimeout(resolve, 1000));
});