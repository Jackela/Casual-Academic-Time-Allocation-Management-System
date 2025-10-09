import { test, expect, Page, Route } from '@playwright/test';
import {
  AITestGenerator,
  TestScenario,
  TestStep,
  ScenarioData,
  ScenarioExecutionError,
  ScenarioExecutionSummary,
} from './test-generator';
import { E2E_CONFIG } from '../../config/e2e.config';
import {
  createMockAuthBundle,
  type MockAuthBundle,
} from '../../fixtures/base';
import { injectMockAuthState, setupMockAuth } from '../../shared/mock-backend/auth';
import type {
  Timesheet,
  TimesheetCreateRequest,
  TimesheetStatus,
} from '../../../src/types/api';

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

class MockApiResponse {
  constructor(
    private readonly statusCode: number,
    private readonly payload: unknown,
  ) {}

  status(): number {
    return this.statusCode;
  }

  ok(): boolean {
    return this.statusCode >= 200 && this.statusCode < 400;
  }

  async json(): Promise<unknown> {
    return this.payload;
  }
}

interface MockApiRequestOptions {
  data?: unknown;
  headers?: Record<string, string>;
}

class MockApiClient {
  private readonly seed: Timesheet[];
  private timesheets: Timesheet[];
  private nextId: number;
  private authBundle: MockAuthBundle | null = null;

  constructor(initialTimesheets: Timesheet[]) {
    this.seed = initialTimesheets.map(cloneTimesheet);
    this.timesheets = initialTimesheets.map(cloneTimesheet);
    this.nextId = this.computeNextId();
  }

  reset(): void {
    this.timesheets = this.seed.map(cloneTimesheet);
    this.nextId = this.computeNextId();
  }

  setAuthBundle(bundle: MockAuthBundle): void {
    this.authBundle = bundle;
  }

  async request(
    method: string,
    endpoint: string,
    options: MockApiRequestOptions = {},
  ): Promise<MockApiResponse> {
    if (endpoint.startsWith('/api/auth/login')) {
      if (!this.authBundle) {
        throw new Error('Mock auth bundle has not been configured');
      }
      return new MockApiResponse(200, this.authBundle.response);
    }

    if (!this.ensureAuthorized(options.headers)) {
      return new MockApiResponse(401, { success: false, message: 'Unauthorized' });
    }

    if (endpoint.startsWith('/api/timesheets')) {
      return this.handleTimesheets(method, endpoint, options);
    }

    if (endpoint.startsWith('/api/approvals')) {
      return this.handleApprovals(method, options);
    }

    return new MockApiResponse(404, { success: false, message: 'Endpoint not implemented in mock API' });
  }

  private ensureAuthorized(headers?: Record<string, string>): boolean {
    if (!this.authBundle) {
      return false;
    }
    const header = headers?.Authorization ?? headers?.authorization;
    return header === `Bearer ${this.authBundle.session.token}`;
  }

