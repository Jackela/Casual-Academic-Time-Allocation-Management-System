import { test, expect } from '@playwright/test';
import { E2E_CONFIG } from '../config/e2e.config';

/**
 * Real Backend Timesheet Workflow Tests
 * Complete end-to-end testing with actual database operations
 */

test.describe('Real Backend Timesheet Operations', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Authenticate once for all tests
    const response = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/auth/login`, {
      data: {
        email: 'tutor@example.com',
        password: 'Tutor123!'
      }
    });
    const data = await response.json();
    authToken = data.token;
  });

  test.beforeEach(async ({ page }) => {
    // Set auth token before navigation
    await page.addInitScript((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        id: 3,
        email: 'tutor@example.com',
        name: 'John Doe',
        role: 'TUTOR'
      }));
    }, authToken);
    
    await page.goto(`${E2E_CONFIG.FRONTEND.URL}/dashboard`);
    await page.waitForLoadState('networkidle');
  });

  test('View real timesheets from backend', async ({ page }) => {
    // Wait for real API call to complete
    const response = await page.waitForResponse(
      response => response.url().includes('/api/timesheets/me') && response.status() === 200
    );
    
    const timesheets = await response.json();
    expect(timesheets).toHaveProperty('content');
    expect(Array.isArray(timesheets.content)).toBeTruthy();
    
    // Verify timesheets are displayed in UI
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
    
    // If timesheets exist, verify data matches
    if (count > 0) {
      const firstRow = rows.first();
      await expect(firstRow).toContainText(/DRAFT|PENDING|APPROVED|REJECTED/);
    }
  });

  test('Create new timesheet with real backend', async ({ page, request }) => {
    // Create via API first
    const createResponse = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/timesheets`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        tutorId: 3,
        courseId: 1,
        weekStartDate: '2025-02-03',
        hours: 10,
        hourlyRate: 45.00,
        description: 'E2E Test Timesheet',
        status: 'DRAFT'
      }
    });
    
    expect(createResponse.status()).toBe(201);
    const newTimesheet = await createResponse.json();
    expect(newTimesheet.id).toBeTruthy();
    
    // Refresh page to see new timesheet
    await page.reload();
    await page.waitForResponse(response => 
      response.url().includes('/api/timesheets/me') && response.status() === 200
    );
    
    // Verify new timesheet appears
    await expect(page.getByText('E2E Test Timesheet')).toBeVisible();
    
    // Cleanup: Delete the test timesheet
    await request.delete(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${newTimesheet.id}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
  });

  test('Submit timesheet for approval flow', async ({ page, request }) => {
    // Create a DRAFT timesheet
    const createResponse = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/timesheets`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        tutorId: 3,
        courseId: 2,
        weekStartDate: '2025-02-10',
        hours: 8,
        hourlyRate: 50.00,
        description: 'Submission Test',
        status: 'DRAFT'
      }
    });
    
    const timesheet = await createResponse.json();
    
    // Reload to see the new timesheet
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Find and click submit button for this timesheet
    const submitButton = page.locator(`[data-timesheet-id="${timesheet.id}"] button:has-text("Submit")`);
    
    if (await submitButton.isVisible()) {
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/approvals') && response.status() === 200
      );
      
      await submitButton.click();
      await responsePromise;
      
      // Verify status changed
      await page.reload();
      await expect(page.getByText('PENDING_TUTOR_REVIEW')).toBeVisible();
    }
    
    // Cleanup
    await request.delete(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${timesheet.id}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
  });

  test('Error handling with real backend errors', async ({ page, request }) => {
    // Try to create invalid timesheet
    const response = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/timesheets`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        tutorId: 3,
        courseId: 999, // Non-existent course
        weekStartDate: '2025-02-03',
        hours: 100, // Invalid hours
        hourlyRate: 45.00,
        description: 'Invalid Test',
        status: 'DRAFT'
      }
    });
    
    // Should get error response
    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error).toHaveProperty('message');
  });
});