/**
 * Unified Error Handling Utility
 * 
 * Centralized error handling patterns for consistent user experience
 * and secure error reporting across the application.
 */

import { secureLogger } from './secure-logger';
import { ENV_CONFIG } from './environment';
import type { ApiErrorResponse } from '../types/api';

// =============================================================================
// Error Types & Interfaces
// =============================================================================

export interface AppError {
  type: 'api' | 'validation' | 'network' | 'auth' | 'permission' | 'unknown';
  message: string;
  code?: string | number;
  details?: any;
  timestamp: string;
}

export interface ErrorHandlerOptions {
  component?: string;
  action?: string;
  userId?: number;
  reportToUser?: boolean;
  reportToService?: boolean;
}

// =============================================================================
// Error Classification
// =============================================================================

/**
 * Classify error type based on status code or error characteristics
 */
export function classifyError(error: any): AppError['type'] {
  // API errors with status codes
  if (typeof error.status === 'number') {
    if (error.status === 401) return 'auth';
    if (error.status === 403) return 'permission';
    if (error.status >= 400 && error.status < 500) return 'validation';
    if (error.status >= 500) return 'api';
  }

  // Network errors
  if (error.code === 'NETWORK_ERROR' || error.name === 'NetworkError') {
    return 'network';
  }

  // Validation errors (client-side)
  if (error.name === 'ValidationError' || error.type === 'validation') {
    return 'validation';
  }

  // Authentication errors
  if (error.message?.toLowerCase().includes('auth') || 
      error.message?.toLowerCase().includes('token') ||
      error.message?.toLowerCase().includes('login')) {
    return 'auth';
  }

  return 'unknown';
}

/**
 * Transform various error formats into standardized AppError
 */
export function normalizeError(error: any): AppError {
  const timestamp = new Date().toISOString();
  const type = classifyError(error);

  // Handle API errors from secure client
  if (error.status && error.message) {
    return {
      type,
      message: error.message,
      code: error.status,
      details: ENV_CONFIG.isDevelopment() ? error.details : undefined,
      timestamp
    };
  }

  // Handle standard JavaScript errors
  if (error instanceof Error) {
    return {
      type,
      message: error.message,
      details: ENV_CONFIG.isDevelopment() ? { stack: error.stack } : undefined,
      timestamp
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      type,
      message: error,
      timestamp
    };
  }

  // Fallback for unknown error formats
  return {
    type: 'unknown',
    message: 'An unexpected error occurred',
    details: ENV_CONFIG.isDevelopment() ? error : undefined,
    timestamp
  };
}

// =============================================================================
// User-Friendly Messages
// =============================================================================

/**
 * Convert technical errors into user-friendly messages
 */
export function getUserFriendlyMessage(error: AppError): string {
  switch (error.type) {
    case 'auth':
      return 'Your session has expired. Please log in again.';
    
    case 'permission':
      return 'You do not have permission to perform this action.';
    
    case 'network':
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    
    case 'validation':
      // Return the specific validation message if available
      return error.message || 'Please check your input and try again.';
    
    case 'api':
      if (ENV_CONFIG.isDevelopment()) {
        return error.message || 'A server error occurred. Please try again.';
      }
      return 'A server error occurred. Please try again later.';
    
    case 'unknown':
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

// =============================================================================
// Error Handler
// =============================================================================

/**
 * Main error handling function
 */
export function handleError(error: any, options: ErrorHandlerOptions = {}): AppError {
  const {
    component = 'Unknown',
    action = 'unknown',
    userId,
    reportToUser = true,
    reportToService = true
  } = options;

  const normalizedError = normalizeError(error);

  // Log error with security considerations
  if (reportToService) {
    const logContext = {
      component,
      action,
      errorType: normalizedError.type,
      errorCode: normalizedError.code,
      userId,
      timestamp: normalizedError.timestamp
    };

    switch (normalizedError.type) {
      case 'auth':
      case 'permission':
        secureLogger.security('error_occurred', logContext);
        break;
      
      case 'api':
      case 'network':
        secureLogger.error(`${component}: ${action} failed`, logContext);
        break;
      
      case 'validation':
        secureLogger.warn(`${component}: Validation error in ${action}`, logContext);
        break;
      
      default:
        secureLogger.error(`${component}: Unexpected error in ${action}`, logContext);
    }
  }

  return normalizedError;
}

// =============================================================================
// Error Boundary Helpers
// =============================================================================

/**
 * Create error info for React Error Boundaries
 */
export function createErrorInfo(error: Error, errorInfo: any) {
  return {
    message: error.message,
    stack: ENV_CONFIG.isDevelopment() ? error.stack : undefined,
    componentStack: ENV_CONFIG.isDevelopment() ? errorInfo.componentStack : undefined,
    timestamp: new Date().toISOString()
  };
}

/**
 * Report error to external service (placeholder for future implementation)
 */
export function reportErrorToService(error: AppError, context: any = {}) {
  if (ENV_CONFIG.isProduction()) {
    // In production, you might send this to an error monitoring service
    // For now, just log it securely
    secureLogger.error('Error reported to service', {
      error: {
        type: error.type,
        message: error.message,
        code: error.code,
        timestamp: error.timestamp
      },
      context
    });
  }
}

// =============================================================================
// Retry Logic
// =============================================================================

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
  shouldRetry?: (error: AppError) => boolean;
}

/**
 * Default retry strategy - retry on network and temporary API errors
 */
const defaultShouldRetry = (error: AppError): boolean => {
  return error.type === 'network' || 
         (error.type === 'api' && typeof error.code === 'number' && error.code >= 500);
};

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = true,
    shouldRetry = defaultShouldRetry
  } = options;

  let lastError: AppError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = normalizeError(error);
      
      // Don't retry if this is the last attempt or if we shouldn't retry this error
      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        throw lastError;
      }

      // Calculate delay with optional backoff
      const currentDelay = backoff ? delay * Math.pow(2, attempt - 1) : delay;
      
      secureLogger.debug(`Retrying operation (attempt ${attempt + 1}/${maxAttempts})`, {
        error: lastError.message,
        delay: currentDelay
      });
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }
  
  throw lastError!;
}

// =============================================================================
// Exports
// =============================================================================

export default {
  handle: handleError,
  normalize: normalizeError,
  classify: classifyError,
  getUserMessage: getUserFriendlyMessage,
  withRetry,
  reportToService: reportErrorToService,
  createErrorInfo
};