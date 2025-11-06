import { test, expect } from '@playwright/test'
import { createTestDataFactory } from '../../api/test-data-factory'
import { signInAsRole, clearAuthSessionFromPage } from '../../api/auth-helper'

test.describe('Admin Final Approval (UI, real backend)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsRole(page, 'admin')
  })

  test.afterEach(async ({ page }) => {
    await clearAuthSessionFromPage(page)
  })

  test('approves seeded lecturer-confirmed row via UI', async ({ page, request }) => {
    const factory = await createTestDataFactory(request)
    // Seed to lecturer-confirmed so admin can perform final approval
    const seeded = await factory.createTimesheetForTest({ targetStatus: 'LECTURER_CONFIRMED' })

    await page.goto('/dashboard?tab=pending', { waitUntil: 'domcontentloaded' })

    // Locate the seeded row by data-testid
    const row = page.getByTestId(`timesheet-row-${seeded.id}`)
    await expect(row).toBeVisible({ timeout: 20000 })

    // Find the Final Approve button within the row
    const approveBtn = row.getByRole('button', { name: /Final Approve/i }).first()
    await expect(approveBtn).toBeVisible({ timeout: 15000 })

    const approvalsDone = page.waitForResponse(
      (r) => r.url().includes('/api/approvals') && r.request().method() === 'POST'
    )
    await approveBtn.click()
    await approvalsDone

    // Wait for the pending list to refetch after approval (double anchor for stability)
    await page
      .waitForResponse((r) => r.url().includes('/api/approvals/pending') && r.request().method() === 'GET' && r.ok())
      .catch(() => undefined)
    await page
      .waitForResponse((r) => r.url().includes('/api/approvals/pending') && r.request().method() === 'GET')
      .catch(() => undefined)

    // Button/row should disappear
    await expect
      .poll(async () => await approveBtn.isVisible().catch(() => false), { timeout: 15000 })
      .toBe(false)
    // Also assert row id removal for extra stability
    await expect
      .poll(async () => await page.getByTestId(`timesheet-row-${seeded.id}`).count().catch(() => 0), { timeout: 30000 })
      .toBe(0)

    // Success banner observation (stable id from Admin shell)
    const successBanner = page.getByTestId('approval-success-banner').first()
    await successBanner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined)
  })
})