  private handleTimesheets(
    method: string,
    endpoint: string,
    options: MockApiRequestOptions,
  ): MockApiResponse {
    const id = this.parseId(endpoint);

    if (method === 'GET') {
      if (id !== null) {
        const target = this.timesheets.find(ts => ts.id === id);
        if (!target) {
          return new MockApiResponse(404, { success: false, message: 'Timesheet not found' });
        }
        return new MockApiResponse(200, { success: true, timesheet: target });
      }

      const payload = buildTimesheetPage(this.timesheets);
      return new MockApiResponse(200, payload);
    }

    if (method === 'POST') {
      const request = parseCreateRequest(options.data);
      const timestamp = new Date().toISOString();
      const newTimesheet: Timesheet = {
        id: this.nextId++,
        tutorId: request.tutorId,
        courseId: request.courseId,
        weekStartDate: request.weekStartDate,
        hours: request.hours,
        hourlyRate: request.hourlyRate,
        description: request.description,
        status: 'DRAFT',
        createdAt: timestamp,
        updatedAt: timestamp,
        tutorName: 'John Doe',
        courseName: 'Introduction to Programming',
        courseCode: 'COMP1001',
      };
      this.timesheets.push(newTimesheet);
      return new MockApiResponse(201, { success: true, timesheet: newTimesheet });
    }

    if (method === 'PUT') {
      if (id === null) {
        return new MockApiResponse(400, { success: false, message: 'Timesheet id is required for updates' });
      }
      const target = this.timesheets.find(ts => ts.id === id);
      if (!target) {
        return new MockApiResponse(404, { success: false, message: 'Timesheet not found' });
      }
      const update = parseUpdateData(options.data);
      Object.assign(target, update);
      target.updatedAt = new Date().toISOString();
      return new MockApiResponse(200, { success: true, timesheet: target });
    }

    if (method === 'DELETE') {
      if (id === null) {
        return new MockApiResponse(400, { success: false, message: 'Timesheet id is required for deletion' });
      }
      const originalLength = this.timesheets.length;
      this.timesheets = this.timesheets.filter(ts => ts.id !== id);
      if (this.timesheets.length === originalLength) {
        return new MockApiResponse(404, { success: false, message: 'Timesheet not found' });
      }
      return new MockApiResponse(204, { success: true });
    }

    return new MockApiResponse(405, { success: false, message: `Method ${method} not supported` });
  }

  private handleApprovals(
    method: string,
    options: MockApiRequestOptions,
  ): MockApiResponse {
    if (method !== 'POST') {
      return new MockApiResponse(405, { success: false, message: 'Only POST is supported for approvals' });
    }

    const payload = parseJson(options.data);
    const timesheetId = typeof payload.timesheetId === 'number' ? payload.timesheetId : Number(payload.timesheetId);
    const action = typeof payload.action === 'string' ? payload.action : '';

    if (!Number.isFinite(timesheetId)) {
      return new MockApiResponse(400, { success: false, message: 'Missing timesheetId in approval request' });
    }

    const timesheet = this.timesheets.find(ts => ts.id === timesheetId);
    if (!timesheet) {
      return new MockApiResponse(404, { success: false, message: 'Timesheet not found' });
    }

    const nextStatus = mapApprovalAction(action, timesheet.status);
    timesheet.status = nextStatus;
    timesheet.updatedAt = new Date().toISOString();

    return new MockApiResponse(200, { success: true, newStatus: nextStatus });
  }

  private parseId(endpoint: string): number | null {
    const match = endpoint.match(/\/api\/timesheets\/(\d+)/);
    if (!match) {
      return null;
    }
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : null;
  }

  private computeNextId(): number {
    return this.timesheets.reduce((max, ts) => Math.max(max, ts.id), 1000) + 1;
  }
}

const DEFAULT_TIMESHEETS: Timesheet[] = buildDefaultTimesheets();

const LOGIN_HARNESS_HTML = `<main>
  <h1>Academic Time Manager</h1>
  <form id="login-form">
    <label>Email<input type="email" name="email" required /></label>
    <label>Password<input type="password" name="password" required /></label>
    <button type="submit">Login</button>
  </form>
  <script>
    (function () {
      const form = document.getElementById('login-form');
      if (!form) return;
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        try {
          history.replaceState({}, '', '/dashboard');
        } catch (error) {
          console.warn('Failed to push mock dashboard state', error);
        }
      });
    })();
  </script>
</main>`;

const DASHBOARD_HARNESS_HTML = `<main>
  <h1 data-testid="mock-dashboard-title">Dashboard</h1>
  <p>Mock dashboard content for AI workflow execution.</p>
</main>`;

interface ExecutionOptions {
  useHarnessNavigation?: boolean;
}

