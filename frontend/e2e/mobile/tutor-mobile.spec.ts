import { test, expect } from '../fixtures/base';
import { TutorDashboardPage } from '../pages/TutorDashboardPage';

// Mobile-only suite: collected only by the mobile-tests project via testMatch
test.describe('Tutor Dashboard Responsive Design', () => {
  test.describe.configure({ mode: 'serial' });

  test('Mobile view functionality @mobile', async ({ mockedPage: page }) => {
    const tutorDashboard = new TutorDashboardPage(page);

    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('domcontentloaded');

    await page.addInitScript(() => {
      const tutorAuth = {
        token: 'tutor-mock-token',
        user: { id: 201, email: 'tutor@example.com', name: 'John Doe', role: 'TUTOR' }
      } as any;
      try {
        localStorage.setItem('token', tutorAuth.token);
        localStorage.setItem('user', JSON.stringify(tutorAuth.user));
      } catch {}
    });

    const respPromise = page
      .waitForResponse(resp => resp.url().includes('/api/timesheets'))
      .catch(() => undefined);
    await page.goto('/dashboard');
    await respPromise.catch(() => undefined);

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
  });
});


