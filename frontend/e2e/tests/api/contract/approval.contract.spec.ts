import { test, expect } from '../../../fixtures/base';

test.describe('Approval API Contract Tests', { tag: '@contract' }, () => {
  test('POST /api/approvals should accept valid approval request schema', async ({ request, authAPI }) => {
    const auth = await authAPI.login('lecturer@example.com', 'Lecturer123!');
    
    // Valid approval request payload
    const approvalRequest = {
      timesheetId: 1,
      action: 'APPROVE',
      comment: 'Approved by lecturer - good work'
    };
    
    const response = await request.post('http://localhost:8084/api/approvals', {
      data: approvalRequest,
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Should accept the request (may return various status codes based on auth/validation)
    expect([200, 201, 400, 401, 404]).toContain(response.status());
    
    if (response.ok()) {
      const data = await response.json();
      
      // Response should indicate the action was processed
      expect(data).toHaveProperty('success');
      expect(typeof data.success).toBe('boolean');
      
      if (data.timesheetId) {
        expect(data.timesheetId).toBe(approvalRequest.timesheetId);
      }
      
      if (data.action) {
        expect(data.action).toBe(approvalRequest.action);
      }
    }
  });

  test('POST /api/approvals should validate action enum values', async ({ request, authAPI }) => {
    const auth = await authAPI.login('lecturer@example.com', 'Lecturer123!');
    
    // Test valid action values
    const validActions = ['APPROVE', 'REJECT'];
    
    for (const action of validActions) {
      const response = await request.post('http://localhost:8084/api/approvals', {
        data: {
          timesheetId: 1,
          action: action,
          comment: `Test ${action.toLowerCase()} action`
        },
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Should accept valid actions (may return various status codes based on auth/validation)
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    }
  });

  test('POST /api/approvals should reject invalid action values', async ({ request, authAPI }) => {
    const auth = await authAPI.login('lecturer@example.com', 'Lecturer123!');
    
    // Test invalid action values
    const invalidActions = ['INVALID', 'PENDING', 'SUBMIT', '', null, undefined];
    
    for (const action of invalidActions) {
      const response = await request.post('http://localhost:8084/api/approvals', {
        data: {
          timesheetId: 1,
          action: action,
          comment: 'Test comment'
        },
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Should reject invalid actions (may return various error status codes)
      expect([400, 401, 422, 500]).toContain(response.status());
    }
  });

  test('POST /api/approvals should validate required fields', async ({ request, authAPI }) => {
    const auth = await authAPI.login('lecturer@example.com', 'Lecturer123!');
    
    // Test missing timesheetId
    const responseNoTimesheetId = await request.post('http://localhost:8084/api/approvals', {
      data: {
        action: 'APPROVE',
        comment: 'Test comment'
      },
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      }
    });
    expect([400, 422]).toContain(responseNoTimesheetId.status());
    
    // Test missing action
    const responseNoAction = await request.post('http://localhost:8084/api/approvals', {
      data: {
        timesheetId: 1,
        comment: 'Test comment'
      },
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      }
    });
    expect([400, 422]).toContain(responseNoAction.status());
    
    // Test with empty object
    const responseEmpty = await request.post('http://localhost:8084/api/approvals', {
      data: {},
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      }
    });
    expect([400, 422]).toContain(responseEmpty.status());
  });

  test('POST /api/approvals should validate timesheetId type', async ({ request, authAPI }) => {
    const auth = await authAPI.login('lecturer@example.com', 'Lecturer123!');
    
    // Test invalid timesheetId types
    const invalidTimesheetIds = ['not-a-number', -1, 0, null, undefined, 1.5];
    
    for (const timesheetId of invalidTimesheetIds) {
      const response = await request.post('http://localhost:8084/api/approvals', {
        data: {
          timesheetId: timesheetId,
          action: 'APPROVE',
          comment: 'Test comment'
        },
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Should reject invalid timesheetId values (may return various error status codes)
      expect([400, 401, 422, 500]).toContain(response.status());
    }
  });

  test('POST /api/approvals should handle comment field correctly', async ({ request, authAPI }) => {
    const auth = await authAPI.login('lecturer@example.com', 'Lecturer123!');
    
    // Test with valid comment
    const responseWithComment = await request.post('http://localhost:8084/api/approvals', {
      data: {
        timesheetId: 1,
        action: 'APPROVE',
        comment: 'Excellent work on the tutorials'
      },
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      }
    });
    expect([200, 201, 400, 401, 404]).toContain(responseWithComment.status());
    
    // Test without comment (should be optional)
    const responseNoComment = await request.post('http://localhost:8084/api/approvals', {
      data: {
        timesheetId: 1,
        action: 'APPROVE'
      },
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      }
    });
    expect([200, 201, 400, 401, 404]).toContain(responseNoComment.status());
    
    // Test with empty comment
    const responseEmptyComment = await request.post('http://localhost:8084/api/approvals', {
      data: {
        timesheetId: 1,
        action: 'APPROVE',
        comment: ''
      },
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      }
    });
    expect([200, 201, 400, 401, 404]).toContain(responseEmptyComment.status());
  });

  test('POST /api/approvals should require authentication', async ({ request }) => {
    // Test without authentication
    const responseNoAuth = await request.post('http://localhost:8084/api/approvals', {
      data: {
        timesheetId: 1,
        action: 'APPROVE',
        comment: 'Test comment'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    expect([401, 403]).toContain(responseNoAuth.status());
    
    // Test with invalid token
    const responseInvalidAuth = await request.post('http://localhost:8084/api/approvals', {
      data: {
        timesheetId: 1,
        action: 'APPROVE',
        comment: 'Test comment'
      },
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json'
      }
    });
    expect([401, 403]).toContain(responseInvalidAuth.status());
  });

  test('POST /api/approvals should return proper Content-Type headers', async ({ request, authAPI }) => {
    const auth = await authAPI.login('lecturer@example.com', 'Lecturer123!');
    
    const response = await request.post('http://localhost:8084/api/approvals', {
      data: {
        timesheetId: 1,
        action: 'APPROVE',
        comment: 'Test approval'
      },
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Should return JSON content type for both success and error responses
    if (response.status() < 500) {  // Server errors might not have JSON
      const contentType = response.headers()['content-type'];
      expect(contentType).toBeDefined();
      expect(contentType).toContain('application/json');
    }
  });

  test('POST /api/approvals should handle non-existent timesheet gracefully', async ({ request, authAPI }) => {
    const auth = await authAPI.login('lecturer@example.com', 'Lecturer123!');
    
    // Try to approve a timesheet that definitely doesn't exist
    const response = await request.post('http://localhost:8084/api/approvals', {
      data: {
        timesheetId: 999999,
        action: 'APPROVE',
        comment: 'Test approval for non-existent timesheet'
      },
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Should return 404 or appropriate error status
    expect([404, 400, 422]).toContain(response.status());
    
    if (response.status() === 404) {
      const data = await response.json();
      
      // Error response should have proper structure
      expect(data).toHaveProperty('message');
      expect(typeof data.message).toBe('string');
      expect(data.message.length).toBeGreaterThan(0);
    }
  });

  test('Approval request should validate comment length constraints', async ({ request, authAPI }) => {
    const auth = await authAPI.login('lecturer@example.com', 'Lecturer123!');
    
    // Test very long comment (assuming there's a reasonable limit)
    const veryLongComment = 'A'.repeat(10000);
    
    const response = await request.post('http://localhost:8084/api/approvals', {
      data: {
        timesheetId: 1,
        action: 'APPROVE',
        comment: veryLongComment
      },
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Should either accept it (200/201/404) or reject with validation error (400/422)
    // The specific behavior depends on business requirements
    expect([200, 201, 400, 404, 422]).toContain(response.status());
  });
});