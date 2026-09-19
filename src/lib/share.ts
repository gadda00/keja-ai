/**
 * Listing share kit (wave 20) — WhatsApp-first sharing for the Kenyan market.
 *
 * Kenya shares property the way it shares everything: a WhatsApp message.
 * Until this kit the detail page could only *enquire* at the Keja desk —
 * there was no way to forward a listing to the family group, the diaspora
 * aunt financing it, or a lawyer. Everything here is pure string/canvas
 * composition so it is unit-testable and adds nothing to the boot bundle
 * (`qrcode` stays behind its dynamic import, exactly like the 2FA QR).
 *
 * The poster is the offline companion: a print-ready flyer (canvas → PNG)
 * with the passport id, price band and a QR that opens the live listing —
 * the agent's window-card at a viewing, the owner's noticeboard pin.
 */
import type { Property } from '@/data/properties';
import { absoluteUrl } from '@/lib/seo';
import { formatKES } from '@/lib/format';
import { isRentalPrice } from '@/lib/finance';
import { passportId } from '@/lib/passport';
import { SITE } from '@/config';

/** Canonical, crawler-real URL for a listing (the form og:url + prerender use). */
export function listingUrl(p: Property): string {
  return absoluteUrl(`/properties/${p.id}`);
}

/** One-line listing digest for link previews / SMS / generic text shares. */
export function listingSummary(p: Property): string {
  const isRent = p.purpose.includes('rent') || isRentalPrice(p.price);
  const price = p.priceOnApplication ? 'Price on application' : formatKES(p.price, { monthly: isRent });
  const beds = p.bedrooms ? `, ${p.bedrooms}BR` : '';
  return `${p.title} — ${price}${beds} · ${p.area}, ${p.county} · Trust ${p.trustScore}/100 · ${SITE.name}`;
}

/** WhatsApp share text: summary + the live link. */
export function listingShareText(p: Property): string {
  return `${listingSummary(p)}\n${listingUrl(p)}`;
}

/**
 * WhatsApp *share-picker* link (no phone number) — opens the contact
 * chooser instead of a specific chat, which is what "forward this listing"
 * means on wa.me. Distinct from config.whatsappLink (a message TO the desk).
 */
export function whatsappShareLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Copy-paste fallback text (same content, no URL shortening). */
export function listingClipboardText(p: Property): string {
  return listingShareText(p);
}

/** Web Share API availability (feature-detected at call time, not import time). */
export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/** Share via the OS sheet when available; resolves false when the platform
 *  (or the user) declines so callers can fall back to copy. */
export async function nativeShareListing(p: Property): Promise<boolean> {
  if (!canNativeShare()) return false;
  try {
    await navigator.share({
      title: p.title,
      text: listingSummary(p),
      url: listingUrl(p),
    });
    return true;
  } catch {
    return false; // aborted or blocked — never throw on a share
  }
}

/* ------------------------------- QR poster -------------------------------- */

export interface PosterSpec {
  width: number;
  height: number;
  /** Multi-line text block rendered under the header. */
  lines: string[];
  /** Small footer note (honesty label). */
  footer: string;
  url: string;
}

/** Compose the poster's text layout (pure — the canvas just paints it). */
export function posterSpec(p: Property): PosterSpec {
  const isRent = p.purpose.includes('rent') || isRentalPrice(p.price);
  const price = p.priceOnApplication ? 'Price on application' : formatKES(p.price, { monthly: isRent });
  const facts = [
    p.bedrooms ? `${p.bedrooms} bed` : null,
    p.bathrooms ? `${p.bathrooms} bath` : null,
    `${p.sizeSqm.toLocaleString('en-KE')} m²`,
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    width: 720,
    height: 960,
    lines: [
      passportId(p),
      p.title,
      `${price}${isRent ? '' : p.purpose.includes('invest') ? ' · investment' : ''}`,
      `${p.area}, ${p.county}`,
      facts,
      `Trust Score ${p.trustScore}/100`,
      `Listed by ${p.agency}`,
    ],
    footer: 'Keja Property Passport · verification status at time of printing',
    url: listingUrl(p),
  };
}

/** Render the poster onto a 2D canvas. The QR module is injected as a
 *  data-URL-producing async fn so tests (and the view) control the import. */
export type QrRenderer = (url: string, size: number) => Promise<string>;

export async function drawPoster(
  ctx: CanvasRenderingContext2D,
  spec: PosterSpec,
  renderQr: QrRenderer,
  qrImg: HTMLImageElement,
): Promise<void> {
  const { width: W, height: H } = spec;

  // background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // brand header band (emerald-deep)
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(0, 0, W, 132);
  ctx.fillStyle = '#eab308'; // gold
  ctx.fillRect(0, 132, W, 6);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 34px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${SITE.name.toUpperCase()} · LISTING`, 36, 74);
  ctx.fillStyle = '#d1fae5';
  ctx.font = '600 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(SITE.tagline, 36, 106);

  // text block
  let y = 208;
  ctx.fillStyle = '#0f172a';
  for (let i = 0; i < spec.lines.length; i++) {
    const line = spec.lines[i];
    if (i === 0) {
      // passport id — mono, tracked, gold-adjacent
      ctx.font = '700 22px ui-monospace, monospace';
      ctx.fillStyle = '#065f46';
    } else if (i === 1) {
      // title — largest, wrapped
      ctx.font = '900 34px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#0f172a';
    } else {
      ctx.font = i === 2 ? '800 30px system-ui, -apple-system, sans-serif' : '600 22px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = i === 2 ? '#065f46' : '#334155';
    }
    // simple word wrap at 88% width
    const words = line.split(' ');
    let lineText = '';
    for (const w of words) {
      const test = lineText ? `${lineText} ${w}` : w;
      if (ctx.measureText(test).width > W - 72 && lineText) {
        ctx.fillText(lineText, 36, y);
        y += i === 1 ? 44 : 32;
        lineText = w;
      } else {
        lineText = test;
      }
    }
    ctx.fillText(lineText, 36, y);
    y += i === 1 ? 48 : i === 2 ? 40 : 34;
  }

  // QR block, bottom-right anchored
  const qrSize = 220;
  const qrX = W - qrSize - 36;
  const qrY = H - qrSize - 96;
  const qrData = await renderQr(spec.url, qrSize);
  await new Promise<void>((res, rej) => {
    qrImg.onload = () => res();
    qrImg.onerror = () => rej(new Error('QR image decode failed'));
    qrImg.src = qrData;
  });
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // URL under the QR
  ctx.fillStyle = '#065f46';
  ctx.font = '600 16px ui-monospace, monospace';
  const shortUrl = spec.url.replace(/^https?:\/\//, '');
  ctx.fillText(shortUrl.slice(0, 44), 36, H - 128 + 12);

  // footer
  ctx.fillStyle = '#64748b';
  ctx.font = '500 15px system-ui, -apple-system, sans-serif';
  ctx.fillText(spec.footer, 36, H - 44);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 13px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Printed ${new Date().toLocaleDateString('en-KE', { dateStyle: 'medium' })} · ${spec.url}`, 36, H - 22);
}
