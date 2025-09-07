/**
 * Centralized API Client
 * 
 * Single source of truth for all API operations with built-in
 * authentication, error handling, and request/response interceptors.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE_URL } from '../config';
import type { ApiResponse, ApiErrorResponse, User } from '../types/api';

// =============================================================================
// API Client Class
// =============================================================================

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  // ---------------------------------------------------------------------------
  // Authentication Methods
  // ---------------------------------------------------------------------------

  setAuthToken(token: string | null): void {
    this.token = token;
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
    }
  }

  getAuthToken(): string | null {
    return this.token;
  }

  // ---------------------------------------------------------------------------
  // Request Interceptors
  // ---------------------------------------------------------------------------

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add request timestamp for debugging
        config.metadata = { startTime: Date.now() };
        
        // Ensure auth token is included
        if (this.token && !config.headers['Authorization']) {
          config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        console.debug(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - (response.config.metadata?.startTime || 0);
        console.debug(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
        return response;
      },
      (error) => {
        const duration = error.config?.metadata?.startTime 
          ? Date.now() - error.config.metadata.startTime 
          : 0;
        
        console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} (${duration}ms)`, error);

        // Handle specific error cases
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.handleAuthError();
        }

        return Promise.reject(this.transformError(error));
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Error Handling
  // ---------------------------------------------------------------------------

  private handleAuthError(): void {
    // Clear token and redirect to login
    this.setAuthToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Only redirect if not already on login page
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  private transformError(error: any): ApiErrorResponse {
    if (error.response?.data) {
      return {
        success: false,
        error: error.response.data.error || 'API Error',
        message: error.response.data.message || error.message,
        timestamp: new Date().toISOString(),
        path: error.config?.url || '',
        status: error.response.status,
        details: error.response.data.details || {}
      };
    }

    return {
      success: false,
      error: 'Network Error',
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      path: error.config?.url || '',
      status: 0,
      details: {}
    };
  }

  // ---------------------------------------------------------------------------
  // HTTP Methods
  // ---------------------------------------------------------------------------

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<T>(url, config);
    return this.wrapResponse(response);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<T>(url, data, config);
    return this.wrapResponse(response);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<T>(url, data, config);
    return this.wrapResponse(response);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.patch<T>(url, data, config);
    return this.wrapResponse(response);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<T>(url, config);
    return this.wrapResponse(response);
  }

  // ---------------------------------------------------------------------------
  // Response Wrapper
  // ---------------------------------------------------------------------------

  private wrapResponse<T>(response: AxiosResponse<T>): ApiResponse<T> {
    return {
      success: true,
      data: response.data,
      message: 'Success',
      timestamp: new Date().toISOString()
    };
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/api/health');
      return true;
    } catch {
      return false;
    }
  }

  // Create form data for file uploads
  createFormData(data: Record<string, any>): FormData {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (value instanceof File) {
        formData.append(key, value);
      } else if (value !== null && value !== undefined) {
        formData.append(key, JSON.stringify(value));
      }
    });
    
    return formData;
  }

  // Create query string from object
  createQueryString(params: Record<string, any>): string {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });
    
    return queryParams.toString();
  }
}

// =============================================================================
// Export singleton instance
// =============================================================================

export const apiClient = new ApiClient();

// Initialize with existing token if available
const existingToken = localStorage.getItem('token');
if (existingToken) {
  apiClient.setAuthToken(existingToken);
}

// Global error handler for unhandled API errors
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.status === 401) {
    console.warn('Unhandled authentication error detected');
  }
});

export default apiClient;