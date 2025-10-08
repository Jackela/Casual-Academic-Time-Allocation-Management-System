/**

 * Error Logger for CATAMS Application

 * 

 * Centralized error logging and reporting utility that handles:

 * - Error categorization and severity assessment

 * - Local storage of errors for offline scenarios

 * - External error reporting (when available)

 * - Error deduplication to prevent spam

 * - Context enrichment for better debugging

 */

import type { SecureLogValue } from '../types/logging';

export interface ErrorContext {

  errorId: string;

  level: 'page' | 'component' | 'critical';

  user?: {

    id: number;

    email: string;

    role: string;

  } | null;

  timestamp: string;

  userAgent: string;

  url: string;

  componentStack?: string;

  errorBoundary?: string;

  additionalContext?: Record<string, SecureLogValue>;

}



export interface ErrorLogEntry {

  error: {

    message: string;

    stack?: string;

    name: string;

  };

  context: ErrorContext;

  count: number;

  firstOccurrence: string;

  lastOccurrence: string;

}




interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

interface NavigatorWithConnection extends Navigator {
  connection?: {
    effectiveType?: string;
    downlink?: number;
  };
}

const getPerformanceMemorySummary = (): { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } | null => {
  if (typeof performance === 'undefined') {
    return null;
  }

  const candidate = (performance as PerformanceWithMemory).memory;
  if (!candidate) {
    return null;
  }

  return {
    usedJSHeapSize: candidate.usedJSHeapSize,
    totalJSHeapSize: candidate.totalJSHeapSize,
    jsHeapSizeLimit: candidate.jsHeapSizeLimit,
  };
};

const getNavigatorConnectionSummary = (): { effectiveType?: string; downlink?: number } | null => {
  if (typeof navigator === 'undefined') {
    return null;
  }

  const connection = (navigator as NavigatorWithConnection).connection;
  if (!connection) {
    return null;
  }

  return {
    effectiveType: connection.effectiveType ?? undefined,
    downlink: typeof connection.downlink === 'number' ? connection.downlink : undefined,
  };
};

interface ErrorReportingConfig {

  maxLocalErrors: number;

  deduplicationWindow: number; // milliseconds

  enableConsoleLogging: boolean;

  enableLocalStorage: boolean;

  enableExternalReporting: boolean;

  externalEndpoint?: string;

}



export class ErrorLogger {

  private config: ErrorReportingConfig;

  private errorCache: Map<string, ErrorLogEntry>;

  private readonly STORAGE_KEY = 'catams_error_logs';



  constructor(config?: Partial<ErrorReportingConfig>) {

    this.config = {

      maxLocalErrors: 50,

      deduplicationWindow: 5 * 60 * 1000, // 5 minutes

      enableConsoleLogging: process.env.NODE_ENV === 'development',

      enableLocalStorage: true,

      enableExternalReporting: process.env.NODE_ENV === 'production',

      externalEndpoint: '/api/errors', // Backend endpoint for error reporting

      ...config

    };



    this.errorCache = new Map();

    this.loadErrorsFromStorage();

  }



  /**

   * Log an error with context

   */

  public logError(error: Error, context: ErrorContext): void {

    const errorKey = this.generateErrorKey(error, context);

    const now = new Date().toISOString();



    // Check for duplicate errors within deduplication window

    const existingError = this.errorCache.get(errorKey);

    if (existingError && this.isWithinDeduplicationWindow(existingError.lastOccurrence)) {

      // Update existing error

      existingError.count++;

      existingError.lastOccurrence = now;

      this.errorCache.set(errorKey, existingError);

    } else {

      // Create new error entry

      const errorEntry: ErrorLogEntry = {

        error: {

          message: error.message,

          stack: error.stack,

          name: error.name

        },

        context: {

          ...context,

          additionalContext: this.gatherAdditionalContext()

        },

        count: 1,

        firstOccurrence: now,

        lastOccurrence: now

      };



      this.errorCache.set(errorKey, errorEntry);

    }



    // Perform logging actions

    this.performLogging(error, context);



    // Clean up old errors

    this.cleanupOldErrors();



    // Save to storage

    if (this.config.enableLocalStorage) {

      this.saveErrorsToStorage();

    }

  }



  /**

   * Get all logged errors

   */

  public getErrors(): ErrorLogEntry[] {

    return Array.from(this.errorCache.values())

      .sort((a, b) => new Date(b.lastOccurrence).getTime() - new Date(a.lastOccurrence).getTime());

  }



  /**

   * Clear all logged errors

   */

  public clearErrors(): void {

    this.errorCache.clear();

    if (this.config.enableLocalStorage) {

      localStorage.removeItem(this.STORAGE_KEY);

    }

  }



  /**

   * Get error statistics

   */

  public getErrorStats(): {

    totalErrors: number;

    uniqueErrors: number;

    criticalErrors: number;

    recentErrors: number;

  } {

    const errors = this.getErrors();

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();



    return {

      totalErrors: errors.reduce((sum, error) => sum + error.count, 0),

      uniqueErrors: errors.length,

      criticalErrors: errors.filter(error => error.context.level === 'critical').length,

      recentErrors: errors.filter(error => error.lastOccurrence > oneHourAgo).length

    };

  }



  /**

   * Export errors for debugging or support

   */

  public exportErrors(): string {

    const errors = this.getErrors();

    const exportData = {

      exportedAt: new Date().toISOString(),

      applicationVersion: process.env.REACT_APP_VERSION || 'unknown',

      userAgent: navigator.userAgent,

      errors: errors

    };



    return JSON.stringify(exportData, null, 2);

  }



