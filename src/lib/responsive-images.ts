/**
 * Responsive image helpers (audit F-24 / P1-3).
 *
 * The marketplace ships `-w480` / `-w960` WebP variants for every listing
 * photo (scripts/generate-image-variants.mjs). These helpers build the
 * matching srcset/sizes attributes so a 400px card downloads the 480w file,
 * not the 1440px original — cutting listing-card transfer sharply.
 */

/**
 * Build a srcset for a Keja image path. Variants are inserted before the
 * extension (`/a/b/photo.webp` → `/a/b/photo-w480.webp 480w, …`).
 * Returns undefined for external URLs or unsupported extensions (caller
 * then omits srcset and the plain src is used).
 */
export function srcsetFor(src: string): string | undefined {
  if (!src.startsWith('/') || src.includes('-w')) return undefined;
  const m = src.match(/^(.*\/[\w-]+)\.(webp|jpg|jpeg|png)$/);
  if (!m) return undefined;
  const [, base, ext] = m;
  return [
    `${base}-w480.${ext} 480w`,
    `${base}-w960.${ext} 960w`,
    `${src} 1440w`,
  ].join(', ');
}

/** Card-grid sizes: 1 col mobile, 2 tablet, 3-4 desktop. */
export const CARD_SIZES = '(min-width: 1280px) 30vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 92vw';

/** Full-width gallery/detail image sizes. */
export const GALLERY_SIZES = '(min-width: 1280px) 1200px, 96vw';
