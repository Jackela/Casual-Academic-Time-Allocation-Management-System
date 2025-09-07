/**
 * Error Reporter Utility for CATAMS
 * 
 * Provides developer tools and debugging utilities for error management.
 * Includes error analytics, performance monitoring, and diagnostic tools.
 */

import { ErrorLogger, type ErrorLogEntry } from './error-logger';

export interface ErrorAnalytics {
  errorRate: number;
  topErrors: Array<{
    message: string;
    count: number;
    percentage: number;
  }>;
  errorsByLevel: Record<string, number>;
  errorsByComponent: Record<string, number>;
  recentTrends: Array<{
    hour: string;
    count: number;
  }>;
}

export interface PerformanceMetrics {
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };
  renderingPerformance: {
    averageRenderTime: number;
    slowRenders: number;
  };
  apiPerformance: {
    averageResponseTime: number;
    slowRequests: number;
    failedRequests: number;
  };
}

export class ErrorReporter {
  private errorLogger: ErrorLogger;
  private performanceObserver?: PerformanceObserver;
  private renderMetrics: Array<{ duration: number; timestamp: number }> = [];

  constructor(errorLogger: ErrorLogger) {
    this.errorLogger = errorLogger;
    this.setupPerformanceMonitoring();
  }

  /**
   * Get comprehensive error analytics
   */
  public getErrorAnalytics(): ErrorAnalytics {
    const errors = this.errorLogger.getErrors();
    const totalErrors = errors.reduce((sum, error) => sum + error.count, 0);

    // Calculate error rate (errors per session/hour)
    const sessionStart = new Date(Date.now() - 60 * 60 * 1000); // Last hour
    const recentErrors = errors.filter(
      error => new Date(error.lastOccurrence) > sessionStart
    );
    const errorRate = recentErrors.reduce((sum, error) => sum + error.count, 0);

    // Top errors by frequency
    const topErrors = errors
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(error => ({
        message: error.error.message,
        count: error.count,
        percentage: totalErrors > 0 ? (error.count / totalErrors) * 100 : 0
      }));

    // Errors by level
    const errorsByLevel = errors.reduce((acc, error) => {
      const level = error.context.level;
      acc[level] = (acc[level] || 0) + error.count;
      return acc;
    }, {} as Record<string, number>);

    // Errors by component (extract from component stack)
    const errorsByComponent = errors.reduce((acc, error) => {
      const componentMatch = error.context.componentStack?.match(/in (\\w+)/);
      const component = componentMatch ? componentMatch[1] : 'Unknown';
      acc[component] = (acc[component] || 0) + error.count;
      return acc;
    }, {} as Record<string, number>);

    // Recent trends (last 24 hours by hour)
    const recentTrends = this.calculateHourlyTrends(errors);

    return {
      errorRate,
      topErrors,
      errorsByLevel,
      errorsByComponent,
      recentTrends
    };
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    const memoryUsage = this.getMemoryUsage();
    const renderingPerformance = this.getRenderingPerformance();
    const apiPerformance = this.getApiPerformance();

    return {
      memoryUsage,
      renderingPerformance,
      apiPerformance
    };
  }

  /**
   * Generate comprehensive error report
   */
  public generateReport(): string {
    const analytics = this.getErrorAnalytics();
    const performance = this.getPerformanceMetrics();
    const stats = this.errorLogger.getErrorStats();

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalErrors: stats.totalErrors,
        uniqueErrors: stats.uniqueErrors,
        criticalErrors: stats.criticalErrors,
        recentErrors: stats.recentErrors,
        errorRate: analytics.errorRate
      },
      topErrors: analytics.topErrors,
      errorDistribution: {
        byLevel: analytics.errorsByLevel,
        byComponent: analytics.errorsByComponent
      },
      performance,
      trends: analytics.recentTrends,
      systemInfo: this.getSystemInfo(),
      recommendations: this.generateRecommendations(analytics, performance)
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Export errors in different formats
   */
  public exportErrors(format: 'json' | 'csv' | 'html' = 'json'): string {
    const errors = this.errorLogger.getErrors();

    switch (format) {
      case 'csv':
        return this.exportToCSV(errors);
      case 'html':
        return this.exportToHTML(errors);
      case 'json':
      default:
        return this.errorLogger.exportErrors();
    }
  }

