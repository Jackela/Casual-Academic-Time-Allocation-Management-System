import React from 'react';
import { type ErrorFallbackProps } from './ErrorBoundary';
import './ErrorFallback.css';

/**
 * User-friendly error fallback UI for Error Boundary
 * 
 * Provides different UI based on error level and includes:
 * - Clear error messaging appropriate for users
 * - Recovery actions (retry, refresh, go home)
 * - Error reporting options
 * - Responsive design
 */
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  errorId,
  level
}) => {
  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReportError = () => {
    const subject = encodeURIComponent(`CATAMS Error Report - ${errorId}`);
    const body = encodeURIComponent(
      `Error ID: ${errorId}\n` +
      `Error: ${error?.message || 'Unknown error'}\n` +
      `Level: ${level}\n` +
      `URL: ${window.location.href}\n` +
      `Time: ${new Date().toISOString()}\n\n` +
      `Please describe what you were doing when this error occurred:\n\n`
    );
    
    window.open(`mailto:support@catams.usyd.edu.au?subject=${subject}&body=${body}`);
  };

  const getErrorTitle = () => {
    switch (level) {
      case 'critical':
        return 'System Error';
      case 'page':
        return 'Page Error';
      case 'component':
      default:
        return 'Something went wrong';
    }
  };

  const getErrorMessage = () => {
    switch (level) {
      case 'critical':
        return 'A critical system error has occurred. Please refresh the page or contact support if the problem persists.';
      case 'page':
        return 'This page encountered an error and cannot be displayed. You can try refreshing or go back to the dashboard.';
      case 'component':
      default:
        return 'A component on this page has encountered an error. You can try the action again or refresh the page.';
    }
  };

  const showTechnicalDetails = process.env.NODE_ENV === 'development';

  return (
    <div className={`error-fallback error-fallback--${level}`} data-testid="error-fallback">
      <div className="error-fallback__container">
        <div className="error-fallback__icon">
          {level === 'critical' ? '🚨' : level === 'page' ? '📄' : '⚠️'}
        </div>
        
        <h2 className="error-fallback__title" data-testid="error-title">
          {getErrorTitle()}
        </h2>
        
        <p className="error-fallback__message" data-testid="error-message">
          {getErrorMessage()}
        </p>

        <div className="error-fallback__actions">
          {level === 'component' && (
            <button
              onClick={resetError}
              className="error-fallback__button error-fallback__button--primary"
              data-testid="retry-button"
            >
              Try Again
            </button>
          )}
          
          <button
            onClick={handleRefresh}
            className="error-fallback__button error-fallback__button--secondary"
            data-testid="refresh-button"
          >
            Refresh Page
          </button>
          
          {level !== 'component' && (
            <button
              onClick={handleGoHome}
              className="error-fallback__button error-fallback__button--secondary"
              data-testid="home-button"
            >
              Go to Dashboard
            </button>
          )}
        </div>

        <div className="error-fallback__support">
          <button
            onClick={handleReportError}
            className="error-fallback__link"
            data-testid="report-button"
          >
            Report this error
          </button>
          
          {errorId && (
            <p className="error-fallback__error-id">
              Error ID: <code data-testid="error-id">{errorId}</code>
            </p>
          )}
        </div>

        {showTechnicalDetails && error && (
          <details className="error-fallback__technical">
            <summary>Technical Details (Development Only)</summary>
            <div className="error-fallback__technical-content">
              <h4>Error:</h4>
              <pre>{error.message}</pre>
              
              <h4>Stack Trace:</h4>
              <pre>{error.stack}</pre>
              
              {errorInfo && (
                <>
                  <h4>Component Stack:</h4>
                  <pre>{errorInfo.componentStack}</pre>
                </>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

export default ErrorFallback;
