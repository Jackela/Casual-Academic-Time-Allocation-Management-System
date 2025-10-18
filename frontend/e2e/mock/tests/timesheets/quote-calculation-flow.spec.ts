import { test as base, expect } from '../../../fixtures/base';
import { DashboardPage } from '../../../shared/pages/DashboardPage';
import { TutorDashboardPage } from '../../../shared/pages/TutorDashboardPage';
import { setupMockAuth } from '../../../shared/mock-backend/auth';

const test = base;

test.describe('Timesheet quote flow', () => {
  test('requests quote on delivery hours and strips financial payload on submit', async ({ mockedPage }) => {
    const page = mockedPage;

    const quoteRequests: Array<Record<string, unknown>> = [];
    const quoteResponse = {
      taskType: 'TUTORIAL',
      rateCode: 'TU1',
      qualification: 'STANDARD',
      repeat: false,
      deliveryHours: 1,
      associatedHours: 2,
      payableHours: 3,
      hourlyRate: 65.77,
      amount: 197.31,
      formula: '1h delivery + 2h associated',
      clauseReference: 'Schedule 1, Item 1',
      sessionDate: '2025-03-03',
    };

    await page.route('**/api/timesheets/quote', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }

      let payload: Record<string, unknown>;
      try {
        payload = route.request().postDataJSON() as Record<string, unknown>;
      } catch {
        payload = {};
      }
      quoteRequests.push(payload);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(quoteResponse),
      });
    });

    const createPayloads: Array<Record<string, unknown>> = [];
    await page.route('**/api/timesheets', async (route) => {
      const method = route.request().method();
      if (method !== 'POST') {
        await route.fallback();
        return;
      }

      let payload: Record<string, unknown>;
      try {
        payload = route.request().postDataJSON() as Record<string, unknown>;
      } catch {
        payload = {};
      }
      createPayloads.push(payload);

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 999,
          ...payload,
          success: true,
        }),
      });
    });

    await setupMockAuth(page, 'tutor');

    const dashboardPage = new DashboardPage(page);
    const tutorDashboardPage = new TutorDashboardPage(page);

    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard');
    await dashboardPage.waitForDashboardReady();
    await tutorDashboardPage.waitForDashboardReady();

    await tutorDashboardPage.openCreateModal();

    const courseSelect = page.getByLabel('Course');
    await courseSelect.selectOption('1');

    const weekStartInput = page.getByLabel('Week Starting');
    await weekStartInput.fill('2025-03-03');

    const descriptionInput = page.getByLabel('Description');
    await descriptionInput.fill('Tutorial delivery and associated preparation');

    const hoursInput = page.getByLabel('Delivery Hours');
    await hoursInput.fill('1');
    await hoursInput.blur();

    await expect.poll(() => quoteRequests.length).toBeGreaterThan(0);
    const quotePayload = quoteRequests[0];
    expect(quotePayload).toMatchObject({
      tutorId: expect.any(Number),
      courseId: 1,
      taskType: 'TUTORIAL',
      qualification: 'STANDARD',
      repeat: false,
      deliveryHours: 1,
      sessionDate: '2025-03-03',
    });

    const submitButton = page.getByRole('button', { name: /Create Timesheet/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.focus();
    await page.keyboard.press('Enter');

    await expect.poll(() => createPayloads.length).toBeGreaterThan(0);
    const [submittedPayload] = createPayloads;

    expect(submittedPayload).not.toHaveProperty('amount');
    expect(submittedPayload).not.toHaveProperty('associatedHours');
    expect(submittedPayload).not.toHaveProperty('payableHours');

    expect(submittedPayload).toMatchObject({
      courseId: 1,
      hours: quoteResponse.payableHours,
      hourlyRate: quoteResponse.hourlyRate,
      deliveryHours: 1,
      taskType: 'TUTORIAL',
      qualification: 'STANDARD',
      repeat: false,
      sessionDate: quoteResponse.sessionDate,
      description: expect.stringContaining('Tutorial'),
    });
  });
});