  private generateErrorKey(error: Error, context: ErrorContext): string {

    // Create a unique key based on error message, stack trace line, and component

    const stackLine = error.stack?.split('\n')[1] || '';

    const component = context.componentStack?.split('\n')[1] || '';

    return `${error.name}:${error.message}:${stackLine}:${component}`.replace(/\s+/g, '_');

  }



  private isWithinDeduplicationWindow(lastOccurrence: string): boolean {

    const lastTime = new Date(lastOccurrence).getTime();

    const now = Date.now();

    return (now - lastTime) < this.config.deduplicationWindow;

  }



  private performLogging(error: Error, context: ErrorContext): void {

    if (this.config.enableConsoleLogging) {

      void import('./secure-logger')

        .then(({ secureLogger }) => {

          if (context.level === 'critical') {

            secureLogger.error(`[ErrorLogger] ${context.level.toUpperCase()}: ${error.message}`, { error, context });

          } else {

            secureLogger.warn(`[ErrorLogger] ${context.level.toUpperCase()}: ${error.message}`, { error, context });

          }

        })

        .catch(() => {

          const logMethod = context.level === 'critical' ? console.error : console.warn;

          logMethod(`[ErrorLogger] ${context.level.toUpperCase()}: ${error.message}`, { error, context });

        });

    }



    if (this.config.enableExternalReporting) {

      this.reportToExternal(error, context);

    }

  }

  private async reportToExternal(error: Error, context: ErrorContext): Promise<void> {
    if (!this.config.externalEndpoint) {
      return;
    }

    try {
      const response = await fetch(this.config.externalEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          context,
        }),
      });

      if (!response.ok) {
        await import('./secure-logger')
          .then(({ secureLogger }) => {
            secureLogger.warn('Failed to report error to external service', response.statusText);
          })
          .catch(() => {
            console.warn('Failed to report error to external service:', response.statusText);
          });
      }
    } catch (reportingError) {
      await import('./secure-logger')
        .then(({ secureLogger }) => {
          secureLogger.warn('Error while reporting to external service', reportingError);
        })
        .catch(() => {
          console.warn('Error while reporting to external service:', reportingError);
        });
    }
  }

  private gatherAdditionalContext(): Record<string, SecureLogValue> {
    const context: Record<string, SecureLogValue> = {};

    if (typeof window !== 'undefined') {
      context.viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      context.screen = {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth,
      };
    }

    const memorySummary = getPerformanceMemorySummary();
    context.memory = memorySummary ?? null;

    const connectionSummary = getNavigatorConnectionSummary();
    context.connection = connectionSummary ?? null;

    if (typeof navigator !== 'undefined') {
      context.language = navigator.language;
      context.platform = navigator.platform;
      context.cookieEnabled = navigator.cookieEnabled;
    }

    context.localStorage = this.checkLocalStorageAvailability();
    context.sessionStorage = this.checkSessionStorageAvailability();

    return context;

  }



  private checkLocalStorageAvailability(): boolean {

    try {

      const test = 'test';

      localStorage.setItem(test, test);

      localStorage.removeItem(test);

      return true;

    } catch {

      return false;

    }

  }



  private checkSessionStorageAvailability(): boolean {

    try {

      const test = 'test';

      sessionStorage.setItem(test, test);

      sessionStorage.removeItem(test);

      return true;

    } catch {

      return false;

    }

  }



  private cleanupOldErrors(): void {

    if (this.errorCache.size <= this.config.maxLocalErrors) return;



    const errors = Array.from(this.errorCache.entries())

      .sort(([, a], [, b]) => new Date(b.lastOccurrence).getTime() - new Date(a.lastOccurrence).getTime());



    // Keep only the most recent errors

    const toKeep = errors.slice(0, this.config.maxLocalErrors);

    this.errorCache.clear();

    toKeep.forEach(([key, error]) => this.errorCache.set(key, error));

  }



  private loadErrorsFromStorage(): void {

    if (!this.config.enableLocalStorage) return;



    try {

      const stored = localStorage.getItem(this.STORAGE_KEY);

      if (stored) {

        const errors: [string, ErrorLogEntry][] = JSON.parse(stored);

        this.errorCache = new Map(errors);

      }

    } catch (error) {

      void import('./secure-logger')

        .then(({ secureLogger }) => {

          secureLogger.warn('Failed to load errors from storage', error);

        })

        .catch(() => {

          console.warn('Failed to load errors from storage:', error);

        });

    }

  }



  private saveErrorsToStorage(): void {

    try {

      const errors = Array.from(this.errorCache.entries());

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(errors));

    } catch (error) {

      void import('./secure-logger')

        .then(({ secureLogger }) => {

          secureLogger.warn('Failed to save errors to storage', error);

        })

        .catch(() => {

          console.warn('Failed to save errors to storage:', error);

        });

    }

  }

}



// Global error handler for unhandled promise rejections

export const setupGlobalErrorHandling = (errorLogger: ErrorLogger) => {

  // Handle unhandled promise rejections

  window.addEventListener('unhandledrejection', (event) => {

    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));

    

    errorLogger.logError(error, {

      errorId: `unhandled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

      level: 'critical',

      timestamp: new Date().toISOString(),

      userAgent: navigator.userAgent,

      url: window.location.href,

      additionalContext: {
        type: 'unhandledrejection',
        promise: '[promise]',
        reason: typeof event.reason === 'string' ? event.reason : String(event.reason),
      }

    });

  });



  // Handle global errors

  window.addEventListener('error', (event) => {

    const error = event.error || new Error(event.message);

    

    errorLogger.logError(error, {

      errorId: `global_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

      level: 'critical',

      timestamp: new Date().toISOString(),

      userAgent: navigator.userAgent,

      url: window.location.href,

      additionalContext: {

        type: 'global_error',

        filename: event.filename,

        lineno: event.lineno,

        colno: event.colno

      }

    });

  });

};



export default ErrorLogger;