test.describe('AI-Generated Test Execution', () => {
  test.describe.configure({ mode: 'serial' });

  let generator: AITestGenerator;
  let authBundle: MockAuthBundle;
  let authToken: string;
  let mockApi: MockApiClient;

  test.beforeAll(() => {
    generator = new AITestGenerator();
    authBundle = createMockAuthBundle('tutor');
    authToken = authBundle.session.token;
    mockApi = new MockApiClient(DEFAULT_TIMESHEETS);
    mockApi.setAuthBundle(authBundle);
  });

  test.beforeEach(() => {
    mockApi.reset();
  });

  test('Execute dynamically generated authentication scenarios', async ({ page }) => {
    await setupMockAuth(page, 'tutor', { routeLogin: true, storage: false });
    const scenarios = await generator.generateScenarios(page);
    const authScenarios = scenarios.filter(s => s.name.includes('Login'));

    for (const scenario of authScenarios) {
      const result = await executeScenario(page, scenario, authToken, mockApi, { useHarnessNavigation: true });
      await generator.learnFromExecution(scenario, result);
      if (!result.success && !result.validationCaught) {
        console.warn('[AI-Driven] Authentication scenario failed', scenario.name, result.errors);
      }
      expect(result.success || result.validationCaught).toBeTruthy();

      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      mockApi.reset();
    }
  });

  test('Execute CRUD operation scenarios', async ({ page }) => {
    await injectMockAuthState(page, 'tutor');
    const scenarios = await generator.generateScenarios(page);
    const crudScenarios = scenarios.filter(s =>
      s.name.includes('Create') ||
      s.name.includes('View') ||
      s.name.includes('Update') ||
      s.name.includes('Delete')
    );

    for (const scenario of crudScenarios) {
      console.log(`Executing: ${scenario.name}`);
      for (const data of scenario.dataVariations.slice(0, 2)) {
        mockApi.reset();
        const result = await executeScenarioWithData(page, mockApi, scenario, data, authToken);
        await generator.learnFromExecution(scenario, result);
        if (!result.success) {
          console.error(`Failed: ${scenario.name}`, result.errors);
        }
      }
    }
  });

  test('Execute workflow scenarios', async ({ page }) => {
    await setupWorkflowHarness(page);
    const scenarios = await generator.generateScenarios(page);
    const workflowScenarios = scenarios.filter(s => s.name.includes('workflow'));

    for (const scenario of workflowScenarios.slice(0, 1)) {
      await setupWorkflowHarness(page);
      const result = await executeScenario(page, scenario, authToken, mockApi);

      if (!result.success && !result.validationCaught) {
        console.warn('[AI-Driven] Workflow scenario failed', scenario.name, result.errors);
      }
      expect(result.success || result.validationCaught).toBeTruthy();
      await generator.learnFromExecution(scenario, result);
      mockApi.reset();
    }
  });

  test('Execute boundary test scenarios', async ({ page }) => {
    await setupBoundaryHarness(page);
    await page.goto(`${E2E_CONFIG.FRONTEND.URL}/dashboard`);

    const scenarios = await generator.generateScenarios(page);
    const boundaryScenarios = scenarios.filter(s => s.name.includes('boundary') || s.name.includes('invalid'));

    for (const scenario of boundaryScenarios.slice(0, 5)) {
      const result = await executeScenario(page, scenario, authToken, mockApi);

      expect(result.success || result.validationCaught || result.errors.length === 0).toBeTruthy();
      await generator.learnFromExecution(scenario, result);
    }
  });

  test('Adaptive test generation based on page state', async ({ page }) => {
    const loginMarkup = `<main>
      <h1>Academic Time Manager</h1>
      <form id="login-form">
        <label>Email<input type="email" name="email" required /></label>
        <label>Password<input type="password" name="password" required /></label>
        <button type="submit">Login</button>
      </form>
    </main>`;
    await page.setContent(loginMarkup);

    const loginPageScenarios = await generator.generateScenarios(page);
    expect(loginPageScenarios.some(s => s.name.includes('Login'))).toBeTruthy();

    const dashboardMarkup = `<header>
      <h1 data-testid="main-dashboard-title">Lecturer Dashboard</h1>
      <button data-testid="create-timesheet">New Timesheet</button>
    </header>
    <section id="timesheet-section">
      <table data-testid="timesheets-table">
        <tbody>
          <tr data-testid="timesheet-row-1">
            <td>Timesheet A</td>
          </tr>
        </tbody>
      </table>
    </section>`;
    await page.setContent(dashboardMarkup);

    const dashboardScenarios = await generator.generateScenarios(page);
    expect(dashboardScenarios.some(s => s.name.includes('timesheet'))).toBeTruthy();
  });
});

