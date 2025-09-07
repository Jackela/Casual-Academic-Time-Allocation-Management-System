/**
 * Secure API Client
 * 
 * Enhanced version of API client with secure logging and production-safe error handling.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getConfig } from '../config/unified-config';
import { secureLogger } from '../utils/secure-logger';
import { ENV_CONFIG } from '../utils/environment';
import type { ApiResponse, ApiErrorResponse, User } from '../types/api';

// =============================================================================
// Enhanced API Client Class with Security
// =============================================================================

class SecureApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL?: string) {
    const config = getConfig();
    const apiBaseURL = baseURL || config.api.baseUrl;
    
    this.client = axios.create({
      baseURL: apiBaseURL,
      timeout: config.api.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    secureLogger.debug('Secure ApiClient initialized', { 
      baseURL: apiBaseURL,
      timeout: config.api.timeout,
      environment: ENV_CONFIG.getMode()
    });
  }

  // ---------------------------------------------------------------------------
  // Authentication Methods
  // ---------------------------------------------------------------------------

  setAuthToken(token: string | null): void {
    this.token = token;
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      secureLogger.debug('Auth token set for API client');
    } else {
      delete this.client.defaults.headers.common['Authorization'];
      secureLogger.debug('Auth token cleared from API client');
    }
  }

  getAuthToken(): string | null {
    return this.token;
  }

  // ---------------------------------------------------------------------------
  // Request Interceptors with Secure Logging
  // ---------------------------------------------------------------------------

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add request timestamp for performance tracking
        config.metadata = { startTime: Date.now() };
        
        // Ensure auth token is included
        if (this.token && !config.headers['Authorization']) {
          config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        // Secure API logging - no sensitive data in URL or body
        secureLogger.api(
          config.method?.toUpperCase() || 'GET',
          config.url || ''
        );
        
        return config;
      },
      (error) => {
        secureLogger.error('API Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - (response.config.metadata?.startTime || 0);
        
        // Log successful API response with performance metrics
        secureLogger.api(
          response.config.method?.toUpperCase() || 'GET',
          response.config.url || '',
          response.status,
          duration
        );
        
        // Performance monitoring for slow requests
        if (duration > 5000) {
          secureLogger.performance('Slow API Request', duration, 'ms', {
            method: response.config.method?.toUpperCase(),
            url: response.config.url,
            status: response.status
          });
        }
        
        return response;
      },
      (error) => {
        const duration = error.config?.metadata?.startTime 
          ? Date.now() - error.config.metadata.startTime 
          : 0;
        
        // Log API error with secure error handling
        secureLogger.api(
          error.config?.method?.toUpperCase() || 'GET',
          error.config?.url || '',
          error.response?.status,
          duration,
          error
        );

        // Handle specific error cases
        if (error.response?.status === 401) {
          this.handleAuthError();
        } else if (error.response?.status >= 500) {
          secureLogger.error('Server Error', {
            status: error.response.status,
            url: error.config?.url,
            method: error.config?.method?.toUpperCase()
          });
        }

        return Promise.reject(this.transformError(error));
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Secure Error Handling
  // ---------------------------------------------------------------------------

  private handleAuthError(): void {
    secureLogger.security('Authentication error detected', {
      currentPath: window.location.pathname,
      action: 'token_expired_or_invalid',
      redirectRequired: window.location.pathname !== '/login'
    });
    
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
    const baseError = {
      success: false,
      timestamp: new Date().toISOString(),
      path: error.config?.url || '',
    };

    if (error.response?.data) {
      return {
        ...baseError,
        error: error.response.data.error || 'API Error',
        message: ENV_CONFIG.isProduction() 
          ? 'An error occurred. Please try again.' 
          : (error.response.data.message || error.message),
        status: error.response.status,
        details: ENV_CONFIG.isProduction() ? {} : (error.response.data.details || {})
      };
    }

    return {
      ...baseError,
      error: ENV_CONFIG.isProduction() ? 'Service Error' : 'Network Error',
      message: ENV_CONFIG.isProduction() 
        ? 'Unable to connect to service. Please check your connection and try again.'
        : (error.message || 'An unexpected error occurred'),
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
      const startTime = Date.now();
      await this.get('/api/health');
      const duration = Date.now() - startTime;
      
      secureLogger.performance('Health Check', duration, 'ms');
      return true;
    } catch (error) {
      secureLogger.warn('Health check failed', error);
      return false;
    }
  }

  // Create form data for file uploads
  createFormData(data: Record<string, any>): FormData {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (value instanceof File) {
        formData.append(key, value);
        secureLogger.debug('File added to FormData', { filename: value.name, size: value.size });
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

  // Get client configuration for debugging
  getConfig() {
    return {
      baseURL: this.client.defaults.baseURL,
      timeout: this.client.defaults.timeout,
      hasToken: !!this.token,
      environment: ENV_CONFIG.getMode()
    };
  }
}

// =============================================================================
// Export secure singleton instance
// =============================================================================

export const secureApiClient = new SecureApiClient();

// Initialize with existing token if available
const existingToken = localStorage.getItem('token');
if (existingToken) {
  secureApiClient.setAuthToken(existingToken);
  secureLogger.debug('Restored existing auth token from localStorage');
}

// Global error handler for unhandled API errors
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.status === 401) {
    secureLogger.security('Unhandled authentication error detected', {
      status: event.reason.status,
      url: event.reason.config?.url || 'unknown',
      handled: false
    });
  } else if (event.reason?.status >= 500) {
    secureLogger.error('Unhandled server error', {
      status: event.reason.status,
      url: event.reason.config?.url || 'unknown'
    });
  }
});

export default secureApiClient;