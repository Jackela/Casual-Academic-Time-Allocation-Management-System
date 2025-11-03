import { test, expect } from '@playwright/test';

test.describe('Lecturer Create Timesheet – Unhappy Paths', () => {
  test('disables submit for invalid delivery hours (Lecture type)', async ({ page }) => {
    await page.goto('http://localhost:5174/login');
    await page.getByLabel('Email').fill('lecturer@example.com');
    await page.getByLabel('Password').fill('Lecturer123!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByRole('button', { name: 'Create Timesheet' })).toBeVisible();
    await page.getByRole('button', { name: 'Create Timesheet' }).click();

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

    // Enter invalid hours beyond max
    await hours.fill('999');
    await hours.blur();

    // Expect error message and disabled submit
    await expect(page.getByText(/Delivery hours must be between/i)).toBeVisible();
    const submit = page.getByTestId('lecturer-create-modal').getByRole('button', { name: 'Create Timesheet' });
    await expect(submit).toBeDisabled();
  });

  test('disables submit when week start is in the future', async ({ page }) => {
    await page.goto('http://localhost:5174/login');
    await page.getByLabel('Email').fill('lecturer@example.com');
    await page.getByLabel('Password').fill('Lecturer123!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.getByRole('button', { name: 'Create Timesheet' }).click();

    // Select course within the modal
    const course2 = page.getByTestId('create-course-select');
    await expect(course2).toBeVisible();
    await expect(course2).toBeEnabled();
    await course2.evaluate((el) => {
      const sel = el as HTMLSelectElement;
      if (!sel) return;
      if (sel.options.length > 1) sel.selectedIndex = 1;
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Fill week start to a future date (next year Jan 06 – a Monday)
    const wk = page.getByLabel('Week Starting');
    const nextYear = new Date().getFullYear() + 1;
    await wk.fill(`${nextYear}-01-06`);
    await wk.blur();

    await expect(page.getByText(/cannot be in the future/i)).toBeVisible();
    await expect(page.getByTestId('lecturer-create-modal').getByRole('button', { name: 'Create Timesheet' })).toBeDisabled();
  });
});
