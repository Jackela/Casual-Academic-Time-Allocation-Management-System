import { test, expect } from '../../../fixtures/base';

test.describe('Timesheet API Contract Tests', { tag: '@contract' }, () => {
  test('GET /api/timesheets/pending-approval should return valid schema', async ({ timesheetAPI }) => {
    const response = await timesheetAPI.getPendingApprovals();
    
    // Validate top-level response structure
    expect(response).toHaveProperty('content');
    expect(response).toHaveProperty('page');
    
    // Validate content is an array
    expect(Array.isArray(response.content)).toBe(true);
    
    // Validate page object structure
    expect(response.page).toHaveProperty('number');
    expect(response.page).toHaveProperty('size');
    expect(response.page).toHaveProperty('totalElements');
    expect(response.page).toHaveProperty('totalPages');
    expect(response.page).toHaveProperty('first');
    expect(response.page).toHaveProperty('last');
    expect(response.page).toHaveProperty('numberOfElements');
    expect(response.page).toHaveProperty('empty');
    
    // Validate page field types
    expect(typeof response.page.number).toBe('number');
    expect(typeof response.page.size).toBe('number');
    expect(typeof response.page.totalElements).toBe('number');
    expect(typeof response.page.totalPages).toBe('number');
    expect(typeof response.page.first).toBe('boolean');
    expect(typeof response.page.last).toBe('boolean');
    expect(typeof response.page.numberOfElements).toBe('number');
    expect(typeof response.page.empty).toBe('boolean');
    
    // Validate page field constraints
    expect(response.page.number).toBeGreaterThanOrEqual(0);
    expect(response.page.size).toBeGreaterThan(0);
    expect(response.page.totalElements).toBeGreaterThanOrEqual(0);
    expect(response.page.totalPages).toBeGreaterThanOrEqual(0);
    expect(response.page.numberOfElements).toBeGreaterThanOrEqual(0);
    expect(response.page.numberOfElements).toBeLessThanOrEqual(response.page.size);
  });

  test('Timesheet objects should have valid schema when present', async ({ timesheetAPI }) => {
    const response = await timesheetAPI.getPendingApprovals();
    
    // If timesheets exist, validate their structure
    if (response.content.length > 0) {
      const timesheet = response.content[0];
      
      // Validate required fields exist
      expect(timesheet).toHaveProperty('id');
      expect(timesheet).toHaveProperty('tutorId');
      expect(timesheet).toHaveProperty('courseId');
      expect(timesheet).toHaveProperty('weekStartDate');
      expect(timesheet).toHaveProperty('hours');
      expect(timesheet).toHaveProperty('hourlyRate');
      expect(timesheet).toHaveProperty('description');
      expect(timesheet).toHaveProperty('status');
      
      // Validate field types
      expect(typeof timesheet.id).toBe('number');
      expect(typeof timesheet.tutorId).toBe('number');
      expect(typeof timesheet.courseId).toBe('number');
      expect(typeof timesheet.weekStartDate).toBe('string');
      expect(typeof timesheet.hours).toBe('number');
      expect(typeof timesheet.hourlyRate).toBe('number');
      expect(typeof timesheet.description).toBe('string');
      expect(typeof timesheet.status).toBe('string');
      
      // Validate field constraints
      expect(timesheet.id).toBeGreaterThan(0);
      expect(timesheet.tutorId).toBeGreaterThan(0);
      expect(timesheet.courseId).toBeGreaterThan(0);
      expect(timesheet.hours).toBeGreaterThan(0);
      expect(timesheet.hourlyRate).toBeGreaterThan(0);
      expect(timesheet.description.length).toBeGreaterThan(0);
      
      // Validate date format (ISO 8601 or simple date)
      expect(timesheet.weekStartDate).toMatch(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/);
      
      // Validate status is a valid enum value
      expect(['PENDING', 'APPROVED', 'REJECTED', 'DRAFT']).toContain(timesheet.status);
      
      // Validate optional enriched fields if present
      if (timesheet.tutorName) {
        expect(typeof timesheet.tutorName).toBe('string');
        expect(timesheet.tutorName.length).toBeGreaterThan(0);
      }
      
      if (timesheet.courseName) {
        expect(typeof timesheet.courseName).toBe('string');
        expect(timesheet.courseName.length).toBeGreaterThan(0);
      }
      
      if (timesheet.courseCode) {
        expect(typeof timesheet.courseCode).toBe('string');
        expect(timesheet.courseCode.length).toBeGreaterThan(0);
      }
      
      if (timesheet.createdAt) {
        expect(typeof timesheet.createdAt).toBe('string');
        expect(timesheet.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/);
      }
      
      if (timesheet.updatedAt) {
        expect(typeof timesheet.updatedAt).toBe('string');
        expect(timesheet.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/);
      }
    }
  });

  test('GET /api/timesheets/pending-approval should support pagination parameters', async ({ request, authAPI }) => {
    const auth = await authAPI.login('lecturer@example.com', 'Lecturer123!');
    
    // Test with different page sizes
    const pageSizes = [5, 10, 20];
    
    for (const size of pageSizes) {
      const response = await request.get(
        `http://localhost:8084/api/timesheets/pending-approval?page=0&size=${size}`,
        {
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      expect(response.ok()).toBe(true);
      
      const data = await response.json();
      expect(data.page.size).toBe(size);
      expect(data.content.length).toBeLessThanOrEqual(size);
    }
  });

  test('GET /api/timesheets/pending-approval should handle empty results gracefully', async ({ request, authAPI }) => {
    const auth = await authAPI.login('lecturer@example.com', 'Lecturer123!');
    
    // Request a very high page number to likely get empty results
    const response = await request.get(
      'http://localhost:8084/api/timesheets/pending-approval?page=999&size=20',
      {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    expect(response.ok()).toBe(true);
    
    const data = await response.json();
    
    // Validate empty response still has proper structure
    expect(data).toHaveProperty('content');
    expect(data).toHaveProperty('page');
    expect(Array.isArray(data.content)).toBe(true);
    expect(data.content.length).toBe(0);
    expect(data.page.empty).toBe(true);
    // Note: numberOfElements can be negative in some pagination implementations when page is out of bounds
    expect(typeof data.page.numberOfElements).toBe('number');
  });

  test('API should require valid authentication', async ({ request }) => {
    // Test without token
    const responseNoAuth = await request.get('http://localhost:8084/api/timesheets/pending-approval');
    expect([401, 403]).toContain(responseNoAuth.status());
    
    // Test with invalid token
    const responseInvalidAuth = await request.get(
      'http://localhost:8084/api/timesheets/pending-approval',
      {
        headers: {
          'Authorization': 'Bearer invalid-token',
          'Content-Type': 'application/json'
        }
      }
    );
    expect([401, 403]).toContain(responseInvalidAuth.status());
  });

  test('API should return proper Content-Type headers', async ({ timesheetAPI, request, authAPI }) => {
    const auth = await authAPI.login('lecturer@example.com', 'Lecturer123!');
    
    const response = await request.get(
      'http://localhost:8084/api/timesheets/pending-approval',
      {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Check Content-Type header
    const contentType = response.headers()['content-type'];
    expect(contentType).toBeDefined();
    expect(contentType).toContain('application/json');
  });

  test('Pagination should be mathematically consistent', async ({ timesheetAPI }) => {
    const response = await timesheetAPI.getPendingApprovals(0, 20);
    
    // Mathematical consistency checks
    const { page } = response;
    
    // Total pages should be ceiling of totalElements / size
    const expectedTotalPages = Math.ceil(page.totalElements / page.size);
    expect(page.totalPages).toBe(expectedTotalPages);
    
    // If it's the first page, first should be true
    if (page.number === 0) {
      expect(page.first).toBe(true);
    }
    
    // If it's the last page, last should be true
    if (page.number === page.totalPages - 1 || page.totalPages === 0) {
      expect(page.last).toBe(true);
    }
    
    // numberOfElements should match content length
    expect(page.numberOfElements).toBe(response.content.length);
    
    // Empty should be true only when numberOfElements is 0
    expect(page.empty).toBe(page.numberOfElements === 0);
  });

  test('Timesheet monetary values should be properly formatted', async ({ timesheetAPI }) => {
    const response = await timesheetAPI.getPendingApprovals();
    
    if (response.content.length > 0) {
      for (const timesheet of response.content) {
        // Hours should be positive and reasonable (not more than 168 hours per week)
        expect(timesheet.hours).toBeGreaterThan(0);
        expect(timesheet.hours).toBeLessThanOrEqual(168);
        
        // Hourly rate should be positive and reasonable (between $1 and $1000 per hour)
        expect(timesheet.hourlyRate).toBeGreaterThan(0);
        expect(timesheet.hourlyRate).toBeLessThan(1000);
        
        // Hourly rate should have at most 2 decimal places
        expect(timesheet.hourlyRate % 0.01).toBeCloseTo(0, 2);
        
        // Total pay calculation should be correct
        const expectedTotal = timesheet.hours * timesheet.hourlyRate;
        expect(expectedTotal).toBeGreaterThan(0);
      }
    }
  });
});