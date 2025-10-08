import { afterEach, afterAll, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { runCleanups, clearCleanups } from './test-utils/cleanup';
import { setupGlobalHandleMonitoring } from './test-utils/handle-monitor';
import type { JestLikeUtils } from './types/vitest';

// Ensure Vite define flags exist in Vitest environment
const macroGlobals = globalThis as typeof globalThis & {
  __DEV_CREDENTIALS__?: boolean;
  __E2E_GLOBALS__?: boolean;
  __DEBUG_LOGGING__?: boolean;
  __TEST_UTILITIES__?: boolean;
  __PRODUCTION_BUILD__?: boolean;
  __STRIP_SENSITIVE_DATA__?: boolean;
};

const globalsWithJest = macroGlobals as typeof macroGlobals & { jest?: JestLikeUtils };

if (!globalsWithJest.jest) {
  globalsWithJest.jest = {
    fn: vi.fn,
    clearAllMocks: vi.clearAllMocks,
    resetAllMocks: vi.resetAllMocks,
    restoreAllMocks: vi.restoreAllMocks,
    spyOn: vi.spyOn,
    mocked: vi.mocked,
  };
}

if (macroGlobals.__DEV_CREDENTIALS__ === undefined) {
  macroGlobals.__DEV_CREDENTIALS__ = process.env.NODE_ENV === 'development';
}
if (macroGlobals.__E2E_GLOBALS__ === undefined) {
  macroGlobals.__E2E_GLOBALS__ = process.env.NODE_ENV === 'development' || process.env.VITE_E2E === 'true';
}
if (macroGlobals.__DEBUG_LOGGING__ === undefined) {
  macroGlobals.__DEBUG_LOGGING__ = process.env.NODE_ENV === 'development' || process.env.VITE_E2E === 'true';
}
if (macroGlobals.__TEST_UTILITIES__ === undefined) {
  macroGlobals.__TEST_UTILITIES__ = process.env.NODE_ENV !== 'production';
}
if (macroGlobals.__PRODUCTION_BUILD__ === undefined) {
  macroGlobals.__PRODUCTION_BUILD__ = process.env.NODE_ENV === 'production';
}
if (macroGlobals.__STRIP_SENSITIVE_DATA__ === undefined) {
  macroGlobals.__STRIP_SENSITIVE_DATA__ = process.env.NODE_ENV === 'production';
}

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
  console.warn = (...args: unknown[]) => {
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
    getItem: (key: string) => {
      void key;
      return null;
    },
    setItem: (key: string, value: string) => {
      void key;
      void value;
    },
    removeItem: (key: string) => {
      void key;
    },
    clear: () => {},
    length: 0,
    key: (index: number) => {
      void index;
      return null;
    },
  },
  writable: true,
});
