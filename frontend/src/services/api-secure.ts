/**
 * Secure API Client
 * 
 * Enhanced version of API client with secure logging and production-safe error handling.
 */

import axios, { AxiosHeaders } from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getConfig } from '../config/unified-config';
import { secureLogger } from '../utils/secure-logger';
import { authManager } from './auth-manager';
import { ENV_CONFIG } from '../utils/environment';
import type { ApiResponse, ApiErrorResponse } from '../types/api';

// =============================================================================
// Enhanced API Client Class with Security
// =============================================================================

export interface SecureApiClientOptions {
  environment?: 'browser' | 'server';
}

type RequestMetadata = {
  startTime: number;
};

type InternalRequestConfigWithMeta = InternalAxiosRequestConfig & {
  metadata?: RequestMetadata;
};export class SecureApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private environment: 'browser' | 'server';

  constructor(baseURL?: string, options: SecureApiClientOptions = {}) {
    const config = getConfig();
    const apiBaseURL = baseURL || config.api.baseUrl;

    this.environment = options.environment ?? (typeof window !== 'undefined' ? 'browser' : 'server');
    
    this.client = axios.create({
      baseURL: apiBaseURL,
      timeout: config.api.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    authManager.registerApiClientTokenSetter((token) => {
      this.setAuthToken(token);
    });
    secureLogger.debug('Secure ApiClient initialized', { 
      baseURL: apiBaseURL,
      timeout: config.api.timeout,
      environment: ENV_CONFIG.getMode()
    });
  }

  private isBrowserEnvironment(): boolean {
    return this.environment === 'browser' && typeof window !== 'undefined';
  }

  // ---------------------------------------------------------------------------
  // Authentication Methods
  // ---------------------------------------------------------------------------

  setAuthToken(token: string | null): void {
    this.token = token;
    if (token) {
      const defaults: any = this.client.defaults.headers.common;
      if (defaults && typeof defaults.set === 'function') {
        defaults.set('Authorization', `Bearer ${token}`);
      } else if (defaults) {
        defaults['Authorization'] = `Bearer ${token}`;
      }
      secureLogger.debug('Auth token set for API client');
    } else {
      const defaults: any = this.client.defaults.headers.common;
      if (defaults && typeof defaults.delete === 'function') {
        defaults.delete('Authorization');
      } else if (defaults) {
        delete defaults['Authorization'];
      }
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
        const requestConfig = config as InternalRequestConfigWithMeta;
        requestConfig.metadata = { startTime: Date.now() };

        if (this.token) {
          if (!requestConfig.headers) {
            requestConfig.headers = new AxiosHeaders();
          }

          const headers = requestConfig.headers;

          if (headers instanceof AxiosHeaders) {
            headers.set('Authorization', `Bearer ${this.token}`);
          } else {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
          }
        }

        secureLogger.api(
          requestConfig.method?.toUpperCase() || 'GET',
          requestConfig.url || ''
        );

        return requestConfig;
      },
      (error) => {
        secureLogger.error('API Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        const responseConfig = response.config as InternalRequestConfigWithMeta;
        const duration = Date.now() - (responseConfig.metadata?.startTime ?? 0);

        secureLogger.api(
          responseConfig.method?.toUpperCase() || 'GET',
          responseConfig.url || '',
          response.status,
          duration
        );

        if (duration > 5000) {
          secureLogger.performance('Slow API Request', duration, 'ms', {
            method: responseConfig.method?.toUpperCase(),
            url: responseConfig.url,
            status: response.status
          });
        }

        return response;
      },
      (error) => {
        const requestConfig = error.config as InternalRequestConfigWithMeta | undefined;
        const duration = requestConfig?.metadata?.startTime
          ? Date.now() - requestConfig.metadata.startTime
          : 0;

        secureLogger.api(
          requestConfig?.method?.toUpperCase() || 'GET',
          requestConfig?.url || '',
          error.response?.status,
          duration,
          error
        );

        if (error.response?.status === 401) {
          this.handleAuthError();
        } else if (error.response?.status >= 500) {
          secureLogger.error('Server Error', {
            status: error.response.status,
            url: requestConfig?.url,
            method: requestConfig?.method?.toUpperCase()
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
    const isBrowser = this.isBrowserEnvironment();
    const currentPath = isBrowser ? window.location.pathname : 'server';

    secureLogger.security('Authentication error detected', {
      currentPath,
      action: 'token_expired_or_invalid',
      redirectRequired: isBrowser ? window.location.pathname !== '/login' : false
    });

    this.setAuthToken(null);

    if (isBrowser) {
      try {
        window.localStorage.removeItem('token');
        window.localStorage.removeItem('user');
      } catch (storageError) {
        secureLogger.warn('Failed to clear auth storage', storageError);
      }

      const shouldRedirect = ENV_CONFIG.isProduction();
      if (shouldRedirect && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }

  private transformError(error: any): ApiErrorResponse {
    const baseError = {
      success: false as const,
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

// Initialize with existing token if available (browser environments only)
const hasWindow = typeof window !== 'undefined';
const hasLocalStorage = typeof localStorage !== 'undefined';

if (hasLocalStorage) {
  try {
    const existingToken = localStorage.getItem('token');
    if (existingToken) {
      secureApiClient.setAuthToken(existingToken);
      secureLogger.debug('Restored existing auth token from localStorage');
    }
  } catch (error) {
    secureLogger.warn('Failed to restore auth token from storage', error);
  }
}

// Global error handler for unhandled API errors (browser only)
if (hasWindow) {
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
}

export default secureApiClient;











