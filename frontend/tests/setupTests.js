/**
 * Global Test Setup for EduNexus Frontend
 * 
 * This file runs before all tests and sets up:
 * - Testing Library matchers
 * - Mock localStorage/sessionStorage
 * - Mock fetch API
 * - Redux store test utilities
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

/**
 * Mock localStorage
 */
const localStorageMock = {
    store: {},
    getItem: vi.fn((key) => localStorageMock.store[key] || null),
    setItem: vi.fn((key, value) => {
        localStorageMock.store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
        delete localStorageMock.store[key];
    }),
    clear: vi.fn(() => {
        localStorageMock.store = {};
    }),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

/**
 * Mock sessionStorage
 */
const sessionStorageMock = {
    store: {},
    getItem: vi.fn((key) => sessionStorageMock.store[key] || null),
    setItem: vi.fn((key, value) => {
        sessionStorageMock.store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
        delete sessionStorageMock.store[key];
    }),
    clear: vi.fn(() => {
        sessionStorageMock.store = {};
    }),
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

/**
 * Mock fetch globally
 */
global.fetch = vi.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
    })
);

/**
 * Mock ResizeObserver (used by some UI libraries)
 */
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

/**
 * Mock IntersectionObserver
 */
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

/**
 * Mock matchMedia
 */
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

/**
 * Reset mocks before each test
 */
beforeEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
    vi.clearAllMocks();
});

/**
 * Test Utilities
 */
export const testUtils = {
    /**
     * Mock authenticated user in localStorage
     */
    mockAuthenticatedUser: (user = { id: 'test-id', role: 'student', name: 'Test User' }) => {
        localStorage.setItem('token', 'mock-jwt-token');
        localStorage.setItem('user', JSON.stringify(user));
    },

    /**
     * Create mock API response
     */
    mockApiResponse: (data, status = 200) => ({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(data),
    }),

    /**
     * Wait for async state updates
     */
    waitForStateUpdate: () => new Promise((resolve) => setTimeout(resolve, 0)),
};

export default testUtils;
