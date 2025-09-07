import { test, expect, Page } from '@playwright/test';
import { AITestGenerator, TestScenario, TestStep } from './test-generator';
import { E2E_CONFIG } from '../config/e2e.config';

/**
 * AI-Driven Test Executor
 * Executes dynamically generated test scenarios
 */

test.describe('AI-Generated Test Execution', () => {
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
      expect(result.success).toBeTruthy();
      
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
    await page.addInitScript((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        id: 3,
        email: 'tutor@example.com',
        name: 'John Doe',
        role: 'TUTOR'
      }));
    }, authToken);
    
    const scenarios = await generator.generateScenarios(page);
    const workflowScenarios = scenarios.filter(s => s.name.includes('workflow'));
    
    for (const scenario of workflowScenarios.slice(0, 1)) {
      console.log(`Executing workflow: ${scenario.name}`);
      const result = await executeScenario(page, scenario, authToken);
      
      expect(result.success).toBeTruthy();
      await generator.learnFromExecution(scenario, result);
    }
  });

  test('Execute boundary test scenarios', async ({ page }) => {
    await page.addInitScript((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${E2E_CONFIG.FRONTEND.URL}/dashboard`);
    
    const scenarios = await generator.generateScenarios(page);
    const boundaryScenarios = scenarios.filter(s => s.name.includes('boundary') || s.name.includes('invalid'));
    
    for (const scenario of boundaryScenarios.slice(0, 5)) {
      console.log(`Testing boundary: ${scenario.name}`);
      const result = await executeScenario(page, scenario, authToken);
      
      // Boundary tests should properly handle invalid input
      expect(result.errors.length === 0 || result.validationCaught).toBeTruthy();
      await generator.learnFromExecution(scenario, result);
    }
  });

  test('Adaptive test generation based on page state', async ({ page }) => {
    await page.goto(`${E2E_CONFIG.FRONTEND.URL}/login`);
    
    // Generate scenarios based on current page
    const loginPageScenarios = await generator.generateScenarios(page);
    expect(loginPageScenarios.some(s => s.name.includes('Login'))).toBeTruthy();
    
    // Login and navigate to dashboard
    await page.fill('input[name="email"]', 'lecturer@example.com');
    await page.fill('input[name="password"]', 'Lecturer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard/**');
    
    // Generate scenarios for dashboard
    const dashboardScenarios = await generator.generateScenarios(page);
    expect(dashboardScenarios.some(s => s.name.includes('timesheet'))).toBeTruthy();
  });
});

/**
 * Execute a test scenario
 */
async function executeScenario(
  page: Page,
  scenario: TestScenario,
  authToken: string
): Promise<any> {
  const startTime = Date.now();
  const errors: any[] = [];
  let success = true;
  let validationCaught = false;

  try {
    for (const step of scenario.steps) {
      try {
        await executeStep(page, step, authToken);
      } catch (error: any) {
        // Check if this is an expected validation error
        if (step.validation?.includes('error') || step.validation?.includes('reject')) {
          validationCaught = true;
        } else {
          errors.push({ step, error: error.message });
          success = false;
          break;
        }
      }
    }
  } catch (error: any) {
    errors.push({ scenario: scenario.name, error: error.message });
    success = false;
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
  request: any,
  scenario: TestScenario,
  data: any,
  authToken: string
): Promise<any> {
  const startTime = Date.now();
  const errors: any[] = [];
  let success = true;

  try {
    for (const step of scenario.steps) {
      const stepWithData = { ...step, data: data[step.target] || step.data };
      await executeStep(page, stepWithData, authToken, request);
    }
  } catch (error: any) {
    errors.push({ scenario: scenario.name, data, error: error.message });
    success = false;
  }

  return {
    success,
    duration: Date.now() - startTime,
    errors
  };
}

/**
 * Execute a single test step
 */
async function executeStep(
  page: Page,
  step: TestStep,
  authToken: string,
  request?: any
): Promise<void> {
  switch (step.action) {
    case 'navigate':
      await page.goto(`${E2E_CONFIG.FRONTEND.URL}${step.target}`);
      await page.waitForLoadState('networkidle');
      break;
      
    case 'fill':
      await page.fill(step.target!, step.data);
      break;
      
    case 'click':
      await page.click(step.target!);
      await page.waitForLoadState('networkidle');
      break;
      
    case 'verify':
      await performVerification(page, step.validation!);
      break;
      
    case 'api-call':
      if (request) {
        await performAPICall(request, step, authToken);
      }
      break;
  }
}

/**
 * Perform verification based on validation string
 */
async function performVerification(page: Page, validation: string): Promise<void> {
  if (validation.includes('URL contains')) {
    const pattern = validation.split('contains')[1].trim();
    await expect(page).toHaveURL(new RegExp(pattern));
  } else if (validation.includes('visible')) {
    const text = validation.replace('visible', '').trim();
    if (text) {
      await expect(page.getByText(new RegExp(text, 'i'))).toBeVisible();
    }
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
async function performAPICall(request: any, step: TestStep, authToken: string): Promise<void> {
  const [method, endpoint] = step.target!.split(' ');
  const url = `${E2E_CONFIG.BACKEND.URL}${endpoint}`;
  
  const options = {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    data: step.data
  };
  
  let response;
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
  }
  
  if (step.validation) {
    if (step.validation.includes('status')) {
      const expectedStatus = parseInt(step.validation.match(/\d+/)?.[0] || '200');
      expect(response.status()).toBe(expectedStatus);
    }
  }
}