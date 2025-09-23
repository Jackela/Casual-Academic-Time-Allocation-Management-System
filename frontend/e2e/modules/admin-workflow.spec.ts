import { test, expect } from '../fixtures/base';
import { LoginPage } from '../pages/LoginPage';
import { acquireAuthTokens, createTimesheetWithStatus, finalizeTimesheet, type AuthContext } from '../utils/workflow-helpers';

const uniqueDescription = (label: string) => `${label} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;

test.describe('Admin Dashboard Workflow', () => {
  let tokens: AuthContext;
  const seeded: number[] = [];

  test.beforeAll(async ({ request }) => {
    tokens = await acquireAuthTokens(request);
  });

  test.afterEach(async ({ request }) => {
    for (const id of seeded.splice(0)) {
      await finalizeTimesheet(request, tokens, id).catch(() => undefined);
    }
  });

  test('Admin can final approve lecturer confirmed timesheet', async ({ page, request }) => {
    const description = uniqueDescription('Admin Final Approve');
    const { id } = await createTimesheetWithStatus(request, tokens, {
      description,
      targetStatus: 'LECTURER_CONFIRMED'
    });
    seeded.push(id);

    const loginPage = new LoginPage(page);
    await loginPage.navigateTo();
    await loginPage.loginAsAdmin();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole('button', { name: 'Pending Review' }).click();
    const preset = page.getByTestId('filter-preset-pending-final');
    if (await preset.isVisible().catch(() => false)) {
      await preset.click();
    }

    const row = page.getByTestId(`timesheet-row-${id}`);
    await expect(row).toBeVisible({ timeout: 15000 });

    const approveButton = row.getByTestId(`approve-btn-${id}`);
    await expect(approveButton).toBeEnabled();
    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/approvals') && response.request().method() === 'POST'),
      approveButton.click()
    ]);

    const remainingRows = await row.count();
    if (remainingRows === 0) {
      await expect(page.getByTestId(`timesheet-row-${id}`)).toHaveCount(0);
    } else {
      await expect(row.getByTestId(`status-badge-${id}`)).toContainText(/Final Confirmed|HR Confirmed/i, { timeout: 10000 });
    }
  });

  test('Admin can reject lecturer confirmed timesheet with justification', async ({ page, request }) => {
    const description = uniqueDescription('Admin Reject');
    const { id } = await createTimesheetWithStatus(request, tokens, {
      description,
      targetStatus: 'LECTURER_CONFIRMED'
    });
    seeded.push(id);

    const loginPage = new LoginPage(page);
    await loginPage.navigateTo();
    await loginPage.loginAsAdmin();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole('button', { name: 'Pending Review' }).click();
    const preset = page.getByTestId('filter-preset-pending-final');
    if (await preset.isVisible().catch(() => false)) {
      await preset.click();
    }

    const row = page.getByTestId(`timesheet-row-${id}`);
    await expect(row).toBeVisible({ timeout: 15000 });

    const rejectButton = row.getByTestId(`reject-btn-${id}`);
    await rejectButton.click();

    await expect(page.getByText('Confirm Emergency Action')).toBeVisible();
    await page.getByLabel('Reason for rejection:').fill('Timesheet needs correction');

    const rejectionResponsePromise = page.waitForResponse((response) => response.url().includes('/api/approvals') && response.request().method() === 'POST');
    await Promise.all([
      rejectionResponsePromise,
      page.getByRole('button', { name: 'Confirm Action' }).click()
    ]);

    const rejectionResponse = await rejectionResponsePromise;
    expect(rejectionResponse.ok()).toBeTruthy();

    const remainingRows = await row.count();
    if (remainingRows === 0) {
      await expect(page.getByTestId(`timesheet-row-${id}`)).toHaveCount(0);
    } else {
      await expect(row.getByTestId(`status-badge-${id}`)).toContainText(/Rejected/i, { timeout: 10000 });
    }
  });

  test('Admin dashboard shows system overview metrics and filters', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigateTo();
    await loginPage.loginAsAdmin();

    await expect(page.getByTestId('system-overview-title')).toBeVisible();
    const filtersSection = page.getByTestId('filters-section');
    if (await filtersSection.count()) {
      await expect(filtersSection).toBeVisible();
    }
    await expect(page.getByTestId('total-timesheets-card')).toBeVisible();
    await expect(page.getByTestId('pending-approvals-card')).toBeVisible();
    await expect(page.getByTestId('total-hours-card')).toBeVisible();
    await expect(page.getByTestId('total-pay-card')).toBeVisible();
  });
});

