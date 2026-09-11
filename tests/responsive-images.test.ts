/**
 * Responsive image srcset helper (audit F-24 / P1-3).
 *
 * The whole point of the WebP variant pipeline: a 400px card must be able
 * to request the 480w file. If srcsetFor regresses, every listing card
 * silently downloads the 1440px original again.
 */
import { CARD_SIZES, GALLERY_SIZES, srcsetFor } from '@/lib/responsive-images';

describe('srcsetFor', () => {
  it('builds 480w / 960w / original descriptors for a webp path', () => {
    expect(srcsetFor('/images/props/apartment_0.webp')).toBe(
      '/images/props/apartment_0-w480.webp 480w, /images/props/apartment_0-w960.webp 960w, /images/props/apartment_0.webp 1440w',
    );
  });

  it('handles jpg and png sources the same way', () => {
    expect(srcsetFor('/x/photo.jpg')).toBe('/x/photo-w480.jpg 480w, /x/photo-w960.jpg 960w, /x/photo.jpg 1440w');
    expect(srcsetFor('/x/photo.png')).toContain('/x/photo-w480.png 480w');
  });

  it('returns undefined for external URLs', () => {
    expect(srcsetFor('https://cdn.example.com/photo.webp')).toBeUndefined();
  });

  it('returns undefined when the path already carries a variant', () => {
    expect(srcsetFor('/images/props/apartment_0-w480.webp')).toBeUndefined();
  });

  it('returns undefined for unsupported extensions', () => {
    expect(srcsetFor('/images/props/photo.svg')).toBeUndefined();
    expect(srcsetFor('/images/props/photo.avif')).toBeUndefined();
  });

  it('returns undefined for relative or malformed paths', () => {
    expect(srcsetFor('images/photo.webp')).toBeUndefined();
    expect(srcsetFor('')).toBeUndefined();
  });
});

describe('sizes attributes', () => {
  it('card sizes narrow from 4-column desktop to single-column mobile', () => {
    expect(CARD_SIZES).toContain('30vw');
    expect(CARD_SIZES).toContain('92vw');
    // desktop breakpoint must come before the mobile fallback
    expect(CARD_SIZES.indexOf('1280px')).toBeLessThan(CARD_SIZES.indexOf('92vw'));
  });

  it('gallery sizes cap at 1200px on wide screens', () => {
    expect(GALLERY_SIZES).toContain('1200px');
  });
});
