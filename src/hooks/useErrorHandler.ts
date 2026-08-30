/**
 * useErrorHandler Hook
 * 
 * A custom hook for handling errors in React components with:
 * - Automatic error state management
 * - Error logging
 * - User notifications
 * - Recovery options
 */
import { useState, useCallback, useEffect } from 'react';
import { useUIStore } from '@/lib/store/useUIStore';

interface ErrorState<T = unknown> {
  error: Error | null;
  data: T | null;
  loading: boolean;
  retryCount: number;
  lastErrorTime: number | null;
}

interface UseErrorHandlerOptions {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
  onRetry?: () => void;
  notifyOnError?: boolean;
  logError?: boolean;
}

interface UseErrorHandlerReturn<T> extends ErrorState<T> {
  setError: (error: Error | null) => void;
  setLoading: (loading: boolean) => void;
  setData: (data: T | null) => void;
  clearError: () => void;
  reset: () => void;
  retry: () => void;
  execute: (fn: () => Promise<T>) => Promise<T | null>;
  executeWithLoading: (fn: () => Promise<T>, loadingMessage?: string) => Promise<T | null>;
}

/**
 * Custom hook for error handling
 */
export function useErrorHandler<T = unknown>(
  options: UseErrorHandlerOptions = {},
): UseErrorHandlerReturn<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onSuccess,
    onRetry,
    notifyOnError = true,
    logError = true,
  } = options;

  const [errorState, setErrorState] = useState<ErrorState<T>>({
    error: null,
    data: null,
    loading: false,
    retryCount: 0,
    lastErrorTime: null,
  });

  const { addNotification } = useUIStore();

  const setError = useCallback((error: Error | null) => {
    setErrorState((prev) => ({
      ...prev,
      error,
      lastErrorTime: error ? Date.now() : null,
    }));

    if (error && logError) {
      console.error('Error:', error);
    }

    if (error && onError) {
      onError(error);
    }

    if (error && notifyOnError) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message,
      });
    }
  }, [addNotification, logError, notifyOnError, onError]);

  const setLoading = useCallback((loading: boolean) => {
    setErrorState((prev) => ({ ...prev, loading }));
  }, []);

  const setData = useCallback((data: T | null) => {
    setErrorState((prev) => ({ ...prev, data }));
  }, []);

  const clearError = useCallback(() => {
    setErrorState((prev) => ({
      ...prev,
      error: null,
      retryCount: 0,
      lastErrorTime: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setErrorState({
      error: null,
      data: null,
      loading: false,
      retryCount: 0,
      lastErrorTime: null,
    });
  }, []);

  const retry = useCallback(() => {
    setErrorState((prev) => ({
      ...prev,
      retryCount: 0,
    }));

    if (onRetry) {
      onRetry();
    }
  }, [onRetry]);

  const execute = useCallback(
    async (fn: () => Promise<T>): Promise<T | null> => {
      setLoading(true);
      clearError();

      try {
        const data = await fn();
        setData(data);
        
        if (onSuccess) {
          onSuccess();
        }

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        
        setErrorState((prev) => ({
          ...prev,
          error,
          loading: false,
          retryCount: prev.retryCount + 1,
          lastErrorTime: Date.now(),
        }));

        if (logError) {
          console.error('Execution error:', error);
        }

        return null;
      } finally {
        setLoading(false);
      }
    },
    [clearError, logError, onSuccess, setData, setLoading],
  );

  const executeWithLoading = useCallback(
    async (fn: () => Promise<T>, loadingMessage?: string): Promise<T | null> => {
      setLoading(true);
      clearError();

      // Set loading message in UI store
      const { setLoading: setUILoading } = useUIStore();
      if (loadingMessage) {
        setUILoading(true, loadingMessage);
      }

      try {
        const data = await fn();
        setData(data);
        
        if (onSuccess) {
          onSuccess();
        }

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        
        setErrorState((prev) => ({
          ...prev,
          error,
          loading: false,
          retryCount: prev.retryCount + 1,
          lastErrorTime: Date.now(),
        }));

        if (logError) {
          console.error('Execution error:', error);
        }

        return null;
      } finally {
        setLoading(false);
        setUILoading(false);
      }
    },
    [clearError, logError, onSuccess, setData, setLoading],
  );

  // Auto-retry effect
  useEffect(() => {
    const { error, retryCount } = errorState;

    if (error && retryCount < maxRetries) {
      const timer = setTimeout(() => {
        retry();
      }, retryDelay);

      return () => clearTimeout(timer);
    }
  }, [errorState, maxRetries, retry, retryDelay]);

  return {
    ...errorState,
    setError,
    setLoading,
    setData,
    clearError,
    reset,
    retry,
    execute,
    executeWithLoading,
  };
}

// ============================================================================
// Specialized Error Handlers
// ============================================================================

/**
 * Hook for API error handling
 */
export function useApiErrorHandler() {
  const { setError, addNotification } = useUIStore();

  const handleApiError = useCallback((error: unknown, context?: string) => {
    const message = getErrorMessage(error, context);
    
    // Show notification
    addNotification({
      type: 'error',
      title: 'API Error',
      message,
    });

    // Set global error state
    setError(message);

    // Log error
    console.error('API Error:', error);

    return message;
  }, [addNotification, setError]);

  return { handleApiError };
}

/**
 * Hook for form error handling
 */
export function useFormErrorHandler<T extends Record<string, unknown>>() {
  const [errors, setErrors] = useState<Record<keyof T, string>>({} as Record<keyof T, string>);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = useCallback((values: T, schema: Record<keyof T, (value: unknown) => string | null>) => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    
    Object.entries(schema).forEach(([key, validator]) => {
      const value = values[key as keyof T];
      const error = validator(value);
      if (error) {
        newErrors[key as keyof T] = error;
      }
    });

    setErrors(newErrors as Record<keyof T, string>);
    return Object.keys(newErrors).length === 0;
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({} as Record<keyof T, string>);
    setSubmitError(null);
  }, []);

  const setFieldError = useCallback((field: keyof T, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  return {
    errors,
    submitError,
    validate,
    setFieldError,
    setSubmitError,
    clearErrors,
  };
}

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Get user-friendly error message from any error
 */
export function getErrorMessage(error: unknown, context?: string): string {
  if (error instanceof Error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return 'Network error. Please check your internet connection.';
    }

    if (error.message.includes('timeout') || error.message.includes('Time out')) {
      return 'Request timed out. Please try again.';
    }

    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return 'Please login to continue.';
    }

    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return 'You do not have permission to perform this action.';
    }

    if (error.message.includes('404') || error.message.includes('Not found')) {
      return 'The requested resource was not found.';
    }

    if (error.message.includes('429') || error.message.includes('Too many')) {
      return 'Too many requests. Please try again later.';
    }

    if (error.message.includes('500') || error.message.includes('Server error')) {
      return 'Server error. Please try again later.';
    }

    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }

  return context ? `${context}: An error occurred` : 'An error occurred';
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('network') ||
      error.message.includes('offline')
    );
  }

  return false;
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('timeout') ||
      error.message.includes('Time out') ||
      error.name === 'TimeoutError'
    );
  }

  return false;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('validation') ||
      error.message.includes('invalid') ||
      error.message.includes('required') ||
      error.name === 'ValidationError'
    );
  }

  return false;
}

// ============================================================================
// Exports
// ============================================================================

export {
  useErrorHandler as default,
  useApiErrorHandler,
  useFormErrorHandler,
};
