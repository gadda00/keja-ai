interface SmartImgProps {
  /** path to the JPG under public/ (e.g. /images/props/apartment_1.jpg) */
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  width?: number;
  height?: number;
}

/**
 * Renders WebP when a sibling .webp variant exists (all keja images now ship
 * both), falling back to the JPG. Passes through dims to prevent CLS.
 */
export default function SmartImg({
  src,
  alt,
  className,
  loading = 'lazy',
  fetchPriority,
  width,
  height,
}: SmartImgProps) {
  const abs = src.startsWith('http') || src.startsWith('data:');
  const webp = abs || !src.endsWith('.jpg') ? null : src.replace(/\.jpg$/, '.webp');
  const img = (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      width={width}
      height={height}
      {...(fetchPriority ? { fetchPriority } : {})}
    />
  );
  if (abs || !webp) return img;
  return (
    <picture>
      <source srcSet={webp} type="image/webp" />
      {img}
    </picture>
  );
}
