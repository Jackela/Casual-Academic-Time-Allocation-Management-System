import { defineConfig, devices } from '@playwright/test';
import { E2E_CONFIG } from './e2e/config/e2e.config';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Global setup to handle authentication */
  globalSetup: './e2e/global.setup.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1, // Retry once locally for flaky tests
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 4, // Limit workers for better stability
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { open: 'never' }], // Prevent HTML report from auto-opening and blocking shell
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/junit.xml' }], // For CI integration
    ['list'],
    ['github'] // GitHub Actions integration
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
      name: 'api-tests',
      use: { 
        ...devices['Desktop Chrome'],
        // No storage state needed - API-first approach
      },
    },

    {
      name: 'ui-tests',
      use: { 
        ...devices['Desktop Chrome'],
        // UI tests with mocked data
      },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Auto-start dev server for E2E tests */
  webServer: {
    command: 'npm run dev',
    url: E2E_CONFIG.FRONTEND.URL,
    reuseExistingServer: !process.env.CI,
    timeout: E2E_CONFIG.FRONTEND.TIMEOUTS.STARTUP,
  },
});