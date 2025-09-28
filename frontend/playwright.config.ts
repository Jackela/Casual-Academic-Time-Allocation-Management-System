import { defineConfig, devices } from '@playwright/test';
import { E2E_CONFIG } from './e2e/config/e2e.config';

const useExternalWebServer = !!process.env.E2E_EXTERNAL_WEBSERVER;
const FRONTEND_PORT = process.env.E2E_FRONTEND_PORT || '5174';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/e2e/examples/**'],
  /* Global setup to handle authentication */
  globalSetup: './e2e/global.setup.ts',
  /* Allow skipping backend readiness from env for mocked-only runs */
  /* Note: The actual bypass is implemented in global.setup.ts via E2E_SKIP_BACKEND */
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1, // Retry once locally for flaky tests
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 4, // Limit workers for better stability
  /* Reporter to use. JSON-only for machine readability */
  reporter: [ ['json', { outputFile: 'playwright-report/results.json' }] ],
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
      name: 'api-tests',
      testMatch: ['**/e2e/api/**/*.spec.ts'],
      use: {
        baseURL: E2E_CONFIG.BACKEND.URL,
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
        },
      },
    },

    // Cross-browser UI testing - Chromium
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Enhanced configuration for cross-browser stability
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection'
          ]
        }
      },
      grepInvert: /@(mobile|mobile-smoke)/,
      testIgnore: ['**/e2e/mobile/**', '**/e2e/api/**', '**/e2e/examples/**', '**/e2e/tests/mobile-*.spec.ts', '**/e2e/api/*.spec.ts'],
    },

    // Cross-browser UI testing - Firefox
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox-specific configuration
        launchOptions: {
          firefoxUserPrefs: {
            'dom.webnotifications.enabled': false,
            'dom.push.enabled': false
          }
        }
      },
      grepInvert: /@(mobile|mobile-smoke)/,
      testIgnore: ['**/e2e/mobile/**', '**/e2e/api/**', '**/e2e/examples/**', '**/e2e/tests/mobile-*.spec.ts', '**/e2e/api/*.spec.ts'],
    },

    // Cross-browser UI testing - WebKit/Safari
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        // WebKit-specific configuration for better stability
        launchOptions: {
          args: [
            '--disable-web-security',
            '--allow-running-insecure-content'
          ]
        }
      },
      grepInvert: /@(mobile|mobile-smoke)/,
      testIgnore: ['**/e2e/mobile/**', '**/e2e/api/**', '**/e2e/examples/**', '**/e2e/tests/mobile-*.spec.ts', '**/e2e/api/*.spec.ts'],
    },

    // Dedicated mobile project with low concurrency
    {
      name: 'mobile-tests',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
        storageState: './e2e/.auth/tutor.storage-state.json'
      },
      fullyParallel: false,
      workers: 1,
      grep: /@mobile/,
      testMatch: ['**/e2e/mobile/**'],
    },
  ],

  /* Auto-start dev server for E2E tests (disabled when external orchestrator provides it) */
  ...(useExternalWebServer
    ? {}
    : {
        webServer: {
          command: `npm run dev -- --mode e2e --port ${FRONTEND_PORT}`,
          url: E2E_CONFIG.FRONTEND.URL,
          reuseExistingServer: !process.env.CI, // Reuse in dev, fresh in CI
          timeout: E2E_CONFIG.FRONTEND.TIMEOUTS.STARTUP,
          env: {
            ...process.env,
            ...(process.env.VITE_E2E_AUTH_BYPASS_ROLE
              ? { VITE_E2E_AUTH_BYPASS_ROLE: process.env.VITE_E2E_AUTH_BYPASS_ROLE }
              : {}),
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

