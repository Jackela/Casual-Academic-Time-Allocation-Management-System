import { test, expect, testCredentials } from '../../fixtures/base';

test.describe('Authentication API Contract', { tag: '@api' }, () => {
  test('should authenticate lecturer with valid credentials', async ({ authAPI }) => {
    const response = await authAPI.login(
      testCredentials.lecturer.email,
      testCredentials.lecturer.password
    );

    expect(response.success).toBe(true);
    expect(response.token).toMatch(/^eyJ/); // JWT token pattern
    expect(response.user.email).toBe(testCredentials.lecturer.email);
    expect(response.user.role).toBe('LECTURER');
    expect(response.user.name).toBeTruthy();
  });

  test('should reject invalid credentials', async ({ authAPI }) => {
    await expect(
      authAPI.login('invalid@example.com', 'wrongpassword')
    ).rejects.toThrow(/Login failed/);
  });

  test('should return health status', async ({ authAPI }) => {
    const health = await authAPI.health();
    expect(health.status).toBe(200);
    expect(health.data.status).toBe('UP');
  });
});