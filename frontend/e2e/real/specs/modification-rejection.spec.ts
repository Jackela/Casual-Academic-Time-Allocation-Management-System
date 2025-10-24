import { test, expect } from '@playwright/test';
import BasePage from '../pages/base.page';
import sel from '../utils/selectors';

test.describe('@p1 US4: Modification & Rejection', () => {
  test('modification request shows banner + badge', async ({ page }) => {
    const base = new BasePage(page);
    await base.goto('/lecturer');
    await sel.byTestId(page, 'row-submitted-0').click();
    await sel.byTestId(page, 'btn-request-modification').click();
    await sel.byTestId(page, 'input-reason').fill('Please adjust hours');
    await sel.byTestId(page, 'btn-submit-reason').click();
    await expect(sel.byTestId(page, 'banner-modification')).toBeVisible();
    await expect(sel.byTestId(page, 'badge-status-modification')).toBeVisible();
  });

  test('rejection shows banner + badge', async ({ page }) => {
    const base = new BasePage(page);
    await base.goto('/admin');
    await sel.byTestId(page, 'row-awaiting-admin-0').click();
    await sel.byTestId(page, 'btn-reject').click();
    await sel.byTestId(page, 'input-reason').fill('Policy mismatch');
    await sel.byTestId(page, 'btn-submit-reason').click();
    await expect(sel.byTestId(page, 'banner-rejection')).toBeVisible();
    await expect(sel.byTestId(page, 'badge-status-rejected')).toBeVisible();
  });
});