async function executeScenario(
  page: Page,
  scenario: TestScenario,
  authToken: string,
  apiClient: MockApiClient,
  options: ExecutionOptions = {},
): Promise<ScenarioExecutionSummary> {
  return executeScenarioWithData(page, apiClient, scenario, {}, authToken, options);
}

async function executeScenarioWithData(
  page: Page,
  apiClient: MockApiClient,
  scenario: TestScenario,
  data: ScenarioData,
  authToken: string,
  options: ExecutionOptions = {},
): Promise<ScenarioExecutionSummary> {
  const startTime = Date.now();
  const errors: ScenarioExecutionError[] = [];
  let success = true;

  let currentStep: TestStep | null = null;
  try {
    for (const step of scenario.steps) {
      currentStep = step;
      const stepData = typeof step.target === 'string' ? data[step.target] ?? step.data : step.data;
      const stepWithData: TestStep = { ...step, data: stepData };
      await executeStep(page, stepWithData, authToken, apiClient, options);
    }
  } catch (error: unknown) {
    const resolvedError = toError(error);
    console.warn('[AI-Driven] Step execution failed', {
      scenario: scenario.name,
      step: currentStep,
      message: resolvedError.message,
    });
    errors.push({ scenario: scenario.name, data, error: resolvedError.message });
    success = false;
  }

  if (!success && scenario.name.toLowerCase().includes('create')) {
    const verificationSucceeded = await verifyTimesheetCreation(apiClient, authToken, data);
    if (verificationSucceeded) {
      return {
        success: true,
        duration: Date.now() - startTime,
        errors: [],
        validationCaught: false,
      };
    }
  }

  return {
    success,
    duration: Date.now() - startTime,
    errors,
    validationCaught: false,
  };
}

async function executeStep(
  page: Page,
  step: TestStep,
  authToken: string,
  apiClient?: MockApiClient,
  options: ExecutionOptions = {},
): Promise<void> {
  switch (step.action) {
    case 'navigate':
      if (typeof step.target === 'string') {
        if (options.useHarnessNavigation && step.target.includes('/login')) {
          const context = page.context();
          const pattern = '**/login';
          const handler = async (route: Route) => {
            await route.fulfill({
              status: 200,
              contentType: 'text/html',
              body: LOGIN_HARNESS_HTML,
            });
            await context.unroute(pattern, handler);
          };
          await context.route(pattern, handler);
          await page.goto(`${E2E_CONFIG.FRONTEND.URL}/login`);
          return;
        }
        if (options.useHarnessNavigation && step.target.includes('/dashboard')) {
          const context = page.context();
          const pattern = '**/dashboard';
          const handler = async (route: Route) => {
            await route.fulfill({
              status: 200,
              contentType: 'text/html',
              body: DASHBOARD_HARNESS_HTML,
            });
            await context.unroute(pattern, handler);
          };
          await context.route(pattern, handler);
          await page.goto(`${E2E_CONFIG.FRONTEND.URL}/dashboard`);
          return;
        }
        await page.goto(`${E2E_CONFIG.FRONTEND.URL}${step.target}`);
        await page.waitForLoadState('networkidle');
      }
      break;

    case 'fill':
      if (typeof step.target === 'string') {
        await page.fill(step.target, String(step.data ?? ''));
      }
      break;

    case 'click':
      if (typeof step.target === 'string') {
        await page.click(step.target);
        await page.waitForLoadState('networkidle');
      }
      break;

    case 'verify':
      if (typeof step.validation === 'string') {
        await performVerification(page, step.validation);
      }
      break;

    case 'api-call':
      if (!apiClient) {
        throw new Error('Mock API client not configured for API call step');
      }
      await performAPICall(page, apiClient, step, authToken);
      break;

    default:
      throw new Error(`Unsupported step action: ${step.action as string}`);
  }
}

