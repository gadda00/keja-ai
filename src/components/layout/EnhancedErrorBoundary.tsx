/**
 * Enhanced Error Boundary
 * 
 * A comprehensive error boundary component that provides:
 * - Graceful error handling
 * - User-friendly error messages
 * - Error logging
 * - Recovery options
 * - Custom error rendering
 */
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Mail, Copy } from 'lucide-react';

interface EnhancedErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: unknown[];
  logger?: (error: Error, errorInfo: ErrorInfo, componentStack?: string) => void;
  showDetails?: boolean;
  className?: string;
}

interface EnhancedErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  componentStack: string | null;
  showDetails: boolean;
}

class EnhancedErrorBoundary extends Component<
  EnhancedErrorBoundaryProps,
  EnhancedErrorBoundaryState
> {
  constructor(props: EnhancedErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      componentStack: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<EnhancedErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { logger, onError } = this.props;
    const { componentStack } = errorInfo;

    // Store the error and component stack
    this.setState({
      errorInfo: errorInfo,
      componentStack,
    });

    // Log the error
    if (logger) {
      logger(error, errorInfo, componentStack);
    } else {
      // Default logging
      console.error('Error caught by EnhancedErrorBoundary:', error);
      console.error('Error info:', errorInfo);
      console.error('Component stack:', componentStack);
    }

    // Call onError callback
    if (onError) {
      onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: EnhancedErrorBoundaryProps): void {
    const { resetKeys = [] } = this.props;
    
    // Check if any reset key has changed
    const keysChanged = resetKeys.some(
      (key, index) => key !== prevProps.resetKeys?.[index],
    );

    // If keys changed and we had an error, reset
    if (keysChanged && this.state.hasError) {
      this.reset();
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      componentStack: null,
    });

    const { onReset } = this.props;
    if (onReset) {
      onReset();
    }
  };

  toggleDetails = (): void => {
    this.setState((state) => ({
      showDetails: !state.showDetails,
    }));
  };

  copyErrorToClipboard = (): void => {
    const { error, componentStack } = this.state;
    
    if (error && componentStack) {
      const text = `Error: ${error.message}\n\nStack:\n${error.stack}\n\nComponent Stack:\n${componentStack}`;
      navigator.clipboard.writeText(text);
    }
  };

  getErrorMessage = (): string => {
    const { error } = this.state;
    
    if (!error) {
      return 'An unexpected error occurred.';
    }

    // Handle common error types
    if (error.name === 'ChunkLoadError') {
      return 'Failed to load application code. Please refresh the page.';
    }

    if (error.message.includes('Failed to fetch')) {
      return 'Network error. Please check your internet connection.';
    }

    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }

    if (error.message.includes('404')) {
      return 'The requested resource was not found.';
    }

    if (error.message.includes('401') || error.message.includes('403')) {
      return 'You are not authorized to access this resource.';
    }

    if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
      return 'Server error. Please try again later.';
    }

    // Return the error message or a generic message
    return error.message || 'An unexpected error occurred.';
  };

  getErrorTitle = (): string => {
    const { error } = this.state;
    
    if (!error) {
      return 'Something went wrong';
    }

    if (error.name === 'ChunkLoadError') {
      return 'Loading Error';
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Network Error';
    }

    return 'Application Error';
  };

  renderErrorDetails = (): ReactNode => {
    const { error, componentStack } = this.state;
    const { showDetails: propShowDetails } = this.props;
    const { showDetails: stateShowDetails } = this.state;

    if (!error || !componentStack) {
      return null;
    }

    const shouldShow = propShowDetails ?? stateShowDetails;

    if (!shouldShow) {
      return null;
    }

    return (
      <div className="mt-4 rounded-lg bg-ink/5 p-4 text-xs font-mono">
        <div className="mb-2">
          <strong>Error:</strong> {error.message}
        </div>
        <div className="mb-2">
          <strong>Stack:</strong>
          <pre className="whitespace-pre-wrap break-all">{error.stack}</pre>
        </div>
        <div>
          <strong>Component Stack:</strong>
          <pre className="whitespace-pre-wrap break-all">{componentStack}</pre>
        </div>
      </div>
    );
  };

  render(): ReactNode {
    const { children, fallback, className = '' } = this.props;
    const { hasError } = this.state;

    if (!hasError) {
      return children;
    }

    // Use custom fallback if provided
    if (fallback) {
      return fallback;
    }

    // Default error UI
    return (
      <div
        className={`flex min-h-screen flex-col items-center justify-center p-4 ${className}`}
        role="alert"
        aria-live="assertive"
      >
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl ring-1 ring-red-200">
          {/* Error Icon */}
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" strokeWidth={2} />
            </div>
          </div>

          {/* Error Title */}
          <h2 className="text-center text-xl font-bold text-ink">
            {this.getErrorTitle()}
          </h2>

          {/* Error Message */}
          <p className="text-center text-ink-muted">{this.getErrorMessage()}</p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={this.reset}
              className="btn-gold !w-full sm:!w-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>

            <button
              onClick={() => {
                window.location.href = '/';
              }}
              className="btn-outline !w-full sm:!w-auto"
            >
              <Home className="h-4 w-4" />
              Go Home
            </button>
          </div>

          {/* Additional Actions */}
          <div className="flex justify-center gap-4 text-sm">
            <button
              onClick={this.toggleDetails}
              className="flex items-center gap-1 text-gold-600 hover:text-gold-700"
            >
              {this.state.showDetails ? 'Hide' : 'Show'} Details
            </button>

            <button
              onClick={this.copyErrorToClipboard}
              className="flex items-center gap-1 text-gold-600 hover:text-gold-700"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Error
            </button>

            <a
              href="mailto:support@keja.ai"
              className="flex items-center gap-1 text-gold-600 hover:text-gold-700"
            >
              <Mail className="h-3.5 w-3.5" />
              Report
            </a>
          </div>

          {/* Error Details */}
          {this.renderErrorDetails()}
        </div>
      </div>
    );
  }
}

// Default logger for production
export function defaultErrorLogger(
  error: Error,
  errorInfo: ErrorInfo,
  componentStack?: string,
): void {
  // In production, send errors to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // This would be replaced with actual error tracking
    console.error('Error logged:', {
      message: error.message,
      stack: error.stack,
      componentStack,
      timestamp: new Date().toISOString(),
    });
  }
}

// Error boundary for specific sections
export const SectionErrorBoundary: React.FC<{
  children: ReactNode;
  title?: string;
  onRetry?: () => void;
}> = ({ children, title = 'Failed to load', onRetry }) => {
  return (
    <EnhancedErrorBoundary
      onReset={onRetry}
      fallback={
        <div className="flex flex-col items-center justify-center py-8">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <p className="mt-2 text-sm text-ink-muted">{title}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="btn-outline mt-3 !px-4 !py-1.5 text-xs"
            >
              Retry
            </button>
          )}
        </div>
      }
    >
      {children}
    </EnhancedErrorBoundary>
  );
};

// Error boundary for pages
export const PageErrorBoundary: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  return (
    <EnhancedErrorBoundary
      onReset={() => {
        window.location.reload();
      }}
      logger={defaultErrorLogger}
    >
      {children}
    </EnhancedErrorBoundary>
  );
};

export default EnhancedErrorBoundary;
