import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';
import { ErrorLogger } from '../utils/error-logger';
import { type User } from '../contexts/AuthContext';
import { secureLogger } from '../utils/secure-logger';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'critical';
  user?: User | null;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
  errorId: string | null;
  level: 'page' | 'component' | 'critical';
}

/**
 * Error Boundary Component for CATAMS
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the 
 * component tree that crashed.
 * 
 * Features:
 * - Automatic error logging with context
 * - User-friendly fallback UI
 * - Error recovery mechanisms
 * - Different error levels (page, component, critical)
 * - User context for better error reporting
 */
export class ErrorBoundary extends Component<Props, State> {
  private errorLogger: ErrorLogger;

  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };

    this.errorLogger = new ErrorLogger();
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error with context
    const errorContext = {
      errorId: this.state.errorId || 'unknown',
      level: this.props.level || 'component',
      user: this.props.user,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      componentStack: errorInfo.componentStack || undefined,
      errorBoundary: this.constructor.name
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      secureLogger.error('Error Boundary Caught Error', { error, errorInfo, errorContext });
    }

    // Log to external service
    this.errorLogger.logError(error, errorContext);

    // Update state with error info
    this.setState({
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // For critical errors, consider redirecting or additional actions
    if (this.props.level === 'critical') {
      this.handleCriticalError(error);
    }
  }

  private handleCriticalError = (error: Error) => {
    // For critical errors, we might want to:
    // 1. Clear potentially corrupted state
    // 2. Redirect to a safe page
    // 3. Show a more prominent error message
    
    secureLogger.error('Critical error detected', error);
    
    // Clear localStorage if it might be corrupted
    if (error.message.includes('localStorage') || error.message.includes('storage')) {
      try {
        localStorage.clear();
      } catch (e) {
        secureLogger.error('Failed to clear localStorage', e);
      }
    }
  };

  private resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || ErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          errorId={this.state.errorId}
          level={this.props.level || 'component'}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
// eslint-disable-next-line react-refresh/only-export-components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook for triggering error boundary from functional components
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useErrorHandler() {
  return (error: Error) => {
    // In a functional component, we can trigger an error boundary
    // by throwing an error in a useEffect or event handler
    throw error;
  };
}

export default ErrorBoundary;
