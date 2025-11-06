import { test, expect } from '@playwright/test';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import { clearAuthSessionFromPage, signInAsRole } from '../../api/auth-helper';
import { DashboardPage } from '../../shared/pages/DashboardPage';
import { TutorDashboardPage } from '../../shared/pages/TutorDashboardPage';
import { statusLabel } from '../../utils/status-labels';

test.describe('@p1 US4: Modification & Rejection (aligned to current UI)', () => {
  let dataFactory: TestDataFactory;

  test.beforeEach(async ({ request }) => {
    dataFactory = await createTestDataFactory(request);
  });

  test.afterEach(async ({ page }) => {
    await clearAuthSessionFromPage(page);
    await dataFactory?.cleanupAll();
  });

  test('lecturer requests modification → tutor看到状态为 MODIFICATION_REQUESTED', async ({ page }) => {
    // 1) 种子：生成可由讲师处理的工单（TUTOR_CONFIRMED）
    const seeded = await dataFactory.createTimesheetForTest({ targetStatus: 'TUTOR_CONFIRMED' });

    // 2) 讲师发起“请求修改”（使用API保证确定性）
    await dataFactory.transitionTimesheet(seeded.id, 'REQUEST_MODIFICATION', 'Please adjust hours', 'LECTURER');

    // 3) 导师端查看到 MODIFICATION_REQUESTED 状态
    await signInAsRole(page, 'tutor');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const tutorDashboard = new TutorDashboardPage(page);
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForDashboardReady();
    await page
      .waitForResponse((r) => r.url().includes('/api/timesheets') && r.request().method() === 'GET')
      .catch(() => undefined);
    await expect(tutorDashboard.getStatusBadge(seeded.id)).toContainText(
      statusLabel('MODIFICATION_REQUESTED'),
      { timeout: 15000 },
    );
  });

  test('admin 拒绝后 → 导师看到 REJECTED 且不可再次提交', async ({ page, request }) => {
    // 1) 种子：生成已由讲师确认的工单（LECTURER_CONFIRMED）
    const seeded = await dataFactory.createTimesheetForTest({ targetStatus: 'LECTURER_CONFIRMED' });

    // 2) 管理员发起 REJECT（API 确定性）
    await dataFactory.transitionTimesheet(seeded.id, 'REJECT', 'Policy mismatch', 'ADMIN');

    // 3) 导师端查看 REJECTED 且无“提交”按钮
    await signInAsRole(page, 'tutor');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const tutorDashboard = new TutorDashboardPage(page);
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForDashboardReady();
    await page
      .waitForResponse((r) => r.url().includes('/api/timesheets') && r.request().method() === 'GET')
      .catch(() => undefined);
    await expect(tutorDashboard.getStatusBadge(seeded.id)).toContainText(
      statusLabel('REJECTED'),
      { timeout: 15000 },
    );
    const submitBtn = tutorDashboard.page.locator(`[data-testid="submit-btn-${seeded.id}"]`);
    await expect(submitBtn).toHaveCount(0);
  });
});
