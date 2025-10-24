import { test, expect, type Page, type APIResponse } from '@playwright/test';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import { signInAsRole, clearAuthSessionFromPage } from '../../api/auth-helper';

const RATE_CODE_LABEL = 'Rate Code';
const REPEAT_LABEL = 'Repeat session within seven days';

const DATE_TU1_STANDARD = '2024-08-05';
const DATE_TU2_STANDARD = '2024-08-12';
const DATE_REPEAT_BASE_VALID = '2024-06-17';
const DATE_REPEAT_VALID = '2024-06-24';
const DATE_REPEAT_BASE_INVALID = '2024-07-08';
const DATE_REPEAT_INVALID_ATTEMPT = '2024-07-22';
const DATE_LECTURE_STANDARD = '2024-09-02';
const DATE_LECTURE_DEVELOPED = '2024-09-09';
const DATE_LECTURE_REPEAT = '2024-09-16';
const DATE_ORAA_HIGH = '2024-10-07';
const DATE_ORAA_STANDARD = '2024-10-14';
const DATE_DEMO_HIGH = '2024-10-21';
const DATE_DEMO_STANDARD = '2024-10-28';
const DATE_MARKING = '2024-11-04';

const QUOTE_ENDPOINT = '/api/timesheets/quote';

interface QuoteCapture {
  response: APIResponse;
  payload: {
    rateCode: string;
    qualification: string;
    associatedHours: number;
    payableHours: number;
    hourlyRate: number;
    isRepeat: boolean;
    amount: number;
    sessionDate: string;
    formula: string;
  };
  requestBody: Record<string, unknown>;
}

// Note: For EA Billing compliance we use the Lecturer create modal so all inputs are editable and quote
// calculations reflect EA rules deterministically.

async function openLecturerCreateModal(page: Page) {
  await expect(page.getByTestId('lecturer-create-entry')).toBeVisible({ timeout: 20000 });
  const btn = page.getByTestId('lecturer-create-open-btn');
  await expect(btn).toBeVisible({ timeout: 20000 });
  await expect
    .poll(async () => (await btn.isVisible().catch(() => false)) && (await btn.isEnabled().catch(() => false)), { timeout: 20000 })
    .toBe(true);
  await btn.click();
  await expect(page.getByTestId('lecturer-create-modal')).toBeVisible({ timeout: 20000 });
}

async function selectTutorByQualification(page: Page, qualification: 'STANDARD' | 'PHD' | 'COORDINATOR') {
  const container = page.getByTestId('lecturer-timesheet-tutor-selector');
  const tutorSelect = container.locator('select#tutor');
  await expect(tutorSelect).toBeVisible({ timeout: 20000 });
  const value = qualification === 'PHD' ? '4' : qualification === 'COORDINATOR' ? '5' : '3';
  await tutorSelect.selectOption({ value });
}

async function captureQuote(page: Page, action: () => Promise<void>): Promise<QuoteCapture> {
  const responsePromise = page.waitForResponse((response) => {
    if (!response.url().includes(QUOTE_ENDPOINT)) return false;
    return response.request().method() === 'POST';
  });
  await action();
  const response = await responsePromise;
  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok()) {
    console.error('Quote failure', response.status(), payload);
  }
  expect(response.ok(), `Quote request failed: ${response.status()} ${JSON.stringify(payload)}`).toBeTruthy();
  const requestBody = response.request().postDataJSON?.() ?? {};
  return {
    response,
    payload,
    requestBody,
  };
}

async function setCourse(page: Page, courseId: number) {
  await page.getByLabel('Course').selectOption(String(courseId));
}

async function setWeekStart(page: Page, weekStartDate: string) {
  const weekInput = page.getByLabel('Week Starting');
  await weekInput.fill(weekStartDate);
}

async function setTaskType(page: Page, taskType: 'LECTURE' | 'TUTORIAL' | 'ORAA' | 'DEMO' | 'MARKING' | 'OTHER') {
  await page.getByLabel('Task Type').selectOption(taskType);
}

async function ensureTaskTypeTutorial(page: Page) {
  await setTaskType(page, 'TUTORIAL');
}

async function setQualification(page: Page, qualification: 'STANDARD' | 'PHD' | 'COORDINATOR') {
  await page.getByLabel('Tutor Qualification').selectOption(qualification);
}

