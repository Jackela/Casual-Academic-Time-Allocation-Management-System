/**
 * Secure Logger Utility
 *
 * Environment-aware logging that prevents sensitive data exposure in production.
 * Provides safe logging methods that automatically filter content based on environment.
 */

import { ENV_CONFIG } from './environment';
import type { SecureLogPayload, SecureLogValue } from '../types/logging';

type MacroGlobals = typeof globalThis & {
  __PRODUCTION_BUILD__?: boolean;
  __STRIP_SENSITIVE_DATA__?: boolean;
  __E2E_GLOBALS__?: boolean;
};

const macroGlobals = globalThis as MacroGlobals;
const isProductionMode = (): boolean => {
  if (ENV_CONFIG.isProduction()) {
    return true;
  }

  if (typeof __PRODUCTION_BUILD__ !== 'undefined' && __PRODUCTION_BUILD__) {
    return true;
  }

  if (typeof __STRIP_SENSITIVE_DATA__ !== 'undefined' && __STRIP_SENSITIVE_DATA__) {
    return true;
  }

  if (macroGlobals.__PRODUCTION_BUILD__ || macroGlobals.__STRIP_SENSITIVE_DATA__) {
    return true;
  }

  if (typeof process !== 'undefined') {
    if (process.env?.NODE_ENV === 'production') {
      return true;
    }
    if (process.env?.SECURE_LOGGER_FORCE_PROD === 'true') {
      return true;
    }
  }

  return false;
};

const isE2EMode = (): boolean => {
  if (ENV_CONFIG.isE2E()) {
    return true;
  }

  if (typeof process !== 'undefined') {
    if (process.env?.NODE_ENV === 'e2e') {
      return true;
    }
    if (process.env?.VITE_E2E === 'true') {
      return true;
    }
    if (process.env?.SECURE_LOGGER_FORCE_E2E === 'true') {
      return true;
    }
  }

  return false;
};

const DEBUG_LOGGING_FLAG = typeof __DEBUG_LOGGING__ !== 'undefined'
  ? __DEBUG_LOGGING__
  : false;

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

const containsSensitiveData = (text: string): boolean => {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
};

const sanitizeObject = (value: unknown, depth = 0): SecureLogValue => {
  if (depth > 10) {
    return '[Max Depth Reached]';
  }

  if (value === null || value === undefined) {
    return value as null | undefined;
  }

  if (typeof value === 'string') {
    return containsSensitiveData(value) ? '[REDACTED]' : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'bigint' || typeof value === 'symbol' || typeof value === 'function') {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    const exposeStack = !isProductionMode() && ENV_CONFIG.isDevelopment();
    return {
      name: value.name,
      message: containsSensitiveData(value.message) ? '[REDACTED ERROR]' : value.message,
      stack: exposeStack ? value.stack ?? '[No Stack]' : '[REDACTED]',
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObject(item, depth + 1));
  }

  if (value instanceof Set) {
    return Array.from(value).map((item) => sanitizeObject(item, depth + 1));
  }

  if (value instanceof Map) {
    const mapped: Record<string, SecureLogValue> = {};
    value.forEach((mapValue, key) => {
      mapped[String(key)] = sanitizeObject(mapValue, depth + 1);
    });
    return mapped;
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, SecureLogValue> = {};
    for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = containsSensitiveData(key)
        ? '[REDACTED]'
        : sanitizeObject(entryValue, depth + 1);
    }
    return sanitized;
  }

  return String(value);
};

const sanitizeValue = (value: SecureLogPayload | undefined): SecureLogValue | undefined => {
  if (value === undefined) {
    return undefined;
  }
  return sanitizeObject(value);
};

const createSafeLogMessage = (message: string, data?: SecureLogPayload) => {
  const productionMode = isProductionMode();

  const safeMessage = productionMode && containsSensitiveData(message)
    ? '[REDACTED]'
    : message;

  const safeData: SecureLogPayload | undefined = productionMode && data !== undefined
    ? sanitizeObject(data)
    : data;

  return { message: safeMessage, data: safeData };
};

const getTimestamp = (): string => {
  return new Date().toISOString();
};

