/**
 * Loading Skeleton Components
 * 
 * A collection of skeleton loading components for various UI elements.
 * These provide a smooth loading experience and reduce perceived wait times.
 */

import { motion } from 'framer-motion';

/**
 * Base skeleton component with shimmer effect
 */
export function Skeleton({
  className = '',
  variant = 'rectangular',
}: {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
}) {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  const variantClasses = {
    rectangular: 'rounded-md',
    circular: 'rounded-full',
    text: 'rounded-full h-4',
  };

  return (
    <motion.div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton for property cards
 */
export function PropertyCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-200 dark:bg-gray-700">
        <Skeleton className="w-full h-full" variant="rectangular" />
      </div>
      <div className="p-4">
        <div className="space-y-3">
          <Skeleton className="w-3/4 h-6" variant="text" />
          <Skeleton className="w-1/2 h-5" variant="text" />
          <div className="flex justify-between items-center pt-2">
            <Skeleton className="w-1/4 h-8" variant="rectangular" />
            <Skeleton className="w-1/4 h-8" variant="rectangular" />
          </div>
          <div className="flex gap-2 pt-2">
            <Skeleton className="w-16 h-6" variant="rectangular" />
            <Skeleton className="w-16 h-6" variant="rectangular" />
            <Skeleton className="w-16 h-6" variant="rectangular" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for property list
 */
export function PropertyListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <PropertyCardSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Skeleton for property detail page
 */
export function PropertyDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 animate-pulse">
      {/* Gallery */}
      <div className="mb-8">
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4">
          <Skeleton className="w-full h-full" variant="rectangular" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 bg-gray-200 dark:bg-gray-700 rounded">
              <Skeleton className="w-full h-full" variant="rectangular" />
            </div>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <Skeleton className="w-3/4 h-8 mb-2" variant="text" />
            <Skeleton className="w-1/2 h-6" variant="text" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="w-24 h-10" variant="rectangular" />
            <Skeleton className="w-24 h-10" variant="rectangular" />
          </div>
        </div>
        <Skeleton className="w-1/3 h-10" variant="rectangular" />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <Skeleton className="w-16 h-16 mx-auto mb-2" variant="circular" />
            <Skeleton className="w-3/4 h-4 mx-auto" variant="text" />
          </div>
        ))}
      </div>

      {/* Description */}
      <div className="mb-8">
        <Skeleton className="w-1/4 h-6 mb-4" variant="text" />
        <div className="space-y-2">
          <Skeleton className="w-full h-4" variant="text" />
          <Skeleton className="w-full h-4" variant="text" />
          <Skeleton className="w-3/4 h-4" variant="text" />
        </div>
      </div>

      {/* Features */}
      <div className="mb-8">
        <Skeleton className="w-1/4 h-6 mb-4" variant="text" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-2">
              <Skeleton className="w-5 h-5" variant="circular" />
              <Skeleton className="w-3/4 h-4" variant="text" />
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg mb-8">
        <Skeleton className="w-full h-full" variant="rectangular" />
      </div>

      {/* Agent Info */}
      <div className="flex items-center gap-4 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <Skeleton className="w-16 h-16" variant="circular" />
        <div className="flex-1">
          <Skeleton className="w-1/2 h-6 mb-2" variant="text" />
          <Skeleton className="w-1/3 h-4" variant="text" />
        </div>
        <Skeleton className="w-24 h-10" variant="rectangular" />
      </div>
    </div>
  );
}

/**
 * Skeleton for search results
 */
export function SearchResultsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="flex gap-4">
            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0">
              <Skeleton className="w-full h-full" variant="rectangular" />
            </div>
            <div className="flex-1">
              <Skeleton className="w-3/4 h-6 mb-2" variant="text" />
              <Skeleton className="w-1/2 h-4 mb-2" variant="text" />
              <div className="flex gap-2">
                <Skeleton className="w-16 h-5" variant="rectangular" />
                <Skeleton className="w-16 h-5" variant="rectangular" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for charts and statistics
 */
export function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse">
      <Skeleton className="w-1/3 h-6 mb-6" variant="text" />
      <div className="h-64 flex items-end gap-2">
        {Array.from({ length: 12 }).map((_, index) => (
          <Skeleton
            key={index}
            className="flex-1"
            style={{ height: `${Math.random() * 80 + 20}%` }}
            variant="rectangular"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for form inputs
 */
export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="w-1/4 h-4" variant="text" />
          <Skeleton className="w-full h-10" variant="rectangular" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for table rows
 */
export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, index) => (
        <td key={index} className="p-4">
          <Skeleton className="w-full h-4" variant="text" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton for table
 */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {Array.from({ length: cols }).map((_, index) => (
              <th key={index} className="p-4 text-left">
                <Skeleton className="w-1/2 h-4" variant="text" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRowSkeleton key={rowIndex} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Skeleton for user profile
 */
export function ProfileSkeleton() {
  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md animate-pulse">
      <div className="flex flex-col items-center gap-4 mb-6">
        <Skeleton className="w-24 h-24" variant="circular" />
        <Skeleton className="w-1/2 h-6" variant="text" />
        <Skeleton className="w-1/3 h-4" variant="text" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <Skeleton className="w-1/2 h-4" variant="text" />
            <Skeleton className="w-1/4 h-4" variant="text" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for dashboard cards
 */
export function DashboardCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <Skeleton className="w-1/2 h-6" variant="text" />
        <Skeleton className="w-8 h-8" variant="circular" />
      </div>
      <Skeleton className="w-1/3 h-8 mb-4" variant="text" />
      <div className="flex gap-4">
        <Skeleton className="w-1/3 h-20" variant="rectangular" />
        <Skeleton className="w-2/3 h-20" variant="rectangular" />
      </div>
    </div>
  );
}

/**
 * Skeleton for the entire page
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 animate-pulse">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Skeleton className="w-32 h-8" variant="rectangular" />
          <div className="flex gap-4">
            <Skeleton className="w-24 h-8" variant="rectangular" />
            <Skeleton className="w-24 h-8" variant="rectangular" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-8">
          <Skeleton className="w-1/2 h-8" variant="text" />
          <Skeleton className="w-1/3 h-6" variant="text" />
          
          <PropertyListSkeleton count={3} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-4">
                <Skeleton className="w-1/2 h-6" variant="text" />
                <div className="space-y-2">
                  <Skeleton className="w-full h-4" variant="text" />
                  <Skeleton className="w-full h-4" variant="text" />
                  <Skeleton className="w-full h-4" variant="text" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Skeleton for error states
 */
export function ErrorSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Skeleton className="w-16 h-16" variant="circular" />
      <Skeleton className="w-1/2 h-6" variant="text" />
      <Skeleton className="w-1/3 h-4" variant="text" />
      <div className="flex gap-4 pt-4">
        <Skeleton className="w-24 h-10" variant="rectangular" />
        <Skeleton className="w-24 h-10" variant="rectangular" />
      </div>
    </div>
  );
}
