#!/usr/bin/env node
/**
 * generate-pwa-assets.mjs — deterministic PWA artwork generator.
 *
 * Produces (into public/):
 *   icons/icon-maskable-192.png / icon-maskable-512.png
 *       Maskable icons: full-bleed brand-green tile with the house mark
 *       sized inside the 66% safe zone (mask-safe on any Android shape).
 *   splash/apple-touch-startup-<w>x<h>.png  (17 iOS device classes)
 *       Edge-to-edge launch screens for standalone iOS Safari.
 *   screenshots/narrow.png (1080x2340) + wide.png (1920x1080)
 *       Stylised app previews for the Chrome rich-install dialog.
 *
 * Zero new dependencies — sharp is already in the app tree. Idempotent:
 * regenerated files are byte-stable for the same script version.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = resolve(ROOT, 'public');

const GREEN = '#0E7A4E';
const GREEN_DEEP = '#0A5A39';
const GREEN_DARK = '#10201B';
const CREAM = '#F7F5EF';
const GOLD = '#D4B04A';
const GOLD_DARK = '#A88430';

/** The house+magnifier mark, centred on a 200x200 viewBox, param colour. */
const mark = (stroke = '#FFFFFF', fill = 'url(#gold)') => `
  <g transform="translate(100,100)">
    <path d="M -58 26 V -26 L 0 -70 L 58 -26 V 26 H 18 V -8 H -18 V 26 Z"
          fill="${fill}" stroke="${stroke}" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="52" cy="-52" r="26" fill="none" stroke="${fill}" stroke-width="9"/>
  </g>`;

const goldDefs = `
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GOLD}"/>
      <stop offset="1" stop-color="${GOLD_DARK}"/>
    </linearGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${GREEN}"/>
      <stop offset="1" stop-color="${GREEN_DEEP}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.6">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

async function maskable(size) {
  // Safe zone: mark fits inside a 66% box (min of 80% recommended — we use
  // 62% visual width for comfort on aggressive masks).
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    ${goldDefs}
    <rect width="512" height="512" fill="url(#bg)"/>
    <rect width="512" height="512" fill="url(#glow)"/>
    <g transform="scale(1.55)">${mark('rgba(255,255,255,0.35)')}</g>
  </svg>`;
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(resolve(PUB, `icons/icon-maskable-${size}.png`));
  console.log(`  icons/icon-maskable-${size}.png`);
}

