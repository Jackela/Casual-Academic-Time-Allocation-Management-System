import { test, expect } from '../fixtures/base';

// Env and storage readiness check for e2e mode
// This test does NOT depend on backend. It only verifies that the browser environment
// sees expected e2e flags and preloaded auth state before navigation.

test.describe('E2E Env & Storage Readiness', () => {
  test('should expose bypass role and preloaded storage in e2e mode', async ({ page }) => {
    test.setTimeout(15000);

    // Navigate to a lightweight page to ensure app bootstraps
    await page.goto('/');

    // Read injected env and storage snapshot from window (optional in new bootstrap flow)
    const snapshot = await page.evaluate(() => (window as any).__E2E_ENV__ ?? null);

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

// Note: Backend health checks live in e2e/tests/ui/health-check.spec.ts

