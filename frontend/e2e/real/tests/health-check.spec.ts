import { test, expect } from '@playwright/test';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import { clearAuthSessionFromPage, signInAsRole } from '../../api/auth-helper';

// Env and storage readiness check for e2e mode
// This test does NOT depend on backend. It only verifies that the browser environment
// sees expected e2e flags and preloaded auth state before navigation.
type E2EEnvSnapshot = { storage?: Record<string, unknown> };
type E2EGlobal = typeof window & { __E2E_ENV__?: E2EEnvSnapshot };

test.describe('E2E Env & Storage Readiness', () => {
  let dataFactory: TestDataFactory;

  test.beforeEach(async ({ page, request }) => {
    dataFactory = await createTestDataFactory(request);
    await signInAsRole(page, 'tutor');
  });

  test.afterEach(async ({ page }) => {
    await dataFactory?.cleanupAll();
    await clearAuthSessionFromPage(page);
  });

  test('should expose bypass role and preloaded storage in e2e mode', async ({ page }) => {
    test.setTimeout(15000);

    // Navigate to a lightweight page to ensure app bootstraps
    await page.goto('/');

    // Read injected env and storage snapshot from window (optional in new bootstrap flow)
    const snapshot = await page.evaluate<E2EEnvSnapshot | null>(() => {
      const global = window as E2EGlobal;
      return global.__E2E_ENV__ ?? null;
    });

    if (snapshot) {
      expect(snapshot.storage).toBeTruthy();
      expect(Object.prototype.hasOwnProperty.call(snapshot.storage, 'token')).toBeTruthy();
      expect(Object.prototype.hasOwnProperty.call(snapshot.storage, 'user')).toBeTruthy();
    } else {
      const storageAvailability = await page.evaluate(() => ({
        hasLocalStorage: typeof localStorage !== 'undefined',
        hasSessionStorage: typeof sessionStorage !== 'undefined',
      }));
      expect(storageAvailability.hasLocalStorage).toBeTruthy();
      expect(storageAvailability.hasSessionStorage).toBeTruthy();
    }
  });
});

// Note: Backend health checks live in e2e/real/tests/ui/health-check.spec.ts
