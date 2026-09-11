/**
 * Progressive Image Components
 *
 * A smart image layer that:
 * - Renders the real <img> immediately (never blocks the browser from
 *   starting the download) and fades it in over a blurred LQIP placeholder
 * - Serves WebP natively via <picture><source> (no JS capability sniffing,
 *   no hydration mismatch risk)
 * - Ships skeleton and error states
 * - Respects reduced-motion via the `motion-reduce:` Tailwind variant
 */

import { useCallback, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Skeleton } from './LoadingSkeleton';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  /** Low-quality placeholder (LQIP / tiny JPEG) shown beneath the main image */
  placeholder?: string;
  /** WebP variant; served via <source> so the browser picks natively */
  webpSrc?: string;
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
 * Progressive Image Component
 *
 * The main image is always in the DOM with `opacity-0` until its load event
 * fires. The placeholder sits underneath, so users see the LQIP instantly
 * and the full image crossfades in on arrival. If hydration never runs, the
 * placeholder still shows — the layout never collapses.
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

  const handleLoad = useCallback(() => {
    setStatus('loaded');
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setStatus('error');
    onError?.();
  }, [onError]);

  // Cached images can finish loading before React attaches its event
  // listeners (prerendered HTML + warm HTTP cache). The ref callback runs
  // during commit, so this catches that case without an effect.
  const attachImg = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) {
      setStatus('loaded');
    }
  }, []);

  const frameStyle: CSSProperties = {};
  if (width !== undefined) frameStyle.width = width;
  if (height !== undefined) frameStyle.height = height;

  return (
    <div className={`relative overflow-hidden ${className}`} style={frameStyle}>
      {/* LQIP base layer — visible until the main image fades in over it */}
      {placeholder && status !== 'error' && (
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover"
          style={{ filter: 'blur(8px)' }}
        />
      )}

      {/* Skeleton layer while the main image is in flight (no placeholder case) */}
      {status === 'loading' && !placeholder && showSkeleton && (
        <Skeleton className={`absolute inset-0 ${skeletonClassName}`} variant="rectangular" />
      )}

      {status === 'error' ? (
        <div
          className="flex h-full w-full items-center justify-center rounded bg-gray-200 dark:bg-gray-700"
          role="img"
          aria-label={alt}
        >
          <svg
            className="h-8 w-8 text-gray-400 dark:text-gray-500"
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
      ) : (
        <picture>
          {webpSrc && <source type="image/webp" srcSet={webpSrc} sizes={sizes} />}
          <img
            ref={attachImg}
            src={src}
            alt={alt}
            sizes={sizes}
            loading={loadingPriority === 'high' ? 'eager' : 'lazy'}
            decoding="async"
            draggable={false}
            onLoad={handleLoad}
            onError={handleError}
            className={`relative h-full w-full object-cover transition-opacity duration-500 motion-reduce:transition-none ${
              status === 'loaded' ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </picture>
      )}
    </div>
  );
}

/**
 * Responsive Image Component
 *
 * Renders a real <picture> element with WebP + fallback srcSets so the
 * browser chooses the right asset for the viewport — plain HTML, no JS.
 */
interface ResponsiveImageProps {
  src: string;
  alt: string;
  srcSet?: {
    webp?: string[];
    fallback?: string[];
  };
  sizes?: string;
  className?: string;
  loadingPriority?: 'high' | 'low';
}

function buildSrcSet(urls: string[], breakpoints: number[]): string {
  return breakpoints
    .map((bp, i) => `${urls[i] ?? urls[urls.length - 1] ?? ''} ${bp}w`)
    .join(', ');
}

export function ResponsiveImage({
  src,
  alt,
  srcSet,
  sizes = '(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw',
  className = '',
  loadingPriority = 'low',
}: ResponsiveImageProps) {
  const breakpoints = [480, 768, 1024, 1280, 1920];
  const webpSrcSet = srcSet?.webp?.length ? buildSrcSet(srcSet.webp, breakpoints) : undefined;
  const fallbackSrcSet = srcSet?.fallback?.length ? buildSrcSet(srcSet.fallback, breakpoints) : undefined;

  return (
    <picture>
      {webpSrcSet && <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />}
      <img
        src={src}
        alt={alt}
        srcSet={fallbackSrcSet}
        sizes={sizes}
        loading={loadingPriority === 'high' ? 'eager' : 'lazy'}
        decoding="async"
        className={className}
      />
    </picture>
  );
}

/**
 * Background Image Component
 *
 * A hidden <img> with the same URL preloads the asset (cache-shared with the
 * background-image), and the real layer fades in when it arrives. No
 * chicken-and-egg: the preloader is always mounted.
 */
interface BackgroundImageProps {
  src: string;
  placeholder?: string;
  className?: string;
  children?: ReactNode;
  overlay?: boolean;
  overlayClassName?: string;
}

export function BackgroundImage({
  src,
  placeholder,
  className = '',
  children,
  overlay = true,
  overlayClassName = 'bg-black/40 dark:bg-black/60',
}: BackgroundImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  const layerStyle: CSSProperties = {
    backgroundImage: `url(${src})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* LQIP underlay while the full background streams in */}
      {placeholder && status === 'loading' && (
        <div
          aria-hidden="true"
          className="absolute inset-0 -scale-110"
          style={{
            backgroundImage: `url(${placeholder})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(8px)',
          }}
        />
      )}

      {/* Full-res layer — mounted immediately, faded in once loaded */}
      {status !== 'error' && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
          style={layerStyle}
        />
      )}

      {/* Preloader: same URL as the background layer, so this is a cache hit,
          but it gives us a reliable load event to drive the fade. */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="sr-only"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />

      {overlay && (
        <div className={`absolute inset-0 ${overlayClassName}`} aria-hidden="true" />
      )}

      <div className="relative z-10">{children}</div>

      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
          <svg
            className="h-8 w-8 text-gray-400 dark:text-gray-500"
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
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
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
