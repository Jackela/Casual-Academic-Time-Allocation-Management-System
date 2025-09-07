import { afterEach, afterAll, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { runCleanups, clearCleanups } from './test-utils/cleanup';
import { setupGlobalHandleMonitoring } from './test-utils/handle-monitor';

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(async () => {
  cleanup();
  // Run all registered cleanup functions
  await runCleanups();
});

// Final cleanup to ensure no hanging resources
afterAll(async () => {
  // Final cleanup to ensure no leftover resources
  await runCleanups();
  clearCleanups();
});

// Setup global handle monitoring for resource leak detection
setupGlobalHandleMonitoring({
  verbose: process.env.DEBUG_TESTS === 'true',
  failOnLeaks: process.env.CI === 'true',
  timeout: 3000,
  ignoredHandles: ['STDIO', 'SIGNAL', 'PROCESS', 'TIMER']
});

// Set test timeout for async operations
beforeEach(() => {
  // Ensure console warnings don't clutter test output unless debugging
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (process.env.DEBUG_TESTS) {
      originalWarn(...args);
    }
  };
});

// Mock global objects that might be needed
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (_key: string) => null,
    setItem: (_key: string, _value: string) => {},
    removeItem: (_key: string) => {},
    clear: () => {},
    length: 0,
    key: (_index: number) => null,
  },
  writable: true,
});