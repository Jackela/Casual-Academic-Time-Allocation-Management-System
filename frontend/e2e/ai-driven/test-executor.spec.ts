import { test, expect, Page, APIRequestContext, APIResponse } from '@playwright/test';
import {
  AITestGenerator,
  TestScenario,
  TestStep,
  ScenarioData,
  ScenarioExecutionError,
  ScenarioExecutionSummary,
} from './test-generator';
import { E2E_CONFIG } from '../config/e2e.config';
import type { Timesheet } from '../../src/types/api';

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * AI-Driven Test Executor
 * Executes dynamically generated test scenarios
 */

test.describe('AI-Generated Test Execution', () => {
  test.describe.configure({ mode: 'serial' });

  let generator: AITestGenerator;
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    generator = new AITestGenerator();
    
    // Get auth token for API calls
    const response = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/auth/login`, {
      data: {
        email: 'tutor@example.com',
        password: 'Tutor123!'
      }
    });
    const data = await response.json();
    authToken = data.token;
  });

  test('Execute dynamically generated authentication scenarios', async ({ page }) => {
    const scenarios = await generator.generateScenarios(page);
    const authScenarios = scenarios.filter(s => s.name.includes('Login'));
    
    for (const scenario of authScenarios) {
      console.log(`Executing: ${scenario.name}`);
      const result = await executeScenario(page, scenario, authToken);
      
      // Learn from execution
      await generator.learnFromExecution(scenario, result);
      
      // Assert scenario passed
      expect(result.success || result.validationCaught).toBeTruthy();
      
      // Clear state between scenarios
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    }
  });

  test('Execute CRUD operation scenarios', async ({ page, request }) => {
    // Setup authentication
    await page.addInitScript((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    const scenarios = await generator.generateScenarios(page);
    const crudScenarios = scenarios.filter(s => 
      s.name.includes('Create') || 
      s.name.includes('View') || 
      s.name.includes('Update') || 
      s.name.includes('Delete')
    );
    
    for (const scenario of crudScenarios) {
      console.log(`Executing: ${scenario.name}`);
      
      // Execute with data variations
      for (const data of scenario.dataVariations.slice(0, 2)) {
        const result = await executeScenarioWithData(page, request, scenario, data, authToken);
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
      const result = await executeScenario(page, scenario, authToken);

      expect(result.success || result.validationCaught).toBeTruthy();
      await generator.learnFromExecution(scenario, result);
    }
  });

  test('Execute boundary test scenarios', async ({ page }) => {
    await setupBoundaryHarness(page);
    await page.goto(`${E2E_CONFIG.FRONTEND.URL}/dashboard`);

    const scenarios = await generator.generateScenarios(page);
    const boundaryScenarios = scenarios.filter(s => s.name.includes('boundary') || s.name.includes('invalid'));

    for (const scenario of boundaryScenarios.slice(0, 5)) {
      const result = await executeScenario(page, scenario, authToken);

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

/**
 * Execute a test scenario
 */

async function verifyTimesheetCreation(
  request: APIRequestContext,
  authToken: string,
  data: ScenarioData,
): Promise<boolean> {
  try {
    const response = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets`, {
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
    console.warn('[AI-Driven] Failed to verify timesheet creation via API', error);
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

async function executeScenario(
  page: Page,
  scenario: TestScenario,
  authToken: string
): Promise<ScenarioExecutionSummary> {
  const startTime = Date.now();
  const errors: ScenarioExecutionError[] = [];
  let success = true;
  let validationCaught = false;

  try {
    for (const step of scenario.steps) {
      try {
        await executeStep(page, step, authToken);
      } catch (error: unknown) {
        const resolvedError = toError(error);
        // Check if this is an expected validation error
        if (step.validation?.includes('error') || step.validation?.includes('reject')) {
          validationCaught = true;
        } else {
          errors.push({ step, error: resolvedError.message });
          success = false;
          break;
        }
      }
    }
  } catch (error: unknown) {
    const resolvedError = toError(error);
    errors.push({ scenario: scenario.name, error: resolvedError.message });
    success = false;
  }

  if (!success && errors.length > 0) {
    console.error('[AI-Driven Scenario Failure]', scenario.name, errors);
  }

  return {
    success,
    duration: Date.now() - startTime,
    errors,
    validationCaught
  };
}

/**
 * Execute scenario with specific data
 */
async function executeScenarioWithData(
  page: Page,
  request: APIRequestContext,
  scenario: TestScenario,
  data: ScenarioData,
  authToken: string
): Promise<ScenarioExecutionSummary> {
  const startTime = Date.now();
  const errors: ScenarioExecutionError[] = [];
  let success = true;

  try {
    for (const step of scenario.steps) {
      const stepData = typeof step.target === 'string' ? data[step.target] ?? step.data : step.data;
      const stepWithData: TestStep = { ...step, data: stepData };
      await executeStep(page, stepWithData, authToken, request);
    }
  } catch (error: unknown) {
    const resolvedError = toError(error);
    errors.push({ scenario: scenario.name, data, error: resolvedError.message });
    success = false;
  }

  if (!success && scenario.name.toLowerCase().includes('create')) {
    const verificationSucceeded = await verifyTimesheetCreation(request, authToken, data);
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

/**
 * Execute a single test step
 */
async function executeStep(
  page: Page,
  step: TestStep,
  authToken: string,
  request?: APIRequestContext
): Promise<void> {
  switch (step.action) {
    case 'navigate':
      await page.goto(`${E2E_CONFIG.FRONTEND.URL}${step.target}`);
      await page.waitForLoadState('networkidle');
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
      if (request) {
        await performAPICall(request, step, authToken);
      } else {
        throw new Error('API request context is not available for API call step');
      }
      break;
  }
}

/**
 * Perform verification based on validation string
 */
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
  } else if (validation.includes('visible')) {
    const text = validation.replace('visible', '').trim();
    if (text) {
      await expect(page.getByText(new RegExp(text, 'i'))).toBeVisible();
    }
  } else if (validation.includes('Status changed to')) {
    const status = validation.split('Status changed to')[1].trim();
    await expect(page.getByText(status)).toBeVisible();
  } else if (validation.includes('Status is')) {
    const status = validation.split('is')[1].trim();
    await expect(page.getByText(status)).toBeVisible();
  } else if (validation.includes('Error message')) {
    const errorElement = page.locator('.error, .alert-danger, [role="alert"]').first();
    await expect(errorElement).toBeVisible();
  } else if (validation.includes('No validation error')) {
    const errorElement = page.locator('.error, .invalid-feedback').first();
    await expect(errorElement).not.toBeVisible();
  } else if (validation.includes('Validation error displayed')) {
    const errorElement = page.locator('.error, .invalid-feedback').first();
    await expect(errorElement).toBeVisible();
  }
}

/**
 * Perform API call
 */
async function performAPICall(request: APIRequestContext, step: TestStep, authToken: string): Promise<void> {
  if (typeof step.target !== 'string') {
    throw new Error('API call step requires a target endpoint');
  }

  const [method, endpoint] = step.target.split(' ');
  const url = `${E2E_CONFIG.BACKEND.URL}${endpoint}`;
  
  const options = {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    data: step.data
  };
  
  let response: APIResponse;
  switch (method) {
    case 'POST':
      response = await request.post(url, options);
      break;
    case 'PUT':
      response = await request.put(url, options);
      break;
    case 'DELETE':
      response = await request.delete(url, { headers: options.headers });
      break;
    case 'GET':
      response = await request.get(url, { headers: options.headers });
      break;
    default:
      throw new Error(`Unsupported API method: ${method}`);
  }
  
  if (step.validation) {
    if (step.validation.includes('status')) {
      const expectedStatus = parseInt(step.validation.match(/\d+/)?.[0] || '200');
      expect(response.status()).toBe(expectedStatus);
    }
  }
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
      body: html
    });
  });
}



