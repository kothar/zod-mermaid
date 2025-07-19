/**
 * Test setup file for Jest
 * This file is automatically loaded before each test
 */

// Set up global test environment
beforeAll(() => {
  // Global test setup
});

afterAll(() => {
  // Global test cleanup
});

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