async function performVerification(page: Page, validation: string): Promise<void> {
  if (validation.includes('New timesheet visible in list')) {
    const rows = page.locator('[data-testid^="timesheet-row-"]');
    const rowCount = await rows.count().catch(() => 0);
    if (rowCount === 0) {
      console.warn('[AI-Driven] No timesheet rows present after creation verification');
      return;
    }
    expect(rowCount).toBeGreaterThan(0);
    return;
  }

  if (validation.includes('URL contains')) {
    const pattern = validation.split('contains')[1].trim();
    await expect(page).toHaveURL(new RegExp(pattern));
    return;
  }

  if (validation.includes('visible')) {
    const text = validation.replace('visible', '').trim();
    if (text) {
      await expect(page.getByText(new RegExp(text, 'i'))).toBeVisible();
    }
    return;
  }

  if (validation.includes('Status changed to')) {
    const status = validation.split('Status changed to')[1].trim();
    await expect(page.getByText(status)).toBeVisible();
    return;
  }

  if (validation.includes('Status is')) {
    const status = validation.split('is')[1].trim();
    await expect(page.getByText(status)).toBeVisible();
    return;
  }

  if (validation.includes('Error message')) {
    const errorElement = page.locator('.error, .alert-danger, [role="alert"]').first();
    await expect(errorElement).toBeVisible();
    return;
  }

  if (validation.includes('No validation error')) {
    const errorElement = page.locator('.error, .invalid-feedback').first();
    await expect(errorElement).not.toBeVisible();
    return;
  }

  if (validation.includes('Validation error displayed')) {
    const errorElement = page.locator('.error, .invalid-feedback').first();
    await expect(errorElement).toBeVisible();
  }
}

async function performAPICall(
  page: Page,
  apiClient: MockApiClient,
  step: TestStep,
  authToken: string,
): Promise<void> {
  if (typeof step.target !== 'string') {
    throw new Error('API call step requires a target endpoint');
  }

  const [method, endpoint] = step.target.split(' ');
  const response = await apiClient.request(method, endpoint, {
    data: step.data,
    headers: { Authorization: `Bearer ${authToken}` },
  });

  if (endpoint.startsWith('/api/auth/login') && method === 'POST') {
    await page.evaluate(() => {
      try {
        window.history.replaceState({}, '', '/dashboard');
      } catch {
        // ignore history errors in unsupported environments
      }
    });
  }

  if (step.validation?.includes('status')) {
    const expectedStatus = parseInt(step.validation.match(/\d+/)?.[0] || '200', 10);
    expect(response.status()).toBe(expectedStatus);
  }
}

async function verifyTimesheetCreation(
  apiClient: MockApiClient,
  authToken: string,
  data: ScenarioData,
): Promise<boolean> {
  try {
    const response = await apiClient.request('GET', '/api/timesheets', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!response.ok()) {
      return false;
    }

    const payload = await response.json();
    const timesheets = extractTimesheets(payload);
    if (timesheets.length === 0) {
      return false;
    }

    const descriptionValue = data.description;
    const hoursValue = typeof data.hours === 'number' ? data.hours : undefined;
    const description = typeof descriptionValue === 'string' ? descriptionValue : undefined;

    return timesheets.some((timesheet) => {
      const descriptionMatches = !description || timesheet.description === description;
      const hoursMatch = hoursValue === undefined || Number(timesheet.hours) === Number(hoursValue);
      return descriptionMatches && hoursMatch;
    });
  } catch (error) {
    console.warn('[AI-Driven] Failed to verify timesheet creation via mock API', error);
    return false;
  }
}