export const secureLogger = {

  debug: (message: string, data?: SecureLogPayload): void => {
    if (DEBUG_LOGGING_FLAG && ENV_CONFIG.features.enableDetailedLogging()) {
      const { message: safeMessage, data: safeData } = createSafeLogMessage(message, data);
      if (safeData !== undefined) {
        console.info(`[${getTimestamp()}] ${safeMessage}`, safeData);
      } else {
        console.info(`[${getTimestamp()}] ${safeMessage}`);
      }
    }
  },

  info: (message: string, data?: SecureLogPayload): void => {
    const { message: safeMessage, data: safeData } = createSafeLogMessage(message, data);
    if (safeData !== undefined) {
      console.info(`[${getTimestamp()}] ${safeMessage}`, safeData);
    } else {
      console.info(`[${getTimestamp()}] ${safeMessage}`);
    }
  },

  warn: (message: string, data?: SecureLogPayload): void => {
    const { message: safeMessage, data: safeData } = createSafeLogMessage(message, data);
    if (safeData !== undefined) {
      console.warn(`[${getTimestamp()}] ${safeMessage}`, safeData);
    } else {
      console.warn(`[${getTimestamp()}] ${safeMessage}`);
    }
  },

  error: (message: string, error?: SecureLogPayload): void => {
    if (isProductionMode()) {
      const safeMessage = containsSensitiveData(message) ? '[REDACTED]' : message;
      const sanitizedError = sanitizeValue(error);
      if (sanitizedError !== undefined) {
        console.error(`[${getTimestamp()}] ${safeMessage}`, sanitizedError);
      } else {
        console.error(`[${getTimestamp()}] ${safeMessage}`);
      }
      return;
    }

    if (error !== undefined) {
      console.error(`[${getTimestamp()}] ${message}`, error);
    } else {
      console.error(`[${getTimestamp()}] ${message}`);
    }
  },

  security: (event: string, context?: SecureLogPayload): void => {
    const payload = isProductionMode() ? sanitizeValue(context) : context;
    const logData = {
      event,
      timestamp: getTimestamp(),
      environment: ENV_CONFIG.getMode(),
      context: payload,
    };

    console.info('[SECURITY]', logData);
  },

  performance: (metric: string, value: number, unit: string = 'ms', context?: SecureLogPayload): void => {
    if (ENV_CONFIG.features.enableDetailedLogging() || isProductionMode()) {
      const payload = isProductionMode() ? sanitizeValue(context) : context;
      const logData = {
        metric,
        value,
        unit,
        timestamp: getTimestamp(),
        context: payload,
      };

      console.info(`[PERF] ${metric}: ${value}${unit}`, logData);
    }
  },

  api: (method: string, url: string, status?: number, duration?: number, error?: SecureLogPayload): void => {
    const sanitizedUrl = url.replace(/([?&])(token|key|secret|password)=[^&]*/gi, '$1$2=[REDACTED]');

    const logData = {
      method,
      url: sanitizedUrl,
      status,
      duration: duration ? `${duration}ms` : undefined,
      timestamp: getTimestamp(),
    };

    if (error) {
      // Detect and skip noisy cancellation logs from axios/fetch
      const name = (error as any)?.name?.toString?.() ?? '';
      const code = (error as any)?.code?.toString?.() ?? '';
      const message = (error as any)?.message?.toString?.() ?? '';
      const isCancel =
        name === 'CanceledError' ||
        name === 'AbortError' ||
        code === 'ERR_CANCELED' ||
        code === 'ECONNABORTED' ||
        message.toLowerCase() === 'canceled' ||
        message.toLowerCase() === 'cancelled' ||
        Boolean((error as any)?.__CANCEL__);
      if (isCancel) {
        return;
      }
      const payload = isProductionMode() ? sanitizeValue(error) : error;
      secureLogger.error(`API ${method} ${sanitizedUrl} failed`, payload);
    } else if (ENV_CONFIG.features.enableDetailedLogging()) {
      console.log(`[API] ${method} ${sanitizedUrl}`, logData);
    }
  },

  e2e: (message: string, data?: SecureLogPayload): void => {
    const hasE2EFlag = (() => {
      try {
        if (typeof __E2E_GLOBALS__ !== 'undefined' && __E2E_GLOBALS__) {
          return true;
        }
      } catch {
        // ignore
      }
      return Boolean(macroGlobals.__E2E_GLOBALS__);
    })();

    if (hasE2EFlag && isE2EMode()) {
      console.log('E2E', message, data);
    }
  },

  conditional: (
    condition: boolean,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: SecureLogPayload,
  ): void => {
    if (condition) {
      secureLogger[level](message, data);
    }
  },

  getConfig: () => ({
    environment: ENV_CONFIG.getMode(),
    productionMode: isProductionMode(),
    developmentMode: ENV_CONFIG.isDevelopment(),
    e2eMode: ENV_CONFIG.isE2E(),
    detailedLogging: ENV_CONFIG.features.enableDetailedLogging(),
    debugMode: ENV_CONFIG.features.enableDebugMode(),
  }),
} as const;

export default secureLogger;

export const safeConsole = {
  log: secureLogger.info,
  debug: secureLogger.debug,
  info: secureLogger.info,
  warn: secureLogger.warn,
  error: secureLogger.error,
} as const;
