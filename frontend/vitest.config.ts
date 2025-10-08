/* eslint-disable import/no-unresolved */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globalTeardown: './src/test-utils/global-teardown.ts',
    globals: false,
    css: true,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Increase test timeout for async operations
    testTimeout: 15000, // 15 seconds instead of default 5 seconds
    hookTimeout: 10000, // 10 seconds for setup/teardown hooks
    teardownTimeout: 10000, // 10 seconds for cleanup operations
    // Enable better async handling with single fork for proper cleanup
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true // Ensures proper cleanup and resource management
      }
    },
    exclude: [
      'node_modules',
      'dist',
      'e2e',
      'playwright-report',
      'test-results',
      '**/*.spec.tsx' // Exclude Playwright component tests
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,ts,jsx,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/test-setup.ts',
        'src/**/*.d.ts',
        'src/**/*.test.{js,ts,jsx,tsx}',
        'src/test-utils/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    // Reporter configuration
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './coverage/test-results.json'
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});

