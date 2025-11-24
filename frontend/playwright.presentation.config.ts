import { defineConfig } from '@playwright/test';
import { E2E_CONFIG } from './e2e/config/e2e.config';
import { PRESENTATION_CONFIG } from './e2e/real/presentation/presentation.config';

/**
 * Playwright Configuration for Presentation Mode
 * 
 * Optimized for live thesis defense demonstrations with:
 * - True fullscreen display (F11 style)
 * - Configurable scaling for readability
 * - Slow motion for audience visibility
 * - Headed browser mode (visible for presentation)
 * - Single worker (sequential execution)
 * 
 * Usage:
 *   npx playwright test --config=playwright.presentation.config.ts --project=real
 */
export default defineConfig({
  testDir: './e2e/real/presentation',
  testMatch: ['**/presentation_demo_*.spec.ts', '**/presentation_grand_tour.spec.ts'],
  
  fullyParallel: false,
  workers: 1,
  
  timeout: 600000,
  
  globalSetup: './e2e/real/global.setup.ts',
  
  retries: 0,
  
  reporter: 'line',
  
  use: {
    baseURL: E2E_CONFIG.FRONTEND.URL,
    
    headless: false,
    
    viewport: null,
    
    launchOptions: {
      slowMo: PRESENTATION_CONFIG.browser.slowMo,
      
      args: [
        '--start-maximized',
        '--force-device-scale-factor=0.9',
        '--disable-blink-features=AutomationControlled',
      ],
    },
    
    actionTimeout: 30000,
    navigationTimeout: 30000,
    
    screenshot: 'off',
    video: 'off',
    trace: 'off',
    
    ignoreHTTPSErrors: true,
    bypassCSP: true,
  },
  
  expect: {
    timeout: 10000,
  },

  projects: [
    {
      name: 'real',
      testDir: './e2e/real/presentation',
      use: {
        channel: 'chrome',
        viewport: null,
        deviceScaleFactor: undefined,
      },
    },
  ],

  webServer: undefined,
});
