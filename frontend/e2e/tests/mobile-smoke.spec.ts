import { test, expect } from '../fixtures/base';

// Local-only by default. In CI, set E2E_ENABLE_MOBILE_SMOKE_IN_CI=true to enable.
if (process.env.CI && process.env.E2E_ENABLE_MOBILE_SMOKE_IN_CI !== 'true') {
  test.skip(true, 'Skipped on CI; enable with E2E_ENABLE_MOBILE_SMOKE_IN_CI=true');
}

test.describe('Mobile Dashboard Smoke', () => {
  test('should render dashboard title on mobile @mobile-smoke', async ({ mockedPage: page }) => {
    test.setTimeout(45000);

    // Mobile viewport and reduced motion are applied via global beforeEach for mobile-tests project
    await page.setViewportSize({ width: 375, height: 812 });

    // Ensure tutor auth
    await page.addInitScript(() => {
      const tutorAuth = { token: 'tutor-mock-token', user: { id: 201, email: 'tutor@example.com', name: 'John Doe', role: 'TUTOR' } } as any;
      try {
        localStorage.setItem('token', tutorAuth.token);
        localStorage.setItem('user', JSON.stringify(tutorAuth.user));
      } catch {}
    });

    // Navigate and wait for first data response if any
    const resp = page.waitForResponse(r => r.url().includes('/api/timesheets/me')).catch(() => undefined);
    await page.goto('/dashboard');
    await resp.catch(() => undefined);

    // Assert a user-visible, role-agnostic indicator without strict mode conflicts
    const mainTitle = page.getByTestId('main-dashboard-title');
    const fallbackTitle = page.getByTestId('dashboard-title');
    const layoutAnchor = page.getByTestId('dashboard-title-anchor');

    if (await mainTitle.count() > 0) {
      await expect(mainTitle.first()).toBeVisible({ timeout: 20000 });
    } else if (await fallbackTitle.count() > 0) {
      await expect(fallbackTitle.first()).toBeVisible({ timeout: 20000 });
    } else {
      await expect(layoutAnchor.first()).toBeVisible({ timeout: 20000 });
    }

    // Main content should be present as a secondary guard
    await expect(page.getByTestId('main-content')).toBeVisible({ timeout: 15000 });
  });
});


