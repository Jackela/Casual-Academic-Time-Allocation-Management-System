/**
 * Contract Test Setup - Network Mocking Configuration
 * Provides stable, predictable mock responses for API contract tests
 * Ensures tests are independent of real network calls
 */

import { vi, beforeEach } from 'vitest';
import './simple-axios-mock';

// Export helper functions for tests
export const getTestCredentials = () => ({
  lecturer: {
    email: 'lecturer@example.com',
    password: 'Lecturer123!'
  },
  tutor: {
    email: 'tutor@example.com',
    password: 'Tutor123!'
  },
  admin: {
    email: 'admin@example.com',
    password: 'Admin123!'
  }
});

// Clear mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});