/**
 * Loading States
 * 
 * Collection of loading components for different use cases:
 * - Full page loading
 * - Section loading
 * - Skeleton loading
 * - Spinner loading
 * - Progress indicators
 */
import React from 'react';
import { Loader2, Clock, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

// ============================================================================
// Spinner Components
// ============================================================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const spinnerSizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-3',
  xl: 'h-12 w-12 border-4',
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className = '',
  label = 'Loading',
}) => {
  return (
    <span role="status" aria-label={label} className="flex items-center gap-2">
      <svg
        className={`${spinnerSizes[size]} animate-spin rounded-full border-gold-200 border-t-gold-600 ${className}`}
        viewBox="0 0 24 24"
      />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
};

export const DotsSpinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className = '',
  label = 'Loading',
}) => {
  const dotSize = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
    xl: 'h-3 w-3',
  }[size];

  return (
    <span role="status" aria-label={label} className={`flex gap-1 ${className}`}>
      <motion.span
        className={`rounded-full bg-gold-600 ${dotSize}`}
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
      />
      <motion.span
        className={`rounded-full bg-gold-600 ${dotSize}`}
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
      />
      <motion.span
        className={`rounded-full bg-gold-600 ${dotSize}`}
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
      />
    </span>
  );
};

// ============================================================================
// Skeleton Components
// ============================================================================

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
}) => {
  const variants = {
    text: 'h-4 rounded',
    circular: 'rounded-full aspect-square',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const style = {
    width: width || (variant === 'circular' ? height : '100%'),
    height: height || (variant === 'text' ? undefined : '100%'),
  };

  return (
    <div
      className={`animate-pulse bg-gold-100/60 ${variants[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

export const TextSkeleton: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === 0 ? '80%' : i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`card-luxe p-4 ${className}`}>
      <Skeleton variant="rounded" height={180} className="mb-4" />
      <div className="space-y-3">
        <Skeleton variant="text" width="70%" />
        <div className="flex gap-2">
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="30%" />
        </div>
        <Skeleton variant="text" width="50%" />
      </div>
    </div>
  );
};

export const PropertyCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`card-luxe card-luxe-hover ${className}`}>
      <div className="relative">
        <Skeleton variant="rounded" height={200} />
        <div className="absolute top-2 left-2">
          <Skeleton variant="circular" width={24} height={24} />
        </div>
        <div className="absolute top-2 right-2">
          <Skeleton variant="text" width={40} className="bg-gold-600/80" />
        </div>
      </div>
      <div className="p-4">
        <Skeleton variant="text" width="90%" className="mb-2" />
        <Skeleton variant="text" width="60%" className="mb-3" />
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="30%" />
        </div>
      </div>
    </div>
  );
};

export const ListSkeleton: React.FC<{ items?: number; className?: string }> = ({
  items = 5,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
};

// ============================================================================
// Full Page Loading
// ============================================================================

interface FullPageLoadingProps {
  message?: string;
  subMessage?: string;
  icon?: React.ReactNode;
}

export const FullPageLoading: React.FC<FullPageLoadingProps> = ({
  message = 'Loading...',
  subMessage,
  icon = <Loader2 className="h-10 w-10 text-gold-600" />,
}) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gold-50">
          {icon}
        </div>
        <h2 className="text-xl font-semibold text-ink">{message}</h2>
        {subMessage && (
          <p className="text-center text-ink-muted">{subMessage}</p>
        )}
        <DotsSpinner />
      </motion.div>
    </div>
  );
};

export const AppLoading: React.FC = () => {
  return (
    <FullPageLoading
      message="Initializing Keja.ai"
      subMessage="Verified Trust. Intelligent Real Estate."
      icon={<Building2 className="h-10 w-10 text-gold-600" />}
    />
  );
};

// ============================================================================
// Section Loading
// ============================================================================

interface SectionLoadingProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SectionLoading: React.FC<SectionLoadingProps> = ({
  message = 'Loading...',
  className = '',
  size = 'md',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 ${className}`}
      role="status"
      aria-label={message}
    >
      <Spinner size={size} className="mb-4" />
      <p className="text-sm text-ink-muted">{message}</p>
    </div>
  );
};

export const InlineLoading: React.FC<{
  message?: string;
  className?: string;
}> = ({ message = 'Loading', className = '' }) => {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Spinner size="sm" />
      <span className="text-sm text-ink-muted">{message}...</span>
    </span>
  );
};

