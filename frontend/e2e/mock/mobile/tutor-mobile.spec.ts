import { test } from '../../fixtures/base';
import { TutorDashboardPage } from '../../shared/pages/TutorDashboardPage';
// Mobile-only suite: collected only by the mobile-tests project via testMatch
test.describe('Tutor Dashboard Responsive Design', () => {
  test.describe.configure({ mode: 'serial' });

  test('Mobile view functionality @mobile', async ({ mockedPage: page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('domcontentloaded');

    await page.addInitScript(() => {
      const tutorAuth = {
        token: 'tutor-mock-token',
        user: { id: 201, email: 'tutor@example.com', name: 'John Doe', role: 'TUTOR' }
      };
      try {
        localStorage.setItem('token', tutorAuth.token);
        localStorage.setItem('user', JSON.stringify(tutorAuth.user));
      } catch {
        // Ignore storage errors when seeding auth for mobile tests
      }
    });

    const respPromise = page
      .waitForResponse(resp => resp.url().includes('/api/timesheets'))
      .catch(() => undefined);
    await page.goto('/dashboard');
    await respPromise.catch(() => undefined);

    const tutorDashboard = new TutorDashboardPage(page);
    await tutorDashboard.waitForDashboardReady({ timeout: 20000 });
    await tutorDashboard.expectMobileLayout();
    await tutorDashboard.expectResponsiveColumns();
  });
});


