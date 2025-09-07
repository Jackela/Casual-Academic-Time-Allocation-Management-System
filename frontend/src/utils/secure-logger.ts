/**
 * Secure Logger Utility
 * 
 * Environment-aware logging that prevents sensitive data exposure in production.
 * Provides safe logging methods that automatically filter content based on environment.
 */

import { ENV_CONFIG } from './environment';

/**
 * Sensitive data patterns that should never be logged in production
 */
const SENSITIVE_PATTERNS = [
  /token/i,
  /password/i,
  /secret/i,
  /key/i,
  /auth/i,
  /bearer/i,
  /jwt/i,
  /session/i,
  /credential/i,
  /api[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /client[_-]?secret/i,
  /private[_-]?key/i,
];

/**
 * Check if a string contains sensitive information
 */
const containsSensitiveData = (text: string): boolean => {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(text));
};

/**
 * Sanitize object by removing or masking sensitive properties
 */
const sanitizeObject = (obj: any, depth = 0): any => {
  if (depth > 10) return '[Max Depth Reached]'; // Prevent infinite recursion
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return containsSensitiveData(obj) ? '[REDACTED]' : obj;
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: containsSensitiveData(obj.message) ? '[REDACTED ERROR]' : obj.message,
      stack: ENV_CONFIG.isDevelopment() ? obj.stack : '[REDACTED]'
    };
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (containsSensitiveData(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeObject(value, depth + 1);
      }
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * Create production-safe log message
 */
const createSafeLogMessage = (message: string, data?: any) => {
  const safeMessage = ENV_CONFIG.isProduction() && containsSensitiveData(message) 
    ? '[REDACTED]' 
    : message;
    
  const safeData = ENV_CONFIG.isProduction() && data !== undefined 
    ? sanitizeObject(data) 
    : data;
    
  return { message: safeMessage, data: safeData };
};

/**
 * Get current timestamp for logging
 */
const getTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Secure logger interface
 */
export const secureLogger = {
  /**
   * Debug logging - only in development and E2E environments
   * Completely stripped from production builds via conditional compilation
   */
  debug: (message: string, data?: any): void => {
    if (__DEBUG_LOGGING__ && ENV_CONFIG.features.enableDetailedLogging()) {
      const { message: safeMessage, data: safeData } = createSafeLogMessage(message, data);
      if (safeData !== undefined) {
        console.debug(`[${getTimestamp()}] ${safeMessage}`, safeData);
      } else {
        console.debug(`[${getTimestamp()}] ${safeMessage}`);
      }
    }
  },

  /**
   * Info logging - filtered in production
   */
  info: (message: string, data?: any): void => {
    const { message: safeMessage, data: safeData } = createSafeLogMessage(message, data);
    if (safeData !== undefined) {
      console.info(`[${getTimestamp()}] ${safeMessage}`, safeData);
    } else {
      console.info(`[${getTimestamp()}] ${safeMessage}`);
    }
  },

  /**
   * Warning logging - always shown but sanitized in production
   */
  warn: (message: string, data?: any): void => {
    const { message: safeMessage, data: safeData } = createSafeLogMessage(message, data);
    if (safeData !== undefined) {
      console.warn(`[${getTimestamp()}] ${safeMessage}`, safeData);
    } else {
      console.warn(`[${getTimestamp()}] ${safeMessage}`);
    }
  },

  /**
   * Error logging - always shown but sanitized in production
   */
  error: (message: string, error?: any): void => {
    if (ENV_CONFIG.isProduction()) {
      // Production: Log minimal error information without sensitive details
      const sanitizedError = error instanceof Error 
        ? {
            name: error.name,
            timestamp: getTimestamp(),
            context: containsSensitiveData(message) ? '[REDACTED CONTEXT]' : message
          }
        : {
            timestamp: getTimestamp(),
            context: containsSensitiveData(message) ? '[REDACTED CONTEXT]' : message
          };
      console.error(`[${getTimestamp()}] Error occurred`, sanitizedError);
    } else {
      // Development: Full error details
      if (error !== undefined) {
        console.error(`[${getTimestamp()}] ${message}`, error);
      } else {
        console.error(`[${getTimestamp()}] ${message}`);
      }
    }
  },

  /**
   * Security logging - for authentication and authorization events
   */
  security: (event: string, context?: any): void => {
    const sanitizedContext = ENV_CONFIG.isProduction() 
      ? sanitizeObject(context)
      : context;
      
    const logData = {
      event,
      timestamp: getTimestamp(),
      environment: ENV_CONFIG.getMode(),
      context: sanitizedContext
    };
    
    console.info('[SECURITY]', logData);
  },

  /**
   * Performance logging - for monitoring and optimization
   */
  performance: (metric: string, value: number, unit: string = 'ms', context?: any): void => {
    if (ENV_CONFIG.features.enableDetailedLogging() || ENV_CONFIG.isProduction()) {
      const logData = {
        metric,
        value,
        unit,
        timestamp: getTimestamp(),
        context: ENV_CONFIG.isProduction() ? sanitizeObject(context) : context
      };
      
      console.info(`[PERF] ${metric}: ${value}${unit}`, logData);
    }
  },

  /**
   * API logging - for request/response monitoring
   */
  api: (method: string, url: string, status?: number, duration?: number, error?: any): void => {
    // Sanitize URL to remove potential sensitive query parameters
    const sanitizedUrl = url.replace(/([?&])(token|key|secret|password)=[^&]*/gi, '$1$2=[REDACTED]');
    
    const logData = {
      method,
      url: sanitizedUrl,
      status,
      duration: duration ? `${duration}ms` : undefined,
      timestamp: getTimestamp()
    };
    
    if (error) {
      const sanitizedError = ENV_CONFIG.isProduction() ? sanitizeObject(error) : error;
      secureLogger.error(`API ${method} ${sanitizedUrl} failed`, sanitizedError);
    } else {
      if (ENV_CONFIG.features.enableDetailedLogging()) {
        console.log(`[API] ${method} ${sanitizedUrl}`, logData);
      }
    }
  },

  /**
   * E2E logging - only in E2E environment for test debugging
   * Completely stripped from production builds via conditional compilation
   */
  e2e: (message: string, data?: any): void => {
    if (__E2E_GLOBALS__ && ENV_CONFIG.isE2E()) {
      console.log('[E2E]', message, data);
    }
  },

  /**
   * Conditional logging based on environment
   */
  conditional: (condition: boolean, level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void => {
    if (condition) {
      secureLogger[level](message, data);
    }
  },

  /**
   * Get current logging configuration for debugging
   */
  getConfig: () => {
    return {
      environment: ENV_CONFIG.getMode(),
      productionMode: ENV_CONFIG.isProduction(),
      developmentMode: ENV_CONFIG.isDevelopment(),
      e2eMode: ENV_CONFIG.isE2E(),
      detailedLogging: ENV_CONFIG.features.enableDetailedLogging(),
      debugMode: ENV_CONFIG.features.enableDebugMode()
    };
  }
} as const;

export default secureLogger;

/**
 * Legacy console replacement for gradual migration
 * @deprecated Use secureLogger methods instead
 */
export const safeConsole = {
  log: secureLogger.info,
  debug: secureLogger.debug,
  info: secureLogger.info,
  warn: secureLogger.warn,
  error: secureLogger.error
} as const;