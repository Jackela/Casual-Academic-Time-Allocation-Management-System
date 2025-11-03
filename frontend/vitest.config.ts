/* eslint-disable import/no-unresolved */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import os from 'node:os';

const testIncludePatterns = ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'];

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/'
      }
    },
    setupFiles: ['./src/test-setup.ts'],
    globalTeardown: './src/test-utils/global-teardown.ts',
    globals: false,
    css: true,
    include: testIncludePatterns,
    // Increase test timeout for async operations
    testTimeout: 15000, // 15 seconds instead of default 5 seconds
    hookTimeout: 10000, // 10 seconds for setup/teardown hooks
    teardownTimeout: 10000, // 10 seconds for cleanup operations
    // Use threads pool isolation to prevent memory growth across files
    pool: 'threads',
    poolOptions: {
      threads: {
        isolate: true,
        maxThreads: Math.max(1, Math.min(2, (os.cpus()?.length || 2))),
        minThreads: 1,
      }
    },
    // Keep tests non-concurrent within a file to reduce flakiness
    sequence: { concurrent: false },
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
      reporter: ['text', 'json', 'json-summary', 'lcov', 'html'],
      include: ['src/**/*.{js,ts,jsx,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/test-setup.ts',
        'src/**/*.d.ts',
        'src/**/*.test.{js,ts,jsx,tsx}',
        'src/test-utils/**',
        // Exclude generated and definition-only code from coverage
        'src/contracts/**',
        'src/contracts/generated/**',
        'src/types/**'
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
    reporters: [
      'verbose',
      ['json', { outputFile: 'test-results/vitest.json' }]
    ]
  },
  resolve: {
    alias: {
      // Keep aliases in sync with vite.config.ts to ensure
      // module resolution works the same under Vitest.
      '@': '/src',
      '@/components': '/src/components',
      '@/lib': '/src/lib',
      '@/utils': '/src/utils',
      '@/hooks': '/src/hooks',
      '@/types': '/src/types',
      '@/services': '/src/services',
      '@/contexts': '/src/contexts',
      // Shared JSON Schemas (referenced by AJV validation layer)
      // Resolve to the repo-level schema directory
      '@schema': path.resolve(__dirname, '../schema'),
    }
  }
});

