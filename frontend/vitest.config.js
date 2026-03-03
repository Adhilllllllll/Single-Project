import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./tests/setupTests.js'],
        include: ['tests/**/*.test.{js,jsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/**/*.{js,jsx}'],
            exclude: [
                'src/main.jsx',
                'src/App.jsx',
                'src/constants/**',
                'src/assets/**',
            ],
        },
        // Timeout for async operations
        testTimeout: 10000,
        // Clear mocks between tests
        clearMocks: true,
    },
});
