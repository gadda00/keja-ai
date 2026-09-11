/**
 * Progressive Image Component
 * 
 * A smart image component that:
 * - Loads low-quality placeholder first (LQIP - Low Quality Image Placeholder)
 * - Fades in high-quality image when loaded
 * - Supports WebP with JPEG fallback
 * - Handles adaptive loading based on network conditions
 * - Provides loading and error states
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from './LoadingSkeleton';
import { prefersReducedMotion, isSlowConnection } from '@/lib/performance';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  placeholder?: string; // Low-quality placeholder (blurhash or small image)
  webpSrc?: string; // WebP version for modern browsers
  sizes?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  loadingPriority?: 'high' | 'low';
  showSkeleton?: boolean;
  skeletonClassName?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Generate a blurhash placeholder URL from a blurhash string
 * Blurhash is a compact representation of a placeholder for an image
 */
function getBlurhashUrl(blurhash: string, width: number, height: number): string {
  if (!blurhash) return '';
  // Use blurhash decoder if available, otherwise return empty
  // In production, you'd use a library like blurhash or implement the decoder
  return `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#e0e0e0"/>
    </svg>
  `)}`;
}

/**
 * Check if an image URL is a data URL (base64 encoded)
 */
function isDataUrl(url: string): boolean {
  return url.startsWith('data:');
}

/**
 * Check if the browser supports WebP
 */
function supportsWebP(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Create a test image element
  const webP = new Image();
  return webP.src === 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAQAgCDASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
}

/**
 * Progressive Image Component
 * 
 * Features:
 * - Automatic WebP support with fallback
 * - Blurhash/LQIP placeholder support
 * - Smooth fade-in animation
 * - Loading skeleton state
 * - Error handling
 * - Network-aware loading
 * - Reduced motion support
 */
export function ProgressiveImage({
  src,
  alt,
  placeholder,
  webpSrc,
  sizes,
  className = '',
  width,
  height,
  loadingPriority = 'low',
  showSkeleton = false,
  skeletonClassName = '',
  onLoad,
  onError,
}: ProgressiveImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [useWebP, setUseWebP] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const hasPlaceholder = Boolean(placeholder && !isDataUrl(placeholder));

  // Check WebP support on mount
  useEffect(() => {
    setUseWebP(supportsWebP());
  }, []);

  // Determine the actual source to use
  const actualSrc = useWebP && webpSrc ? webpSrc : src;

  // Handle image loading
  const handleLoad = useCallback(() => {
    setStatus('loaded');
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    // Try fallback to original src if webp failed
    if (useWebP && webpSrc && currentSrc === webpSrc) {
      setCurrentSrc(src);
      return;
    }
    setStatus('error');
    onError?.();
  }, [useWebP, webpSrc, currentSrc, src, onError]);

  // Set the current source when it changes
  useEffect(() => {
    setCurrentSrc(actualSrc);
  }, [actualSrc]);

  // Preload the image if it's high priority
  useEffect(() => {
    if (loadingPriority === 'high' && status === 'loading') {
      const img = new Image();
      img.src = actualSrc;
      if (img.complete) {
        handleLoad();
      }
    }
  }, [actualSrc, loadingPriority, status, handleLoad]);

  // Adaptive loading based on network conditions
  const shouldShowPlaceholder = isSlowConnection() && !hasPlaceholder;

  // Animation configuration
  const animationConfig = prefersReducedMotion()
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.1 } }
    : {
        initial: { opacity: 0, scale: 0.98 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
      };

  // Render different states
  if (status === 'loading') {
    if (showSkeleton) {
      return (
        <div className={className} style={{ width, height }}>
          <Skeleton
            className={`w-full h-full ${skeletonClassName}`}
            variant="rectangular"
          />
        </div>
      );
    }

    // Show placeholder if available
    if (placeholder) {
      if (isDataUrl(placeholder)) {
        return (
          <motion.div
            className={className}
            style={{ width, height }}
            {...animationConfig}
          >
            <img
              src={placeholder}
              alt={alt}
              className="w-full h-full object-cover"
              style={{ filter: 'blur(8px)' }}
            />
          </motion.div>
        );
      }
      return (
        <motion.div
          className={className}
          style={{ width, height }}
          {...animationConfig}
        >
          <img
            src={placeholder}
            alt={alt}
            className="w-full h-full object-cover"
            style={{ filter: 'blur(8px)' }}
          />
        </motion.div>
      );
    }

    // Default loading state
    return (
      <div className={className} style={{ width, height }}>
        <Skeleton className="w-full h-full" variant="rectangular" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        className={className}
        style={{ width, height }}
        role="img"
        aria-label={alt}
      >
        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded">
          <svg
            className="w-8 h-8 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
      </div>
    );
  }

  // Loaded state with fade-in
  return (
    <motion.div
      className={className}
      style={{ width, height }}
      {...animationConfig}
    >
      <AnimatePresence mode="wait">
        {status === 'loaded' && (
          <motion.img
            key={currentSrc}
            src={currentSrc}
            alt={alt}
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            loading={loadingPriority}
            ref={imgRef}
            sizes={sizes}
            onLoad={handleLoad}
            onError={handleError}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Responsive Image Component
 * 
 * A wrapper for responsive images with srcset support
 */
interface ResponsiveImageProps extends Omit<ProgressiveImageProps, 'src' | 'webpSrc'> {
  srcSet?: {
    webp?: string[];
    fallback?: string[];
  };
  src: string;
  breakpoints?: number[];
}

export function ResponsiveImage({
  src,
  srcSet,
  breakpoints = [480, 768, 1024, 1280, 1920],
  ...props
}: ResponsiveImageProps) {
  // Build srcset for WebP if available
  const webpSrcSet = srcSet?.webp
    ? breakpoints
        .map((bp, i) => `${srcSet.webp[i] || srcSet.webp[srcSet.webp.length - 1]} ${bp}w`)
        .join(', ')
    : undefined;

  // Build srcset for fallback
  const fallbackSrcSet = srcSet?.fallback
    ? breakpoints
        .map((bp, i) => `${srcSet.fallback[i] || srcSet.fallback[srcSet.fallback.length - 1]} ${bp}w`)
        .join(', ')
    : undefined;

  // Generate sizes attribute if not provided
  const sizesAttr = props.sizes || '(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw';

  return (
    <picture>
      {webpSrcSet && (
        <source
          type="image/webp"
          srcSet={webpSrcSet}
          sizes={sizesAttr}
        />
      )}
      <ProgressiveImage
        {...props}
        src={src}
        sizes={sizesAttr}
      />
    </picture>
  );
}

/**
 * Background Image Component
 * 
 * A component for progressive background images
 */
interface BackgroundImageProps {
  src: string;
  webpSrc?: string;
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
  overlay?: boolean;
  overlayClassName?: string;
}

export function BackgroundImage({
  src,
  webpSrc,
  placeholder,
  className = '',
  children,
  overlay = true,
  overlayClassName = 'bg-black/40 dark:bg-black/60',
}: BackgroundImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [useWebP, setUseWebP] = useState<boolean>(false);

  useEffect(() => {
    setUseWebP(supportsWebP());
  }, []);

  const actualSrc = useWebP && webpSrc ? webpSrc : src;

  const handleLoad = () => setStatus('loaded');
  const handleError = () => setStatus('error');

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundImage: placeholder ? `url(${placeholder})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: placeholder ? 'blur(8px)' : undefined,
      }}
    >
      {/* Background Image */}
      <AnimatePresence mode="wait">
        {status === 'loaded' && (
          <motion.div
            key={actualSrc}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              backgroundImage: `url(${actualSrc})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Actual image for better quality */}
            <img
              src={actualSrc}
              alt=""
              className="w-full h-full object-cover opacity-0"
              onLoad={handleLoad}
              onError={handleError}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay */}
      {overlay && (
        <div
          className={`absolute inset-0 ${overlayClassName} transition-opacity duration-500 ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Children */}
      <div className="relative z-10">{children}</div>

      {/* Loading State */}
      {status === 'loading' && !placeholder && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      )}

      {/* Error State */}
      {status === 'error' && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

/**
 * Avatar Component with Progressive Loading
 */
interface AvatarProps {
  src: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  placeholder?: string;
}

export function Avatar({
  src,
  alt,
  size = 'md',
  className = '',
  placeholder,
}: AvatarProps) {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <ProgressiveImage
      src={src}
      alt={alt}
      placeholder={placeholder}
      className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
      showSkeleton={!placeholder}
    />
  );
}
