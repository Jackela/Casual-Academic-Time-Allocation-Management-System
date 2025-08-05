import { test, expect } from '@playwright/test';

test.describe('Backend Health Check', { tag: '@health' }, () => {
  test('should verify backend is running', async ({ request }) => {
    const response = await request.get('http://localhost:8084/actuator/health');
    expect(response.status()).toBe(200);
    
    const health = await response.json();
    expect(health.status).toBe('UP');
    
    console.log('✅ Backend health verified:', health);
  });
  
  test('should check if auth endpoint is accessible', async ({ request }) => {
    // Just check if endpoint responds (even with error)
    const response = await request.post('http://localhost:8084/api/auth/login', {
      data: { email: 'test', password: 'test' },
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Should get a response (200, 400, 401, or 500 - any response means endpoint exists)
    expect([200, 400, 401, 500]).toContain(response.status());
    console.log('✅ Auth endpoint accessible, status:', response.status());
  });
});