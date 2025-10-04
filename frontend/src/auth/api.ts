import { secureApiClient } from '../services/api-secure';
import type { LoginCredentials, AuthResponse } from '../types/auth';

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await secureApiClient.post<AuthResponse>('/api/auth/login', credentials);
    return response.data!;
  },

  async logout(): Promise<void> {
    try {
      await secureApiClient.post('/api/auth/logout');
    } catch {
      // Ignore logout failures to avoid blocking UI state changes
    }
  },

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const response = await secureApiClient.post<AuthResponse>('/api/auth/refresh', { refreshToken });
    return response.data!;
  },
};
