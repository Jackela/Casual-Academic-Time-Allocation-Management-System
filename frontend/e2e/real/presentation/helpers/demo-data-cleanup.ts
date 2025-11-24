import type { APIRequestContext } from '@playwright/test';

/**
 * Clean up demo timesheets by fixed date ranges
 * Used for presentation demo repeatability
 */
export async function cleanupDemoTimesheets(request: APIRequestContext): Promise<void> {
  const demoDateRanges = new Set([
    "2024-01-08", // Demo 01: Week 1
    "2024-01-15", // Demo 02: Week 2
    "2024-01-22", // Demo 03: Week 3 (TU2)
    "2024-01-29", // Demo 03: Week 4 (TU4)
    "2024-02-05", // Demo 03: Week 5 (M05)
    "2024-02-12", // Demo 03: Week 6 (Realtime)
  ]);

  try {
    // Get all timesheets once
    const response = await request.get('/api/timesheets');
    if (response.ok()) {
      const data = await response.json();
      const timesheets = Array.isArray(data) ? data : (data.data || []);
      
      // Delete timesheets matching any demo date
      for (const timesheet of timesheets) {
        if (demoDateRanges.has(timesheet.weekStartDate)) {
          await request.delete(`/api/timesheets/${timesheet.id}`).catch(() => undefined);
        }
      }
    }
  } catch (error) {
    // Continue on error
  }
}

/**
 * Clean up demo user for Admin demo
 */
export async function cleanupDemoUser(request: APIRequestContext): Promise<void> {
  try {
    const response = await request.get('/api/users?email=demo.tutor@example.com');
    if (response.ok()) {
      const data = await response.json();
      if (data && data.id) {
        await request.delete(`/api/users/${data.id}`);
      }
    }
  } catch (error) {
    // User doesn't exist, continue
  }
}
