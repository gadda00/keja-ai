#!/usr/bin/env node
/**
 * generate-image-variants.mjs — responsive image variants (audit F-24 / P1-3).
 *
 * Generates `-w480` and `-w960` WebP width variants for the marketplace's
 * listing photography so cards and galleries can ship a real `srcset`
 * (a 400px card no longer downloads a 1440px original). Idempotent:
 * re-running refreshes variants from their sources.
 *
 * Usage:  bun scripts/generate-image-variants.mjs   (or node, with sharp installed)
 */
import { readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['public/images/props', 'public/images/waterfront'];
const WIDTHS = [480, 960];

/** Convert any remaining jpg-only assets to webp siblings. */
async function ensureWebp(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.jpg')) continue;
    const webp = join(dir, f.replace(/\.jpg$/, '.webp'));
    if (existsSync(webp)) continue;
    await sharp(join(dir, f)).webp({ quality: 82 }).toFile(webp);
    out.push(basename(webp));
  }
  return out;
}

async function generateVariants(dir) {
  let n = 0;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.webp') || f.includes('-w')) continue;
    const src = join(dir, f);
    const meta = await sharp(src).metadata();
    const base = f.replace(/\.webp$/, '');
    for (const w of WIDTHS) {
      if ((meta.width ?? 0) <= w * 1.15) continue; // source barely larger — skip
      const target = join(dir, `${base}-w${w}.webp`);
      await sharp(src).resize({ width: w, withoutEnlargement: true }).webp({ quality: 82 }).toFile(target);
      n++;
    }
  }
  return n;
}

for (const d of DIRS) {
  const dir = resolve(ROOT, d);
  const converted = await ensureWebp(dir);
  const variants = await generateVariants(dir);
  console.log(
    `[variants] ${d}: ${converted.length} jpg→webp conversions, ${variants} width variants`,
  );
}