async function splash(w, h) {
  const u = h / 812; // scale unit vs the iPhone X reference design
  const markSize = 200 * u;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${goldDefs}
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    <rect width="${w}" height="${h}" fill="url(#glow)"/>
    <g transform="translate(${w / 2}, ${h * 0.40}) scale(${markSize / 200})">${mark('rgba(255,255,255,0.30)')}</g>
    <text x="${w / 2}" y="${h * 0.40 + markSize * 0.95}" text-anchor="middle"
          font-family="DejaVu Sans, sans-serif" font-weight="bold"
          font-size="${Math.round(46 * u)}" fill="${CREAM}" letter-spacing="${Math.round(2 * u)}">Keja AI</text>
    <text x="${w / 2}" y="${h * 0.40 + markSize * 0.95 + Math.round(34 * u)}" text-anchor="middle"
          font-family="DejaVu Sans, sans-serif"
          font-size="${Math.round(20 * u)}" fill="${GOLD}" letter-spacing="${Math.round(1.4 * u)}">Discover · Verify · Invest</text>
  </svg>`;
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(resolve(PUB, `splash/apple-touch-startup-${w}x${h}.png`));
  console.log(`  splash/apple-touch-startup-${w}x${h}.png`);
}

async function screenshots() {
  // ---- narrow (phone) — 1080 x 2340
  const card = (x, y, w, h, price, area, tone) => `
    <g transform="translate(${x},${y})">
      <rect width="${w}" height="${h}" rx="18" fill="#FFFFFF" stroke="#E4DFD2"/>
      <rect x="1" y="1" width="${w - 2}" height="${h * 0.52}" rx="17" fill="${tone}"/>
      <rect x="${w * 0.06}" y="${h * 0.06}" width="${w * 0.30}" height="${h * 0.075}" rx="999" fill="#0E7A4E"/>
      <text x="${w * 0.09}" y="${h * 0.115}" font-family="DejaVu Sans, sans-serif" font-size="15" font-weight="bold" fill="#FFFFFF">VERIFIED</text>
      <text x="${w * 0.06}" y="${h * 0.66}" font-family="DejaVu Sans, sans-serif" font-size="26" font-weight="bold" fill="#1B2B24">${price}</text>
      <text x="${w * 0.06}" y="${h * 0.745}" font-family="DejaVu Sans, sans-serif" font-size="17" fill="#5C6B62">${area}</text>
      <rect x="${w * 0.06}" y="${h * 0.80}" width="${w * 0.42}" height="${h * 0.075}" rx="999" fill="#F0EBDD"/>
      <text x="${w * 0.09}" y="${h * 0.853}" font-family="DejaVu Sans, sans-serif" font-size="14" fill="#7C8A80">Trust Score 92/100</text>
    </g>`;

  const narrowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="2340" viewBox="0 0 1080 2340">
    ${goldDefs}
    <rect width="1080" height="2340" fill="${CREAM}"/>
    <rect width="1080" height="340" fill="url(#bg)"/>
    <g transform="translate(84, 86) scale(0.62)">${mark('rgba(255,255,255,0.30)')}</g>
    <text x="240" y="150" font-family="DejaVu Sans, sans-serif" font-size="52" font-weight="bold" fill="${CREAM}">Keja AI</text>
    <text x="240" y="210" font-family="DejaVu Sans, sans-serif" font-size="26" fill="${GOLD}">Kenya's real estate, verified</text>
    <text x="84" y="470" font-family="DejaVu Sans, sans-serif" font-size="58" font-weight="bold" fill="#1B2B24">Find a home you can trust</text>
    <text x="84" y="530" font-family="DejaVu Sans, sans-serif" font-size="30" fill="#5C6B62">Every listing scored by AI — title, price, location.</text>
    ${card(84, 610, 912, 460, 'KES 14.5M · 3 bed Kilimani', 'Nairobi · Apartment · 120 sqm', '#2E5E4B')}
    ${card(84, 1106, 912, 460, 'KES 8.9M · 2 bed Syokimau', 'Machakos · Apartment · 86 sqm', '#3A6B8A')}
    ${card(84, 1602, 912, 460, 'KES 26M · 4 bed Karen', 'Nairobi · House · 0.5 acre', '#6B5A3A')}
    <rect x="84" y="2140" width="912" height="120" rx="60" fill="#0E7A4E"/>
    <text x="540" y="2216" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="40" font-weight="bold" fill="#FFFFFF">Install the app</text>
  </svg>`;
  await sharp(Buffer.from(narrowSvg)).png().toFile(resolve(PUB, 'screenshots/narrow.png'));
  console.log('  screenshots/narrow.png');

  // ---- wide (desktop) — 1920 x 1080
  const wideCard = (x, title, sub, tone) => `
    <g transform="translate(${x},380)">
      <rect width="520" height="420" rx="20" fill="#FFFFFF" stroke="#E4DFD2"/>
      <rect x="1" y="1" width="518" height="216" rx="19" fill="${tone}"/>
      <rect x="30" y="26" width="150" height="40" rx="999" fill="#0E7A4E"/>
      <text x="48" y="54" font-family="DejaVu Sans, sans-serif" font-size="20" font-weight="bold" fill="#FFFFFF">VERIFIED</text>
      <text x="30" y="292" font-family="DejaVu Sans, sans-serif" font-size="34" font-weight="bold" fill="#1B2B24">${title}</text>
      <text x="30" y="336" font-family="DejaVu Sans, sans-serif" font-size="22" fill="#5C6B62">${sub}</text>
      <rect x="30" y="360" width="230" height="36" rx="999" fill="#F0EBDD"/>
      <text x="46" y="385" font-family="DejaVu Sans, sans-serif" font-size="18" fill="#7C8A80">Trust Score 92/100</text>
    </g>`;

  const wideSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
    ${goldDefs}
    <rect width="1920" height="1080" fill="${CREAM}"/>
    <rect width="1920" height="176" fill="url(#bg)"/>
    <g transform="translate(60, 36) scale(0.5)">${mark('rgba(255,255,255,0.30)')}</g>
    <text x="180" y="112" font-family="DejaVu Sans, sans-serif" font-size="56" font-weight="bold" fill="${CREAM}">Keja AI</text>
    <text x="760" y="112" font-family="DejaVu Sans, sans-serif" font-size="28" fill="${GOLD}">Discover · Verify · Analyse · Finance · Invest · Transact · Manage</text>
    <text x="80" y="290" font-family="DejaVu Sans, sans-serif" font-size="64" font-weight="bold" fill="#1B2B24">The trusted operating system for African real estate</text>
    ${wideCard(80, 'KES 14.5M · Kilimani', '3 bed · Nairobi · 120 sqm', '#2E5E4B')}
    ${wideCard(700, 'KES 8.9M · Syokimau', '2 bed · Machakos · 86 sqm', '#3A6B8A')}
    ${wideCard(1320, 'KES 26M · Karen', '4 bed · Nairobi · 0.5 acre', '#6B5A3A')}
    <rect x="80" y="880" width="460" height="90" rx="45" fill="#0E7A4E"/>
    <text x="310" y="938" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="34" font-weight="bold" fill="#FFFFFF">Install the app</text>
    <text x="580" y="938" font-family="DejaVu Sans, sans-serif" font-size="26" fill="#5C6B62">Works offline · Installable on Android &amp; iOS</text>
  </svg>`;
  await sharp(Buffer.from(wideSvg)).png().toFile(resolve(PUB, 'screenshots/wide.png'));
  console.log('  screenshots/wide.png');
}

// iOS launch-screen device classes: [cssW, cssH, dpr] (portrait).
const DEVICES = [
  [375, 667, 2], [414, 736, 3], [375, 812, 3], [414, 896, 2], [414, 896, 3],
  [390, 844, 3], [428, 926, 3], [393, 852, 3], [430, 926, 3], [402, 874, 3], [440, 956, 3],
  [768, 1024, 2], [810, 1080, 2], [820, 1180, 2], [834, 1194, 2], [1024, 1366, 2], [834, 1194, 3],
];

console.log('[pwa-assets] generating…');
mkdirSync(resolve(PUB, 'splash'), { recursive: true });
mkdirSync(resolve(PUB, 'screenshots'), { recursive: true });
await maskable(192);
await maskable(512);
for (const [w, h, dpr] of DEVICES) {
  await splash(w * dpr, h * dpr);
}
await screenshots();
console.log('[pwa-assets] done.');
