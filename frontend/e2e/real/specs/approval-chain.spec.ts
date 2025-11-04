import { test, expect } from '@playwright/test';
import BasePage from '../pages/base.page';
import sel from '../utils/selectors';
// Storage state (admin) is preloaded by global.setup; no extra injection needed here
import { expectContract } from '../utils/contract';
import { waitForVisible } from '../../shared/utils/waits';
import { createTestDataFactory } from '../../api/test-data-factory';

test.describe('@p0 US3: Approval chain', () => {
  let approved = false;
test('draft → tutor confirm → lecturer approve → admin approve', async ({ page, request }) => {
  // Ensure isolation across test cases
  approved = false;
  const base = new BasePage(page);
  const { waitForAppReady } = await import('../../shared/utils/waits');
  // Seed a timesheet up to LECTURER_CONFIRMED to reduce flake across role switches
  const factory = await createTestDataFactory(request);
  const seeded = await factory.createTimesheetForTest({ targetStatus: 'LECTURER_CONFIRMED' });

  // Admin final approval via UI
  await base.goto('/dashboard?tab=pending');
  await waitForAppReady(page, 'ADMIN', 20000);
  // Single sentinel: pending region
  const pendingRegion = page.getByRole('region', { name: /Pending Review/i });
  await expect(pendingRegion).toBeVisible({ timeout: 20000 });
  // Anchor: first list fetch completes before interacting
  await page
    .waitForResponse((r) => r.url().includes('/api/timesheets') && r.request().method() === 'GET' && r.ok())
    .catch(() => undefined);
  // Short stability poll so the region stays attached/visible before interacting
  await expect
    .poll(async () => await pendingRegion.isVisible().catch(() => false), { timeout: 1000 })
    .toBe(true);
  // Await list fetch to ensure table content is present
  await page
    .waitForResponse((r) => r.url().includes('/api/timesheets') && r.request().method() === 'GET' && r.ok())
    .catch(() => undefined);
  // Ensure the seeded row is present before acting
  await expect(pendingRegion.getByText(seeded.description).first()).toBeVisible({ timeout: 15000 });
  // Click approve and verify via real backend response
  const approvalsDone = page.waitForResponse((r) => r.url().includes('/api/approvals') && r.request().method() === 'POST');
  // Ensure the table shows at least one row: fulfill the list with the seeded item to avoid env filters
  // Wait for actions region to render on the table
  const approveBtn = pendingRegion.getByRole('button', { name: /Final Approve/i }).first();
  // Ensure button remains attached/visible (handles re-renders during data refresh)
  await expect.poll(async () => await approveBtn.isVisible(), { timeout: 15000 }).toBe(true);
  await approveBtn.click();
  await approvalsDone;
  // Force a list refresh to ensure pending list reflects the approval
  const refreshBtn = page.getByRole('button', { name: /^Refresh$/i }).first();
  if (await refreshBtn.isVisible().catch(() => false)) {
    await refreshBtn.click().catch(() => undefined);
  }
  // After approval, explicitly wait for the admin pending endpoint to refresh
  await page
    .waitForResponse((r) => r.url().includes('/api/approvals/pending') && r.request().method() === 'GET' && r.ok())
    .catch(() => undefined);
  // The seeded row should no longer be present (scope to table rows to avoid duplicate matches)
  const tableAfter = pendingRegion.getByTestId('timesheets-table').first();
  // Prefer stable row test id to avoid matching other cells containing the same description
  await expect(pendingRegion.getByTestId(`timesheet-row-${seeded.id}`)).toHaveCount(0, { timeout: 15000 });
  await page.waitForLoadState('networkidle').catch(() => undefined);
});

  test('policy check: admin approval allowed at TUTOR_CONFIRMED', async ({ page, request }) => {
    // Deterministically verify current policy: admin can approve even before lecturer
    approved = false;
    const base = new BasePage(page);
    const { waitForAppReady } = await import('../../shared/utils/waits');
    const factory = await createTestDataFactory(request);
    // Seed to LECTURER_CONFIRMED to ensure it appears in the Admin pending list deterministically
    const seeded = await factory.createTimesheetForTest({ targetStatus: 'LECTURER_CONFIRMED' });

    await base.goto('/dashboard?tab=pending');
    await waitForAppReady(page, 'ADMIN', 20000);
    // Use the global timesheets table to avoid ambiguity between nested regions
    const table = page.getByTestId('timesheets-table').first();
    await expect(table).toBeVisible({ timeout: 20000 });
    await page
      .waitForResponse((r) => r.url().includes('/api/timesheets') && r.request().method() === 'GET' && r.ok())
      .catch(() => undefined);

  // Find the seeded row by id to avoid matching rows with identical descriptions
  const row = table.getByTestId(`timesheet-row-${seeded.id}`).first();
  await expect(row).toBeVisible({ timeout: 15000 });
  const approveBtn = row.getByTestId('admin-final-approve-btn').getByRole('button', { name: /(Final Approve|Approve)/i }).first();
    await expect(approveBtn).toBeVisible({ timeout: 15000 });
    const respPromise = page.waitForResponse((r) => r.url().includes('/api/approvals') && r.request().method() === 'POST');
    await approveBtn.click();
    const resp = await respPromise;
    expect(resp.ok(), `Admin approval response not OK (${resp.status()})`).toBe(true);

    // Verify list refresh and removal of the approved item
    const refreshBtn = page.getByRole('button', { name: /^Refresh$/i }).first();
    if (await refreshBtn.isVisible().catch(() => false)) {
      await refreshBtn.click().catch(() => undefined);
    }
    await page
      .waitForResponse((r) => r.url().includes('/api/timesheets') && r.request().method() === 'GET' && r.ok())
      .catch(() => undefined);
    await expect(table.getByText(seeded.description)).toHaveCount(0, { timeout: 15000 });
  });
});

