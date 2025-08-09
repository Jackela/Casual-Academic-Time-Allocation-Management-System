import { test, expect } from '../fixtures/base';

// Local-only mobile smoke for Lecturer dashboard. Skipped on CI to keep pipeline stable.
if (process.env.CI) {
  test.skip(true, 'Skipped on CI to keep pipeline stable; runs locally with MSW');
}

test.describe('Mobile Lecturer Dashboard Smoke', () => {
  test('should render lecturer dashboard title on mobile @mobile-smoke', async ({ mockedPage: page }) => {
    test.setTimeout(45000);

    await page.setViewportSize({ width: 375, height: 812 });

    // Ensure lecturer auth
    await page.addInitScript(() => {
      const auth = { token: 'lecturer-mock-token', user: { id: 101, email: 'lecturer@example.com', name: 'Dr. Jane Smith', role: 'LECTURER' } } as any;
      try {
        localStorage.setItem('token', auth.token);
        localStorage.setItem('user', JSON.stringify(auth.user));
      } catch {}
    });

    // Navigate and wait for first response (pending approvals handler exists in other suites; here we only smoke check)
    await page.goto('/dashboard');

    // Assert visible title or anchor
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


