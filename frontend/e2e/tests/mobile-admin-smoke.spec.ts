import { test, expect } from '../fixtures/base';

// Local-only mobile smoke for Admin dashboard. Skipped on CI to keep pipeline stable.
if (process.env.CI) {
  test.skip(true, 'Skipped on CI to keep pipeline stable; runs locally with MSW');
}

test.describe('Mobile Admin Dashboard Smoke', () => {
  test('should render admin dashboard title on mobile @mobile-smoke', async ({ mockedPage: page }) => {
    test.setTimeout(45000);

    await page.setViewportSize({ width: 375, height: 812 });

    // Ensure admin auth
    await page.addInitScript(() => {
      const auth = { token: 'admin-mock-token', user: { id: 1, email: 'admin@example.com', name: 'Admin User', role: 'ADMIN' } } as any;
      try {
        localStorage.setItem('token', auth.token);
        localStorage.setItem('user', JSON.stringify(auth.user));
      } catch {}
    });

    await page.goto('/dashboard');

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

    await expect(page.getByTestId('main-content')).toBeVisible({ timeout: 15000 });
  });
});


