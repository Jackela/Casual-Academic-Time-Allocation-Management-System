import { test, expect } from '../../../fixtures/base';

test.describe('Auth API Contract Tests', { tag: '@contract' }, () => {
  test('POST /api/auth/login should return valid schema on success', async ({ authAPI }) => {
    const response = await authAPI.login('lecturer@example.com', 'Lecturer123!');
    
    // Validate response structure
    expect(response).toHaveProperty('token');
    expect(response).toHaveProperty('user');
    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('errorMessage');
    
    // Validate token format (JWT)
    expect(typeof response.token).toBe('string');
    expect(response.token.length).toBeGreaterThan(0);
    expect(response.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/);
    
    // Validate user object structure
    expect(response.user).toHaveProperty('id');
    expect(response.user).toHaveProperty('email');
    expect(response.user).toHaveProperty('name');
    expect(response.user).toHaveProperty('role');
    
    // Validate user field types
    expect(typeof response.user.id).toBe('number');
    expect(typeof response.user.email).toBe('string');
    expect(typeof response.user.name).toBe('string');
    expect(typeof response.user.role).toBe('string');
    
    // Validate user field formats
    expect(response.user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(['ADMIN', 'LECTURER', 'TUTOR']).toContain(response.user.role);
    
    // Validate success indicators
    expect(response.success).toBe(true);
    expect(response.errorMessage).toBe(null);
  });

  test('POST /api/auth/login should return error schema on failure', async ({ request }) => {
    const response = await request.post('http://localhost:8084/api/auth/login', {
      data: { email: 'invalid@example.com', password: 'wrongpassword' },
      headers: { 'Content-Type': 'application/json' }
    });
    
    expect(response.status()).toBe(401);
    
    const data = await response.json();
    
    // Validate actual error response structure from backend
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('message');  
    expect(data).toHaveProperty('path');
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('timestamp');
    
    // Validate error response values
    expect(typeof data.error).toBe('string');
    expect(data.error).toBe('AUTH_FAILED');
    expect(typeof data.message).toBe('string');
    expect(data.message.length).toBeGreaterThan(0);
    expect(data.path).toBe('/api/auth/login');
    expect(data.status).toBe(401);
    expect(typeof data.timestamp).toBe('string');
  });

  test('GET /actuator/health should return valid health schema', async ({ authAPI }) => {
    const health = await authAPI.health();
    
    // Validate response status
    expect(health.status).toBe(200);
    
    // Validate health data structure
    expect(health.data).toHaveProperty('status');
    expect(typeof health.data.status).toBe('string');
    expect(['UP', 'DOWN', 'OUT_OF_SERVICE', 'UNKNOWN']).toContain(health.data.status);
    
    // Health endpoint may include additional components
    if (health.data.components) {
      expect(typeof health.data.components).toBe('object');
    }
  });

  test('Login response should maintain consistent schema across different user roles', async ({ authAPI }) => {
    // Test different user types have consistent response schema
    const testUsers = [
      { email: 'lecturer@example.com', password: 'Lecturer123!' },
      { email: 'tutor@example.com', password: 'Tutor123!' },
      { email: 'admin@example.com', password: 'Admin123!' }
    ];

    for (const user of testUsers) {
      const response = await authAPI.login(user.email, user.password);
      
      // All responses should have the same schema structure
      expect(response).toHaveProperty('token');
      expect(response).toHaveProperty('user');
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('errorMessage');
      
      // User object should have consistent structure regardless of role
      expect(response.user).toHaveProperty('id');
      expect(response.user).toHaveProperty('email');
      expect(response.user).toHaveProperty('name');
      expect(response.user).toHaveProperty('role');
      
      // Types should be consistent
      expect(typeof response.user.id).toBe('number');
      expect(typeof response.user.email).toBe('string');
      expect(typeof response.user.name).toBe('string');
      expect(typeof response.user.role).toBe('string');
    }
  });

  test('JWT token should contain valid claims structure', async ({ authAPI }) => {
    const response = await authAPI.login('lecturer@example.com', 'Lecturer123!');
    
    // JWT tokens have 3 parts separated by dots
    const tokenParts = response.token.split('.');
    expect(tokenParts).toHaveLength(3);
    
    // Decode the payload (second part) - note: this is just for contract testing
    // In production, token validation should be done server-side
    const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
    
    // Validate JWT standard claims exist
    expect(payload).toHaveProperty('sub'); // Subject (usually user identifier)
    expect(payload).toHaveProperty('iat'); // Issued at
    expect(payload).toHaveProperty('exp'); // Expiration
    
    // Validate custom claims
    expect(payload).toHaveProperty('role');
    expect(typeof payload.role).toBe('string');
    expect(['ADMIN', 'LECTURER', 'TUTOR']).toContain(payload.role);
    
    // Validate claim types
    expect(typeof payload.sub).toBe('string');
    expect(typeof payload.iat).toBe('number');
    expect(typeof payload.exp).toBe('number');
    
    // Validate token is not expired
    const now = Math.floor(Date.now() / 1000);
    expect(payload.exp).toBeGreaterThan(now);
  });

  test('API should return proper Content-Type headers', async ({ request }) => {
    const response = await request.post('http://localhost:8084/api/auth/login', {
      data: { email: 'lecturer@example.com', password: 'Lecturer123!' },
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Check Content-Type header
    const contentType = response.headers()['content-type'];
    expect(contentType).toBeDefined();
    expect(contentType).toContain('application/json');
  });

  test('API should handle missing required fields gracefully', async ({ request }) => {
    // Test missing email
    const responseNoEmail = await request.post('http://localhost:8084/api/auth/login', {
      data: { password: 'password123' },
      headers: { 'Content-Type': 'application/json' }
    });
    
    expect([400, 422, 401]).toContain(responseNoEmail.status());
    
    // Test missing password
    const responseNoPassword = await request.post('http://localhost:8084/api/auth/login', {
      data: { email: 'test@example.com' },
      headers: { 'Content-Type': 'application/json' }
    });
    
    expect([400, 422, 401]).toContain(responseNoPassword.status());
    
    // Test empty request body
    const responseEmpty = await request.post('http://localhost:8084/api/auth/login', {
      data: {},
      headers: { 'Content-Type': 'application/json' }
    });
    
    expect([400, 422, 401]).toContain(responseEmpty.status());
  });
});