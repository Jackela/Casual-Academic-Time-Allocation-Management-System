import { test, expect } from '../fixtures/base';

// Env and storage readiness check for e2e mode
// This test does NOT depend on backend. It only verifies that the browser environment
// sees expected e2e flags and preloaded auth state before navigation.

test.describe('E2E Env & Storage Readiness', () => {
  test('should expose bypass role and preloaded storage in e2e mode', async ({ page }) => {
    test.setTimeout(15000);

    // Navigate to a lightweight page to ensure app bootstraps
    await page.goto('/');

    // Read injected env and storage snapshot from window
    const snapshot = await page.evaluate(() => (window as any).__E2E_ENV__ || null);

    // In non-e2e environments this may be null, but in our runs MODE=e2e is expected
    // Validate structure defensively
    expect(snapshot).toBeTruthy();
    expect(typeof snapshot?.mode === 'string' || snapshot?.mode === undefined).toBeTruthy();
    expect(typeof snapshot?.bypassRole === 'string' || snapshot?.bypassRole === undefined).toBeTruthy();

    // Storage should at least be an object with token/user fields (values may be null if not preloaded)
    expect(snapshot?.storage).toBeTruthy();
    expect(Object.prototype.hasOwnProperty.call(snapshot.storage, 'token')).toBeTruthy();
    expect(Object.prototype.hasOwnProperty.call(snapshot.storage, 'user')).toBeTruthy();
  });
});

// Note: Backend health checks live in e2e/tests/ui/health-check.spec.ts