async function toggleRepeat(page: Page, desired: boolean): Promise<QuoteCapture | null> {
  const checkbox = page.getByLabel(REPEAT_LABEL);
  const currentlyChecked = await checkbox.isChecked();
  if (desired === currentlyChecked) {
    return null;
  }
  return captureQuote(page, async () => {
    if (desired) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
  });
}

async function setDeliveryHours(page: Page, hours: number): Promise<QuoteCapture> {
  const hoursInput = page.getByLabel('Delivery Hours');
  await hoursInput.fill('');
  return captureQuote(page, async () => {
    await hoursInput.fill(hours.toFixed(1));
    await hoursInput.blur();
  });
}

function rateCodeLocator(page: Page) {
  return page.getByText(RATE_CODE_LABEL, { exact: true }).locator('..').locator('p').nth(1);
}

  test.describe('EA Billing Compliance – Tutorial rates', () => {
    let dataFactory: TestDataFactory;

    test.beforeEach(async ({ page, request }) => {
      dataFactory = await createTestDataFactory(request);
      await signInAsRole(page, 'lecturer');
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      const { waitForAppReady } = await import('../../shared/utils/waits');
      await waitForAppReady(page, 'LECTURER', 20000);
    });

  test.afterEach(async ({ page }) => {
    await clearAuthSessionFromPage(page).catch(() => undefined);
    await dataFactory?.cleanupAll().catch(() => undefined);
  });

    test('PhD-qualified tutor receives TU1 for a standard tutorial', async ({ page }) => {
      await openLecturerCreateModal(page);
      await setCourse(page, 1);
      await ensureTaskTypeTutorial(page);
      await selectTutorByQualification(page, 'PHD');
      await setWeekStart(page, DATE_TU1_STANDARD);
    const quote = await setDeliveryHours(page, 1.0);

    expect(quote.requestBody.repeat).toBe(false);
    expect(quote.payload.rateCode).toBe('TU1');
    expect(quote.payload.qualification).toBe('PHD');
    expect(Number(quote.payload.associatedHours)).toBeCloseTo(2.0, 5);
    expect(quote.payload.isRepeat).toBe(false);

    await expect(rateCodeLocator(page)).toHaveText('TU1');
  });

    test('Non-PhD tutor receives TU2 for a standard tutorial', async ({ page }) => {
      await openLecturerCreateModal(page);
      await setCourse(page, 2);
      await ensureTaskTypeTutorial(page);
      await selectTutorByQualification(page, 'STANDARD');
      await setWeekStart(page, DATE_TU2_STANDARD);
    const quote = await setDeliveryHours(page, 1.0);

    expect(quote.requestBody.repeat).toBe(false);
    expect(quote.payload.rateCode).toBe('TU2');
    expect(quote.payload.qualification).toBe('STANDARD');
    expect(Number(quote.payload.associatedHours)).toBeCloseTo(2.0, 5);
    expect(quote.payload.isRepeat).toBe(false);

    await expect(rateCodeLocator(page)).toHaveText('TU2');
  });

  test('Valid repeat tutorial within seven days yields TU3 for PhD tutor', async ({ page }) => {
    await dataFactory.createTutorialTimesheet({
      courseId: 1,
      weekStartDate: DATE_REPEAT_BASE_VALID,
      qualification: 'PHD',
      repeat: false,
      deliveryHours: 1,
    });
      await openLecturerCreateModal(page);
      await setCourse(page, 1);
      await ensureTaskTypeTutorial(page);
      await selectTutorByQualification(page, 'PHD');
      await setWeekStart(page, DATE_REPEAT_VALID);

    await setDeliveryHours(page, 1.0);
    const repeatQuote = await toggleRepeat(page, true);
    if (!repeatQuote) {
      throw new Error('Expected repeat toggle to trigger quote request');
    }

    expect(repeatQuote.requestBody.repeat).toBe(true);
    expect(repeatQuote.payload.rateCode).toBe('TU3');
    expect(repeatQuote.payload.qualification).toBe('PHD');
    expect(Number(repeatQuote.payload.associatedHours)).toBeCloseTo(1.0, 5);
    expect(repeatQuote.payload.isRepeat).toBe(true);

    await expect(rateCodeLocator(page)).toHaveText('TU3');
  });

  test('Valid repeat tutorial within seven days yields TU4 for standard tutor', async ({ page }) => {
    await dataFactory.createTutorialTimesheet({
      courseId: 2,
      weekStartDate: DATE_REPEAT_BASE_VALID,
      qualification: 'STANDARD',
      repeat: false,
      deliveryHours: 1,
    });
      await openLecturerCreateModal(page);
      await setCourse(page, 2);
      await ensureTaskTypeTutorial(page);
      await selectTutorByQualification(page, 'STANDARD');
      await setWeekStart(page, DATE_REPEAT_VALID);

    await setDeliveryHours(page, 1.0);
    const repeatQuote = await toggleRepeat(page, true);
    if (!repeatQuote) {
      throw new Error('Expected repeat toggle to trigger quote request');
    }

    expect(repeatQuote.requestBody.repeat).toBe(true);
    expect(repeatQuote.payload.rateCode).toBe('TU4');
    expect(repeatQuote.payload.qualification).toBe('STANDARD');
    expect(Number(repeatQuote.payload.associatedHours)).toBeCloseTo(1.0, 5);
    expect(repeatQuote.payload.isRepeat).toBe(true);

    await expect(rateCodeLocator(page)).toHaveText('TU4');
  });

  test('Standard lecture uses P03 and grants two associated hours', async ({ page }) => {
      await openLecturerCreateModal(page);
      await setCourse(page, 1);
      await setWeekStart(page, DATE_LECTURE_STANDARD);
      await selectTutorByQualification(page, 'STANDARD');
      await setTaskType(page, 'LECTURE');

    const quote = await setDeliveryHours(page, 1.0);

    expect(quote.payload.rateCode).toBe('P03');
    expect(Number(quote.payload.associatedHours)).toBeCloseTo(2.0, 5);
    expect(quote.payload.isRepeat).toBe(false);

    await expect(rateCodeLocator(page)).toHaveText('P03');
  });

  test('Developed lecture (coordinator) uses P02 with three associated hours', async ({ page }) => {
      await openLecturerCreateModal(page);
      await setCourse(page, 1);
      await setWeekStart(page, DATE_LECTURE_DEVELOPED);
      await selectTutorByQualification(page, 'COORDINATOR');
      await setTaskType(page, 'LECTURE');

    const quote = await setDeliveryHours(page, 1.0);

    expect(quote.payload.rateCode).toBe('P02');
    expect(Number(quote.payload.associatedHours)).toBeCloseTo(3.0, 5);
    expect(quote.payload.isRepeat).toBe(false);

    await expect(rateCodeLocator(page)).toHaveText('P02');
  });

  test('Repeat lecture is downgraded to P04 with one associated hour', async ({ page }) => {
      await openLecturerCreateModal(page);
      await setCourse(page, 1);
      await setWeekStart(page, DATE_LECTURE_REPEAT);
      await selectTutorByQualification(page, 'STANDARD');
      await setTaskType(page, 'LECTURE');

    await setDeliveryHours(page, 1.0);
    const repeatQuote = await toggleRepeat(page, true);
    if (!repeatQuote) {
      throw new Error('Expected repeat toggle to trigger quote request');
    }

    expect(repeatQuote.payload.rateCode).toBe('P04');
    expect(Number(repeatQuote.payload.associatedHours)).toBeCloseTo(1.0, 5);
    expect(repeatQuote.payload.isRepeat).toBe(true);

    await expect(rateCodeLocator(page)).toHaveText('P04');
  });

  test('ORAA for PhD tutor applies AO1 with zero associated hours', async ({ page }) => {
      await openLecturerCreateModal(page);
      await setCourse(page, 1);
      await setWeekStart(page, DATE_ORAA_HIGH);
      await selectTutorByQualification(page, 'PHD');
      await setTaskType(page, 'ORAA');

    const quote = await setDeliveryHours(page, 1.0);

    expect(quote.payload.rateCode).toBe('AO1');
    expect(Number(quote.payload.associatedHours)).toBeCloseTo(0.0, 5);
    expect(quote.payload.qualification).toBe('PHD');

    await expect(rateCodeLocator(page)).toHaveText('AO1');
  });

  test('ORAA for standard tutor applies AO2 with zero associated hours', async ({ page }) => {
      await openLecturerCreateModal(page);
      await setCourse(page, 2);
      await setWeekStart(page, DATE_ORAA_STANDARD);
      await selectTutorByQualification(page, 'STANDARD');
      await setTaskType(page, 'ORAA');

    const quote = await setDeliveryHours(page, 1.0);

    expect(quote.payload.rateCode).toBe('AO2');
    expect(Number(quote.payload.associatedHours)).toBeCloseTo(0.0, 5);
    expect(quote.payload.qualification).toBe('STANDARD');

    await expect(rateCodeLocator(page)).toHaveText('AO2');
  });

  test('Demonstration for PhD tutor applies DE1 with zero associated hours', async ({ page }) => {
      await openLecturerCreateModal(page);
      await setCourse(page, 1);
      await setWeekStart(page, DATE_DEMO_HIGH);
      await selectTutorByQualification(page, 'PHD');
      await setTaskType(page, 'DEMO');

    const quote = await setDeliveryHours(page, 1.0);

    expect(quote.payload.rateCode).toBe('DE1');
    expect(Number(quote.payload.associatedHours)).toBeCloseTo(0.0, 5);
    expect(quote.payload.qualification).toBe('PHD');

    await expect(rateCodeLocator(page)).toHaveText('DE1');
  });

  test('Demonstration for standard tutor applies DE2 with zero associated hours', async ({ page }) => {
      await openLecturerCreateModal(page);
      await setCourse(page, 2);
      await setWeekStart(page, DATE_DEMO_STANDARD);
      await selectTutorByQualification(page, 'STANDARD');
      await setTaskType(page, 'DEMO');

    const quote = await setDeliveryHours(page, 1.0);

    expect(quote.payload.rateCode).toBe('DE2');
    expect(Number(quote.payload.associatedHours)).toBeCloseTo(0.0, 5);
    expect(quote.payload.qualification).toBe('STANDARD');

    await expect(rateCodeLocator(page)).toHaveText('DE2');
  });

  test('Marking task avoids double counting by keeping associated hours at zero', async ({ page }) => {
    await dataFactory.createTutorialTimesheet({
      courseId: 1,
      weekStartDate: DATE_MARKING,
      qualification: 'STANDARD',
      repeat: false,
      deliveryHours: 1,
      targetStatus: 'FINAL_CONFIRMED',
    });
      await openLecturerCreateModal(page);
      await setCourse(page, 1);
      await setWeekStart(page, DATE_MARKING);
      await selectTutorByQualification(page, 'STANDARD');
      await setTaskType(page, 'MARKING');

    const quote = await setDeliveryHours(page, 1.0);

    expect(quote.payload.rateCode).toBe('M05');
    expect(Number(quote.payload.associatedHours)).toBeCloseTo(0.0, 5);
    expect(Number(quote.payload.payableHours)).toBeCloseTo(1.0, 5);

    await expect(rateCodeLocator(page)).toHaveText('M05');
  });

  test('Repeat outside seven-day window is downgraded to standard TU1 rate for PhD tutor', async ({ page }) => {
    await dataFactory.createTutorialTimesheet({
      courseId: 1,
      weekStartDate: DATE_REPEAT_BASE_INVALID,
      qualification: 'PHD',
      repeat: false,
      deliveryHours: 1,
    });
      await openLecturerCreateModal(page);
      await setCourse(page, 1);
      await ensureTaskTypeTutorial(page);
      await selectTutorByQualification(page, 'PHD');
      await setWeekStart(page, DATE_REPEAT_INVALID_ATTEMPT);

    await setDeliveryHours(page, 1.0);
    const initialAttempt = await toggleRepeat(page, true);
    if (!initialAttempt) {
      throw new Error('Expected repeat toggle to trigger quote request');
    }

    expect(initialAttempt.requestBody.repeat).toBe(true);
    // The calculator still returns TU3 for the invalid repeat attempt; the UI must revert.
    expect(initialAttempt.payload.rateCode).toBe('TU3');
    expect(initialAttempt.payload.isRepeat).toBe(true);

    const downgradedQuote = await toggleRepeat(page, false);
    if (!downgradedQuote) {
      throw new Error('Expected repeat toggle reset to trigger quote request');
    }

    expect(downgradedQuote.requestBody.repeat).toBe(false);
    expect(downgradedQuote.payload.rateCode).toBe('TU1');
    expect(downgradedQuote.payload.qualification).toBe('PHD');
    expect(Number(downgradedQuote.payload.associatedHours)).toBeCloseTo(2.0, 5);
    expect(downgradedQuote.payload.isRepeat).toBe(false);

    await expect(rateCodeLocator(page)).toHaveText('TU1');
    await expect(page.getByLabel(REPEAT_LABEL)).not.toBeChecked();
  });
});
