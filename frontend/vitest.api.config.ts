import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node', // API tests don't need jsdom
    globals: true,
    include: ['e2e/api/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    exclude: [
      'node_modules',
      'dist',
      'playwright-report',
      'test-results'
    ],
    timeout: 30000, // 30 seconds for API tests (may need backend startup time)
    // Reporter configuration for API tests
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './coverage/api-test-results.json'
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});