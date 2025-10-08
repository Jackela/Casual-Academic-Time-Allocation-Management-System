/**
 * Secure API Client
 * 
 * Enhanced version of API client with secure logging and production-safe error handling.
 */

import axios, { AxiosHeaders, isAxiosError } from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getConfig } from '../config/unified-config';
import { secureLogger } from '../utils/secure-logger';
import { authManager } from './auth-manager';
import { ENV_CONFIG } from '../utils/environment';
import type { ApiSuccessResponse, ApiErrorResponse, ErrorEnvelope, ErrorDetail } from '../types/api';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isDefined = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

const collectErrorDetails = (input: unknown): ErrorDetail[] | undefined => {
  if (Array.isArray(input)) {
    const mapped = input
      .map((entry): ErrorDetail | undefined => {
        if (typeof entry === 'string') {
          return { message: entry };
        }
        if (isRecord(entry)) {
          const message = typeof entry['message'] === 'string' ? entry['message'] : undefined;
          if (!message) {
            return undefined;
          }
          const detail: ErrorDetail = { message };
          if (typeof entry['field'] === 'string') {
            detail.field = entry['field'];
          }
          if (typeof entry['code'] === 'string') {
            detail.code = entry['code'];
          }
          return detail;
        }
        return undefined;
      })
      .filter(isDefined);
    return mapped.length > 0 ? mapped : undefined;
  }

  if (isRecord(input)) {
    const mapped: ErrorDetail[] = [];
    for (const [field, value] of Object.entries(input)) {
      if (typeof value === 'string') {
        mapped.push({ field, message: value });
      } else if (Array.isArray(value)) {
        const message = value.find((entry) => typeof entry === 'string');
        if (typeof message === 'string') {
          mapped.push({ field, message });
        }
      }
    }
    return mapped.length > 0 ? mapped : undefined;
  }

  return undefined;
};

type SerializableFormValue =
  | string
  | number
  | boolean
  | Blob
  | File
  | Date
  | Record<string, unknown>
  | Array<unknown>
  | null
  | undefined;

type FormDataPayload = Record<string, SerializableFormValue>;

type QueryParamValue =
  | string
  | number
  | boolean
  | readonly (string | number | boolean)[]
  | null
  | undefined;

type QueryParams = Record<string, QueryParamValue>;

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
};

export class SecureApiClient {
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
    const defaults = this.client.defaults.headers.common as
      | AxiosHeaders
      | Record<string, string | undefined>
      | undefined;

    if (token) {
      if (defaults instanceof AxiosHeaders) {
        defaults.set('Authorization', `Bearer ${token}`);
      } else if (defaults) {
        defaults['Authorization'] = `Bearer ${token}`;
      }
      secureLogger.debug('Auth token set for API client');
      return;
    }

    if (defaults instanceof AxiosHeaders) {
      defaults.delete('Authorization');
    } else if (defaults) {
      delete defaults['Authorization'];
    }
    secureLogger.debug('Auth token cleared from API client');
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

  private transformError(error: unknown): ApiErrorResponse {
    const timestamp = new Date().toISOString();

    if (isAxiosError(error)) {
      const status = error.response?.status;
      const payload = isRecord(error.response?.data) ? (error.response?.data as Record<string, unknown>) : undefined;

      const payloadMessage =
        payload && typeof payload['message'] === 'string' ? (payload['message'] as string) : undefined;

      const resolvedMessage = ENV_CONFIG.isProduction()
        ? 'An error occurred. Please try again.'
        : payloadMessage ?? error.message ?? 'Request failed';

      const code =
        payload && typeof payload['code'] === 'string'
          ? (payload['code'] as string)
          : error.code ?? 'API_ERROR';

      const envelope: ErrorEnvelope = {
        code,
        message: resolvedMessage,
      };

      const detailEntries = payload ? collectErrorDetails(payload['details']) : undefined;
      if (detailEntries) {
        envelope.details = detailEntries;
      }

      if (payload && isRecord(payload['meta'])) {
        envelope.meta = payload['meta'] as Record<string, unknown>;
      }

      secureLogger.warn('API request failed', {
        status,
        url: error.config?.url,
        method: error.config?.method,
      });

      return {
        success: false,
        message: resolvedMessage,
        error: envelope,
        timestamp,
        status,
        path: error.config?.url,
      };
    }

    const fallbackMessage =
      ENV_CONFIG.isProduction()
        ? 'Unable to complete the request at this time.'
        : error instanceof Error
          ? error.message
          : 'An unexpected error occurred';

    return {
      success: false,
      message: fallbackMessage,
      error: {
        code: 'UNKNOWN_ERROR',
        message: fallbackMessage,
      },
      timestamp,
    };
  }

  // ---------------------------------------------------------------------------
  // HTTP Methods
  // ---------------------------------------------------------------------------

  async get<TResponse>(url: string, config?: AxiosRequestConfig): Promise<ApiSuccessResponse<TResponse>> {
    const response = await this.client.get<TResponse>(url, config);
    return this.wrapResponse(response);
  }

  async post<TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: AxiosRequestConfig<TBody>,
  ): Promise<ApiSuccessResponse<TResponse>> {
    const response = await this.client.post<TResponse, AxiosResponse<TResponse>, TBody>(url, data, config);
    return this.wrapResponse(response);
  }

  async put<TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: AxiosRequestConfig<TBody>,
  ): Promise<ApiSuccessResponse<TResponse>> {
    const response = await this.client.put<TResponse, AxiosResponse<TResponse>, TBody>(url, data, config);
    return this.wrapResponse(response);
  }

  async patch<TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: AxiosRequestConfig<TBody>,
  ): Promise<ApiSuccessResponse<TResponse>> {
    const response = await this.client.patch<TResponse, AxiosResponse<TResponse>, TBody>(url, data, config);
    return this.wrapResponse(response);
  }

  async delete<TResponse = void>(url: string, config?: AxiosRequestConfig): Promise<ApiSuccessResponse<TResponse>> {
    const response = await this.client.delete<TResponse>(url, config);
    return this.wrapResponse(response);
  }

  // ---------------------------------------------------------------------------
  // Response Wrapper
  // ---------------------------------------------------------------------------

  private wrapResponse<T>(response: AxiosResponse<T>): ApiSuccessResponse<T> {
    return {
      success: true,
      data: response.data,
      message: response.statusText || 'Success',
      timestamp: new Date().toISOString(),
      status: response.status,
      path: response.config?.url,
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
  createFormData(data: FormDataPayload): FormData {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      if (value instanceof File) {
        formData.append(key, value);
        secureLogger.debug('File added to FormData', { filename: value.name, size: value.size });
        return;
      }

      if (value instanceof Blob) {
        formData.append(key, value);
        return;
      }

      if (value instanceof Date) {
        formData.append(key, value.toISOString());
        return;
      }

      if (Array.isArray(value) || isRecord(value)) {
        formData.append(key, JSON.stringify(value));
        return;
      }

      formData.append(key, String(value));
    });

    return formData;
  }

  // Create query string from object
  createQueryString(params: QueryParams): string {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry !== null && entry !== undefined) {
            queryParams.append(key, String(entry));
          }
        });
        return;
      }

      queryParams.append(key, String(value));
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











