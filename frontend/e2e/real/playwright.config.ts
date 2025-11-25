import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment from .env files (frontend/.env.e2e preferred)
(() => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirnameShim = path.dirname(__filename);
  const root = path.resolve(__dirnameShim, '..', '..'); // points to frontend/
  const candidates = [
    '.env.e2e.local',
    '.env.e2e',
    '.env.local',
    '.env',
  ].map((p) => path.join(root, p));

  for (const file of candidates) {
    if (fs.existsSync(file)) {
      dotenv.config({ path: file });
      // Do not break; allow later files to override earlier if needed
    }
  }
})();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: '.',
  // Increase timeouts for stability under local dev and CI noise
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    baseURL: process.env.BASE_URL || process.env.E2E_FRONTEND_URL,
    // Only use a default storage state if the file exists; otherwise leave undefined
    storageState: (() => {
      const candidate = path.resolve(__dirname, '../shared/.auth/storageState.json');
      return fs.existsSync(candidate) ? candidate : undefined;
    })(),
  },
  projects: [
    {
      name: 'real',
      use: { ...devices['Desktop Chrome'] },
      // Run the real project with a single worker for stability (avoid page/context closure)
      workers: 1,
      // Exclude presentation tests - they require separate project config (no storageState)
      testIgnore: /presentation\/.*\.spec\.ts$/,
    },
    {
      name: 'presentation',
      use: {
        ...devices['Desktop Chrome'],
        // Presentation demos start logged out - no storageState
        storageState: undefined,
      },
      // Only run presentation demos in this project
      testMatch: /presentation\/.*\.spec\.ts$/,
      workers: 1,
    },
  ],
  outputDir: '../../test-results',
});