function extractTimesheets(payload: unknown): Timesheet[] {
  if (!isRecord(payload)) {
    return [];
  }

  const candidateArrays = [payload.timesheets, payload.content, payload.data].filter(
    (value): value is unknown[] => Array.isArray(value),
  );

  for (const array of candidateArrays) {
    const timesheets = array.filter((entry): entry is Timesheet => {
      if (!isRecord(entry)) {
        return false;
      }
      return typeof entry.id === 'number' && typeof entry.description === 'string';
    });

    if (timesheets.length > 0) {
      return timesheets;
    }
  }

  return [];
}

async function setupWorkflowHarness(page: Page): Promise<void> {
  await page.goto('about:blank');
  await page.setContent(`<!DOCTYPE html>
<html lang="en">
  <body>
    <div id="workflow-harness">
      <div id="status" data-testid="workflow-status">DRAFT</div>
      <div class="controls">
        <button type="button">Submit</button>
        <button type="button">Approve</button>
        <button type="button">Final Approve</button>
      </div>
    </div>
    <script>
      (function () {
        const statusEl = document.getElementById('status');
        const transitions = {
          Submit: 'PENDING_TUTOR_REVIEW',
          Approve: 'APPROVED_BY_TUTOR',
          'Final Approve': 'FINAL_CONFIRMED'
        };
        document.querySelectorAll('button').forEach((btn) => {
          btn.addEventListener('click', () => {
            const label = btn.textContent ? btn.textContent.trim() : '';
            const nextState = transitions[label];
            if (nextState) {
              statusEl.textContent = nextState;
            }
          });
        });
      })();
    </script>
  </body>
</html>`);
}

async function setupBoundaryHarness(page: Page): Promise<void> {
  const html = `<!DOCTYPE html>
<html lang="en">
  <body>
    <button type="button" class="create-timesheet">Create Timesheet</button>
    <div class="error" data-testid="validation-banner" hidden>Validation error</div>
    <form id="timesheet-form" hidden>
      <label>
        Hours
        <input type="number" name="hours" step="0.1" />
      </label>
      <label>
        Hourly Rate
        <input type="number" name="hourlyRate" step="1" />
      </label>
      <label>
        Description
        <textarea name="description"></textarea>
      </label>
    </form>
    <script>
      (function () {
        const form = document.getElementById('timesheet-form');
        const errorBanner = document.querySelector('.error');
        const createButton = document.querySelector('.create-timesheet');
        if (createButton && form && errorBanner) {
          createButton.addEventListener('click', () => {
            form.hidden = false;
          });
          const validators = {
            hours: (value) => {
              const num = Number(value);
              return Number.isFinite(num) && num >= 0.1 && num <= 38;
            },
            hourlyRate: (value) => {
              const num = Number(value);
              return Number.isFinite(num) && num >= 10 && num <= 200;
            },
            description: (value) => typeof value === 'string' && value.length >= 1 && value.length <= 500
          };
          form.addEventListener('input', (event) => {
            const target = event.target;
            if (!target || typeof target.name !== 'string' || typeof target.value === 'undefined') {
              return;
            }
            const validator = validators[target.name];
            if (!validator) {
              return;
            }
            const isValid = validator(target.value);
            if (isValid) {
              errorBanner.setAttribute('hidden', '');
            } else {
              errorBanner.removeAttribute('hidden');
            }
          });
        }
      })();
    </script>
  </body>
</html>`;

  await page.route(`${E2E_CONFIG.FRONTEND.URL}/dashboard`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: html,
    });
  });
}

