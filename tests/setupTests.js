/**
 * Global Test Setup for EduNexus Backend
 * 
 * This file runs before all tests and sets up:
 * - Environment variables
 * - Global mocks for Mongoose
 * - Test utilities
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.ACCESS_TOKEN_EXPIRES = '15m';
process.env.REFRESH_TOKEN_EXPIRES = '7d';

// Suppress console logs during tests (optional - comment out for debugging)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

/**
 * Mock Mongoose connection
 * We don't need actual DB connection for unit tests
 */
jest.mock('mongoose', () => {
    const actualMongoose = jest.requireActual('mongoose');
    return {
        ...actualMongoose,
        connect: jest.fn().mockResolvedValue(true),
        connection: {
            close: jest.fn().mockResolvedValue(true),
            on: jest.fn(),
            once: jest.fn(),
        },
    };
});

/**
 * Global test utilities
 */
global.testUtils = {
    /**
     * Generate a valid JWT token for testing
     */
    generateTestToken: (payload = { id: 'test-user-id', role: 'admin' }) => {
        const jwt = require('jsonwebtoken');
        return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
    },

    /**
     * Generate mock user data
     */
    mockUser: (overrides = {}) => ({
        _id: 'mock-user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin',
        status: 'active',
        passwordHash: '$2b$10$mockHashedPassword',
        ...overrides,
    }),

    /**
     * Generate mock student data
     */
    mockStudent: (overrides = {}) => ({
        _id: 'mock-student-id',
        name: 'Test Student',
        email: 'student@example.com',
        status: 'active',
        passwordHash: '$2b$10$mockHashedPassword',
        advisor: 'mock-advisor-id',
        ...overrides,
    }),

    /**
     * Generate mock review session data
     */
    mockReviewSession: (overrides = {}) => ({
        _id: 'mock-review-id',
        student: 'mock-student-id',
        reviewer: 'mock-reviewer-id',
        advisor: 'mock-advisor-id',
        scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
        mode: 'online',
        status: 'scheduled',
        ...overrides,
    }),
};

/**
 * Clean up after all tests
 */
afterAll(async () => {
    // Clear all mocks
    jest.clearAllMocks();
});
