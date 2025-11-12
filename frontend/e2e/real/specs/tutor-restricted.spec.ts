import { test, expect } from '@playwright/test';
import BasePage from '../pages/base.page';
import sel from '../utils/selectors';
import { loginAsRole } from '../../api/auth-helper';
// Use shared storage state and per-spec seeding

test.describe('@p0 US2: Tutor restricted', () => {
  test('no access to create flow; message shown', async ({ page }) => {
    const session = await loginAsRole(page.request, 'tutor');
    await page.addInitScript((sess) => {
      try {
        localStorage.setItem('token', sess.token);
        localStorage.setItem('user', JSON.stringify(sess.user));
        const authWindow = window as Window & { __E2E_SET_AUTH__?: (payload: typeof sess) => void };
        authWindow.__E2E_SET_AUTH__?.(sess);
      } catch (error) {
        void error;
      }
    }, session);
    const base = new BasePage(page);
    await base.goto('/dashboard');
    const { waitForAppReady } = await import('../../shared/utils/waits');
    await waitForAppReady(page, 'TUTOR');

    // Tutor view should not show lecturer-specific create button
    await expect(sel.byTestId(page, 'lecturer-create-open-btn')).toHaveCount(0);

    // Deep link: redirect or message
    await page.goto('/timesheets/create');
    await expect(sel.byTestId(page, 'restriction-message')).toBeVisible({ timeout: 15000 });
  });
});
