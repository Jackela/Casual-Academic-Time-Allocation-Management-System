import { test, expect } from '../../fixtures/base';

test.describe('Timesheet API Contract', { tag: '@api' }, () => {
  test('should fetch pending approval timesheets', async ({ timesheetAPI }) => {
    const response = await timesheetAPI.getPendingApprovals();

    expect(response).toHaveProperty('content');
    expect(response).toHaveProperty('page');
    expect(response.page).toHaveProperty('totalElements');
    expect(response.page).toHaveProperty('size');
    expect(Array.isArray(response.content)).toBe(true);

    // If there are timesheets, validate structure
    if (response.content.length > 0) {
      const timesheet = response.content[0];
      expect(timesheet).toHaveProperty('id');
      expect(timesheet).toHaveProperty('tutorName');
      expect(timesheet).toHaveProperty('courseName');
      expect(timesheet).toHaveProperty('hours');
      expect(timesheet).toHaveProperty('hourlyRate');
      expect(timesheet).toHaveProperty('status');
    }
  });

  test('should handle pagination parameters', async ({ timesheetAPI }) => {
    const page1 = await timesheetAPI.getPendingApprovals(0, 5);
    expect(page1.page.size).toBe(5);
    expect(page1.page.number).toBe(0);

    const page2 = await timesheetAPI.getPendingApprovals(1, 10);
    expect(page2.page.size).toBe(10);
    expect(page2.page.number).toBe(1);
  });

  // Note: Approval/rejection actions are handled by a separate API endpoint
  // and would need to be tested with the ApprovalAPI if implemented
});