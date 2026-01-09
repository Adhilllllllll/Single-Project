module.exports = {
    testEnvironment: 'node',
    rootDir: '.',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.js'],
    // Map relative paths in tests to actual source files
    moduleNameMapper: {
        '^../../src/(.*)$': '<rootDir>/src/$1',
    },
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js',
        '!src/config/**',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
    // Avoid running tests in parallel to prevent port conflicts
    maxWorkers: 1,
    // Timeout for async operations
    testTimeout: 10000,
    // Clear mocks between tests
    clearMocks: true,
    // Verbose output
    verbose: true,
};