// ============================================================================
// Progress Indicators
// ============================================================================

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  label?: string;
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  className = '',
  label,
  showPercentage = true,
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="h-2 w-full rounded-full bg-gold-100 overflow-hidden">
        <motion.div
          className="h-full bg-gold-gradient"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
      {showPercentage && (
        <p className="mt-2 text-xs text-ink-muted">
          {Math.round(percentage)}% complete
        </p>
      )}
    </div>
  );
};

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
  showValue?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  className = '',
  label,
  showValue = true,
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const sizes = {
    sm: 'h-10 w-10',
    md: 'h-16 w-16',
    lg: 'h-20 w-20',
    xl: 'h-28 w-28',
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${sizes[size]} ${className}`}>
      <svg className="absolute h-full w-full" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-gold-100"
        />
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          stroke="url(#gold-gradient)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="283"
          strokeDashoffset={283 - (283 * percentage) / 100}
          initial={{ strokeDashoffset: 283 }}
          animate={{ strokeDashoffset: 283 - (283 * percentage) / 100 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8A6B26" />
            <stop offset="100%" stopColor="#B08F35" />
          </linearGradient>
        </defs>
      </svg>
      <div className="relative z-10 flex flex-col items-center">
        {showValue && (
          <span className="font-bold text-ink">{Math.round(percentage)}%</span>
        )}
        {label && (
          <span className="text-xs text-ink-muted">{label}</span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Suspense Fallbacks
// ============================================================================

export const SuspenseFallback: React.FC<{
  message?: string;
  className?: string;
}> = ({ message = 'Loading...', className = '' }) => {
  return (
    <div
      className={`flex min-h-[200px] flex-col items-center justify-center ${className}`}
    >
      <Spinner size="lg" />
      <p className="mt-4 text-sm text-ink-muted">{message}</p>
    </div>
  );
};

export const LazyFallback: React.FC = () => {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status">
      <div className="flex flex-col items-center gap-3">
        <DotsSpinner />
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Loading...
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// Image Loading
// ============================================================================

interface ImageLoaderProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  loadingClassName?: string;
  errorClassName?: string;
  placeholder?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

export const ImageLoader: React.FC<ImageLoaderProps> = ({
  src,
  alt,
  className = '',
  placeholderClassName = '',
  loadingClassName = '',
  errorClassName = '',
  placeholder,
  errorFallback,
}) => {
  const [status, setStatus] = React.useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {status === 'loading' && (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-gold-50 ${loadingClassName}`}
        >
          {placeholder || <Spinner size="md" />}
        </div>
      )}
      
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`transition-opacity duration-300 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
      
      {status === 'error' && (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-gold-50 ${errorClassName}`}
        >
          {errorFallback || <Building2 className="h-8 w-8 text-gold-300" />}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Data Loading States
// ============================================================================

interface DataLoadingProps<T> {
  data: T | null | undefined;
  loading: boolean;
  error: Error | null | undefined;
  children: (data: T) => React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ReactNode | ((error: Error) => React.ReactNode);
}

export function DataLoading<T>({
  data,
  loading,
  error,
  children,
  loadingFallback = <SectionLoading />,
  errorFallback,
}: React.ReactNode {
  if (loading) {
    return loadingFallback;
  }

  if (error) {
    return errorFallback instanceof Function
      ? errorFallback(error)
      : errorFallback || (
          <div className="text-center text-red-500">
            Error: {error.message}
          </div>
        );
  }

  if (data === null || data === undefined) {
    return (
      <div className="text-center text-ink-muted">
        No data available
      </div>
    );
  }

  return children(data);
}

// ============================================================================
// Exports
// ============================================================================

export {
  Spinner as default,
  DotsSpinner,
  Skeleton,
  TextSkeleton,
  CardSkeleton,
  PropertyCardSkeleton,
  ListSkeleton,
  FullPageLoading,
  AppLoading,
  SectionLoading,
  InlineLoading,
  ProgressBar,
  CircularProgress,
  SuspenseFallback,
  LazyFallback,
  ImageLoader,
  DataLoading,
};