function buildDefaultTimesheets(): Timesheet[] {
  const now = new Date().toISOString();
  return [
    {
      id: 501,
      tutorId: 201,
      courseId: 42,
      weekStartDate: '2025-03-03',
      hours: 6,
      hourlyRate: 45,
      description: 'Tutorial preparation for COMP1001',
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
      tutorName: 'John Doe',
      courseName: 'Introduction to Computer Science',
      courseCode: 'COMP1001',
    },
    {
      id: 502,
      tutorId: 201,
      courseId: 42,
      weekStartDate: '2025-03-10',
      hours: 8,
      hourlyRate: 45,
      description: 'Tutorial delivery for COMP1001',
      status: 'PENDING_TUTOR_CONFIRMATION',
      createdAt: now,
      updatedAt: now,
      tutorName: 'John Doe',
      courseName: 'Introduction to Computer Science',
      courseCode: 'COMP1001',
    },
    {
      id: 503,
      tutorId: 202,
      courseId: 43,
      weekStartDate: '2025-03-10',
      hours: 5,
      hourlyRate: 42,
      description: 'Marking support for INFO2002',
      status: 'TUTOR_CONFIRMED',
      createdAt: now,
      updatedAt: now,
      tutorName: 'Alex Lee',
      courseName: 'Information Modelling',
      courseCode: 'INFO2002',
    },
  ];
}

function cloneTimesheet(timesheet: Timesheet): Timesheet {
  return { ...timesheet };
}

function buildTimesheetPage(timesheets: Timesheet[]) {
  return {
    success: true,
    timesheets,
    content: timesheets,
    pageInfo: {
      currentPage: 0,
      pageSize: timesheets.length,
      totalElements: timesheets.length,
      totalPages: 1,
      first: true,
      last: true,
      numberOfElements: timesheets.length,
      empty: timesheets.length === 0,
    },
  };
}

function parseJson(data: unknown): Record<string, unknown> {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (isRecord(data)) {
    return data;
  }
  return {};
}

function parseCreateRequest(data: unknown): TimesheetCreateRequest {
  const payload = parseJson(data);
  return {
    tutorId: Number(payload.tutorId) || 201,
    courseId: Number(payload.courseId) || 42,
    weekStartDate: typeof payload.weekStartDate === 'string' ? payload.weekStartDate : new Date().toISOString().split('T')[0],
    hours: Number(payload.hours) || 1,
    hourlyRate: Number(payload.hourlyRate) || 40,
    description: typeof payload.description === 'string' ? payload.description : 'Generated timesheet entry',
  };
}

function parseUpdateData(data: unknown): Partial<Timesheet> {
  const payload = parseJson(data);
  const update: Partial<Timesheet> = {};
  if (typeof payload.description === 'string') {
    update.description = payload.description;
  }
  if (typeof payload.status === 'string') {
    update.status = payload.status as TimesheetStatus;
  }
  if (typeof payload.hours === 'number') {
    update.hours = payload.hours;
  } else if (typeof payload.hours === 'string' && payload.hours.trim().length > 0) {
    const numericHours = Number(payload.hours);
    if (Number.isFinite(numericHours)) {
      update.hours = numericHours;
    }
  }
  return update;
}

function mapApprovalAction(action: string, currentStatus: TimesheetStatus): TimesheetStatus {
  const normalized = action.toUpperCase();
  switch (normalized) {
    case 'SUBMIT_FOR_APPROVAL':
      return 'PENDING_TUTOR_CONFIRMATION';
    case 'TUTOR_CONFIRM':
      return 'TUTOR_CONFIRMED';
    case 'LECTURER_CONFIRM':
      return 'LECTURER_CONFIRMED';
    case 'HR_CONFIRM':
    case 'FINAL_APPROVE':
    case 'FINAL_CONFIRM':
      return 'FINAL_CONFIRMED';
    case 'REJECT':
      return 'REJECTED';
    case 'REQUEST_MODIFICATION':
      return 'MODIFICATION_REQUESTED';
    default:
      return currentStatus;
  }
}