  /**
   * Download error report
   */
  public downloadReport(format: 'json' | 'csv' | 'html' = 'json'): void {
    const content = format === 'json' ? this.generateReport() : this.exportErrors(format);
    const filename = `catams-error-report-${Date.now()}.${format}`;
    const mimeType = {
      json: 'application/json',
      csv: 'text/csv',
      html: 'text/html'
    }[format];

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Send error report to support
   */
  public async sendToSupport(
    userEmail: string, 
    description: string,
    includeFullReport: boolean = true
  ): Promise<void> {
    const report = includeFullReport ? this.generateReport() : this.errorLogger.exportErrors();
    
    // In a real application, this would send to a support endpoint
    // For now, we'll prepare the email
    const subject = encodeURIComponent('CATAMS Error Report');
    const body = encodeURIComponent(
      `User: ${userEmail}\n\n` +
      `Description: ${description}\n\n` +
      `Error Report:\n${report}`
    );

    window.open(`mailto:support@catams.usyd.edu.au?subject=${subject}&body=${body}`);
  }

  private setupPerformanceMonitoring(): void {
    // Monitor render performance
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' && entry.name.includes('React')) {
            this.renderMetrics.push({
              duration: entry.duration,
              timestamp: entry.startTime
            });

            // Keep only recent metrics (last hour)
            const oneHourAgo = performance.now() - 60 * 60 * 1000;
            this.renderMetrics = this.renderMetrics.filter(
              metric => metric.timestamp > oneHourAgo
            );
          }
        }
      });

      this.performanceObserver.observe({ entryTypes: ['measure'] });
    }
  }

  private getMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }
    return undefined;
  }

  private getRenderingPerformance() {
    const recentMetrics = this.renderMetrics.filter(
      metric => metric.timestamp > performance.now() - 5 * 60 * 1000 // Last 5 minutes
    );

    const averageRenderTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, metric) => sum + metric.duration, 0) / recentMetrics.length
      : 0;

    const slowRenders = recentMetrics.filter(metric => metric.duration > 16.67).length; // > 60fps

    return {
      averageRenderTime,
      slowRenders
    };
  }

  private getApiPerformance() {
    // This would typically integrate with your API client
    // For now, return mock data
    return {
      averageResponseTime: 0,
      slowRequests: 0,
      failedRequests: 0
    };
  }

  private calculateHourlyTrends(errors: ErrorLogEntry[]) {
    const trends: Array<{ hour: string; count: number }> = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStart = new Date(hour);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      const hourErrors = errors.filter(error => {
        const errorTime = new Date(error.lastOccurrence);
        return errorTime >= hourStart && errorTime < hourEnd;
      });

      trends.push({
        hour: hourStart.toISOString().substring(11, 16), // HH:MM format
        count: hourErrors.reduce((sum, error) => sum + error.count, 0)
      });
    }

    return trends;
  }

  private getSystemInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
  }

  private generateRecommendations(analytics: ErrorAnalytics, performance: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    // Error rate recommendations
    if (analytics.errorRate > 10) {
      recommendations.push('High error rate detected. Consider investigating top errors.');
    }

    // Critical error recommendations
    if (analytics.errorsByLevel.critical > 0) {
      recommendations.push('Critical errors detected. Immediate attention required.');
    }

    // Performance recommendations
    if (performance.memoryUsage && performance.memoryUsage.used > performance.memoryUsage.limit * 0.8) {
      recommendations.push('High memory usage detected. Consider optimizing component memory usage.');
    }

    if (performance.renderingPerformance.slowRenders > 10) {
      recommendations.push('Slow rendering detected. Consider optimizing component render performance.');
    }

    // Component-specific recommendations
    const topComponent = Object.entries(analytics.errorsByComponent)
      .sort(([, a], [, b]) => b - a)[0];
    
    if (topComponent && topComponent[1] > analytics.topErrors[0]?.count * 0.5) {
      recommendations.push(`High error rate in ${topComponent[0]} component. Consider refactoring.`);
    }

    return recommendations;
  }

  private exportToCSV(errors: ErrorLogEntry[]): string {
    const headers = [
      'Error Message',
      'Count',
      'Level',
      'Component',
      'First Occurrence',
      'Last Occurrence',
      'URL'
    ];

    const rows = errors.map(error => [
      error.error.message,
      error.count.toString(),
      error.context.level,
      error.context.componentStack?.split('\\n')[1]?.trim() || 'Unknown',
      error.firstOccurrence,
      error.lastOccurrence,
      error.context.url
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\\n');
  }

  private exportToHTML(errors: ErrorLogEntry[]): string {
    const analytics = this.getErrorAnalytics();
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>CATAMS Error Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .error-critical { background-color: #ffebee; }
        .error-page { background-color: #fff3e0; }
        .error-component { background-color: #f3f4f6; }
        .summary { background-color: #e3f2fd; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>CATAMS Error Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Total Errors: ${analytics.topErrors.reduce((sum, error) => sum + error.count, 0)}</p>
        <p>Error Rate: ${analytics.errorRate.toFixed(2)} errors/hour</p>
        <p>Generated: ${new Date().toISOString()}</p>
    </div>
    
    <h2>Error Details</h2>
    <table>
        <tr>
            <th>Error Message</th>
            <th>Count</th>
            <th>Level</th>
            <th>First Occurrence</th>
            <th>Last Occurrence</th>
        </tr>
        ${errors.map(error => `
        <tr class="error-${error.context.level}">
            <td>${error.error.message}</td>
            <td>${error.count}</td>
            <td>${error.context.level}</td>
            <td>${new Date(error.firstOccurrence).toLocaleString()}</td>
            <td>${new Date(error.lastOccurrence).toLocaleString()}</td>
        </tr>
        `).join('')}
    </table>
</body>
</html>`;
  }
}

export default ErrorReporter;