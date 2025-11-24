import { test, expect } from '@playwright/test';
import { loginAsRole } from '../../api/auth-helper';
import { waitForAppReady } from '../../shared/utils/waits';

test.describe('Lecturer Create Timesheet – Unhappy Paths', () => {
  test('disables submit for invalid delivery hours (Lecture type)', async ({ page }) => {
    // Stabilize resources
    await page.context().route('**/api/courses?**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 1, name: 'E2E Course', code: 'E2E-101', active: true }]) });
    });
    await page.context().route('**/api/users?**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 3, email: 'tutor@example.com', name: 'John Doe', role: 'TUTOR', isActive: true, qualification: 'STANDARD', courseIds: [1] },
      ]) });
    });
    const session = await loginAsRole(page.request, 'lecturer');
    await page.addInitScript((sess) => {
      try {
        localStorage.setItem('token', (sess as any).token);
        localStorage.setItem('user', JSON.stringify((sess as any).user));
      } catch {}
    }, session);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page, 'LECTURER', 20000);

    await expect(page.getByTestId('lecturer-create-open-btn')).toBeVisible();
    await page.getByTestId('lecturer-create-open-btn').click();
    await expect(page.getByTestId('lecturer-create-modal')).toBeVisible({ timeout: 10000 });

    // Select course within the modal to avoid dashboard filter conflict
    const course = page.getByTestId('create-course-select');
    await expect(course).toBeVisible();
    await expect(course).toBeEnabled();
    await course.evaluate((el) => {
      const sel = el as HTMLSelectElement;
      if (!sel) return;
      if (sel.options.length > 1) sel.selectedIndex = 1;
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Switch task type to Lecture to allow editing hours
    await page.getByLabel('Task Type').selectOption('Lecture');
    const hours = page.getByLabel('Delivery Hours');
    await expect(hours).toBeEnabled();

    // Enter invalid hours beyond max and wait for error to render
    await hours.fill('999');
    await hours.blur();
    await expect(page.getByTestId('field-error-deliveryHours')).toBeVisible();
    const submit = page.getByTestId('lecturer-create-modal').getByRole('button', { name: 'Create Timesheet' });
    await expect(submit).toBeDisabled();
  });

  test('disables submit when week start is in the future', async ({ page }) => {
    // Stabilize resources
    await page.context().route('**/api/courses?**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 1, name: 'E2E Course', code: 'E2E-101', active: true }]) });
    });
    await page.context().route('**/api/users?**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 3, email: 'tutor@example.com', name: 'John Doe', role: 'TUTOR', isActive: true, qualification: 'STANDARD', courseIds: [1] },
      ]) });
    });
    const session = await loginAsRole(page.request, 'lecturer');
    await page.addInitScript((sess) => {
      try {
        localStorage.setItem('token', (sess as any).token);
        localStorage.setItem('user', JSON.stringify((sess as any).user));
      } catch {}
    }, session);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page, 'LECTURER', 20000);

    await page.getByTestId('lecturer-create-open-btn').click();
    await expect(page.getByTestId('lecturer-create-modal')).toBeVisible({ timeout: 10000 });

    // Select course within the modal
    const course2 = page.getByTestId('create-course-select');
    await expect(course2).toBeVisible({ timeout: 15000 });
    await expect(course2).toBeEnabled({ timeout: 15000 });
    // Wait for options to load before selecting
    await expect(course2.locator('option').nth(1)).toBeAttached({ timeout: 15000 });
    await course2.evaluate((el) => {
      const sel = el as HTMLSelectElement;
      if (!sel) return;
      if (sel.options.length > 1) sel.selectedIndex = 1;
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Fill week start to a future date (next year Jan 06 – a Monday)
    let wk = page.getByLabel('Week Starting');
    const wkVisible = await wk.isVisible().catch(() => false);
    if (!wkVisible) {
      wk = page.getByTestId('week-start-input').or(page.locator('input#weekStartDate'));
    }
    await expect(wk).toBeVisible({ timeout: 15000 });
    const nextYear = new Date().getFullYear() + 1;
    await wk.fill(`${nextYear}-01-06`);
    await wk.blur();
    // Wait for future-date error to render before asserting disabled (unified test id)
    await expect(page.getByTestId('field-error-weekStartDate')).toBeVisible();
    await expect(page.getByTestId('lecturer-create-modal').getByRole('button', { name: 'Create Timesheet' })).toBeDisabled();
  });
});
