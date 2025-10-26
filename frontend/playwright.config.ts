import { defineConfig } from '@playwright/test';
import { URL, fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { E2E_CONFIG } from './e2e/config/e2e.config';

const useExternalWebServer = !!process.env.E2E_EXTERNAL_WEBSERVER;
const frontendUrl = new URL(E2E_CONFIG.FRONTEND.URL);
const FRONTEND_PORT = process.env.E2E_FRONTEND_PORT || frontendUrl.port || '5174';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/e2e/examples/**'],
  testMatch: ['**/e2e/real/**/*.spec.ts'],
  /* Global setup to handle authentication */
  globalSetup: './e2e/real/global.setup.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1, // Retry once locally for flaky tests
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 4, // Limit workers for better stability
  /* Reporters: JSON + JUnit for machine readability */
  reporter: [
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/junit.xml' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: E2E_CONFIG.FRONTEND.URL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Increase timeout for API calls */
    actionTimeout: E2E_CONFIG.BACKEND.TIMEOUTS.API_REQUEST, // 10 seconds for actions
    navigationTimeout: E2E_CONFIG.FRONTEND.TIMEOUTS.NAVIGATION, // 10 seconds for navigation
    
    /* Add test info to help with debugging */
    ignoreHTTPSErrors: true,
    bypassCSP: true, // Bypass Content Security Policy
  },
  
  /* Global timeout for each test */
  timeout: 45000, // 45 seconds per test (reduced for faster feedback)
  
  /* Expect timeout */
  expect: {
    timeout: 5000, // 5 seconds for assertions
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'real',
      testDir: './e2e/real',
      retries: process.env.CI ? 2 : 1,
      fullyParallel: false,
      workers: 1,
      timeout: 60000,
      use: {
        // Prefer per-role admin storage state if present for admin-focused runs; fallback to shared state
        storageState: (() => {
          const preferred = path.resolve(__dirname, 'e2e/shared/.auth/admin.json');
          const fallback = path.resolve(__dirname, 'e2e/shared/.auth/storageState.json');
          try {
            return fs.existsSync(preferred) ? preferred : fallback;
          } catch {
            return fallback;
          }
        })(),
        baseURL: E2E_CONFIG.FRONTEND.URL,
      },
    },
  ],

  /* Auto-start dev server for E2E tests (disabled when external orchestrator provides it) */
  ...(useExternalWebServer
    ? {}
    : {
        webServer: {
          command: `npm run dev -- --mode e2e --host ${frontendUrl.hostname} --strictPort --port ${FRONTEND_PORT}`,
          url: E2E_CONFIG.FRONTEND.URL,
          reuseExistingServer: true,
          timeout: E2E_CONFIG.FRONTEND.TIMEOUTS.STARTUP,
          env: {
            ...process.env,
            E2E_FRONTEND_PORT: FRONTEND_PORT,
            // Propagate backend info for browser-side config resolution
            ...(process.env.E2E_BACKEND_PORT ? { E2E_BACKEND_PORT: process.env.E2E_BACKEND_PORT } : {}),
            ...(process.env.E2E_BACKEND_URL ? { E2E_BACKEND_URL: process.env.E2E_BACKEND_URL } : {}),
            // Also expose as Vite variable when used in browser (when defined)
            ...(process.env.VITE_API_BASE_URL ? { VITE_API_BASE_URL: process.env.VITE_API_BASE_URL } : {}),
          },
        },
      }),
});

