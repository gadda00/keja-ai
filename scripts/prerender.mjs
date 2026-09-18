/**
 * Prerender  emit static, crawler-ready HTML for every public route
 * (audit F-03 Critical / P2-3).
 *
 * Problem: the platform is a hash-routed SPA inside a static export. Google
 * may render JS, but it treats the single index.html shell as one page 
 * every property, article and area page was invisible to search, and every
 * social share unfurled as the home page.
 *
 * Approach: after `next build`, clone the exported index.html once per
 * public route and inject, per page:
 *   - a real <title> + meta description + canonical + OG/Twitter tags
 *   - JSON-LD structured data (RealEstateListing / Article / Breadcrumb)
 *   - a <noscript> content summary (crawlable without JS)
 *   - a tiny inline boot script that sets location.hash before the bundle
 *     runs, so humans landing on the path URL boot straight into the view
 *
 * Vercel serves these files at path URLs (filesystem wins over the SPA
 * rewrite); the sitemap lists the same URLs. Runs under Node.js with
 * dynamic imports for TypeScript data modules.
 *
 * Usage:  node scripts/prerender.mjs    (expects out/ to exist)
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'out');
const TEMPLATE = join(DIST, 'index.html');

if (!existsSync(TEMPLATE)) {
  console.error('[prerender] out/index.html not found  run the build first');
  process.exit(1);
}

const template = readFileSync(TEMPLATE, 'utf8');

/* ------------------------------ data loading ------------------------------ */

// Dynamic import to handle TypeScript modules
async function loadProperties() {
  try {
    const mod = await import('../src/data/properties.js');
    return mod.PROPERTIES || [];
  } catch {
    // Fallback: try .ts extension
    try {
      const mod = await import('../src/data/properties.ts');
      return mod.PROPERTIES || [];
    } catch {
      console.error('[prerender] Could not load properties');
      return [];
    }
  }
}

async function loadArticles() {
  try {
    const mod = await import('../src/data/articles.js');
    return mod.ARTICLES || [];
  } catch {
    try {
      const mod = await import('../src/data/articles.ts');
      return mod.ARTICLES || [];
    } catch {
      console.error('[prerender] Could not load articles');
      return [];
    }
  }
}

async function loadNeighborhoods() {
  try {
    const mod = await import('../src/data/neighborhoods.js');
    return mod.NEIGHBORHOOD_GUIDES || [];
  } catch {
    try {
      const mod = await import('../src/data/neighborhoods.ts');
      return mod.NEIGHBORHOOD_GUIDES || [];
    } catch {
      console.error('[prerender] Could not load neighborhoods');
      return [];
    }
  }
}

async function loadAutoListings() {
  try {
    const mod = await import('../src/lib/autoListings.js');
    return mod.AUTO_PROPERTIES || [];
  } catch {
    try {
      const mod = await import('../src/lib/autoListings.ts');
      return mod.AUTO_PROPERTIES || [];
    } catch {
      console.error('[prerender] Could not load auto listings');
      return [];
    }
  }
}

async function loadConfig() {
  try {
    const mod = await import('../src/config.js');
    return mod.SITE_URL || 'https://keja.app';
  } catch {
    try {
      const mod = await import('../src/config.ts');
      return mod.SITE_URL || 'https://keja.app';
    } catch {
      return 'https://keja.app';
    }
  }
}

async function loadDetailMeta() {
  try {
    const mod = await import('../src/lib/detailMeta.js');
    return { listingMeta: mod.listingMeta, articleMeta: mod.articleMeta, areaMeta: mod.areaMeta };
  } catch {
    try {
      const mod = await import('../src/lib/detailMeta.ts');
      return { listingMeta: mod.listingMeta, articleMeta: mod.articleMeta, areaMeta: mod.areaMeta };
    } catch {
      console.error('[prerender] Could not load detailMeta');
      return { listingMeta: () => ({}), articleMeta: () => ({}), areaMeta: () => ({}) };
    }
  }
}

async function loadSectionMeta() {
  try {
    const mod = await import('../src/lib/sectionMeta.js');
    return { SECTION_META: mod.SECTION_META || [], APP_SECTION_META: mod.APP_SECTION_META || [] };
  } catch {
    try {
      const mod = await import('../src/lib/sectionMeta.ts');
      return { SECTION_META: mod.SECTION_META || [], APP_SECTION_META: mod.APP_SECTION_META || [] };
    } catch {
      console.error('[prerender] Could not load sectionMeta');
      return { SECTION_META: [], APP_SECTION_META: [] };
    }
  }
}

/* ------------------------------ helpers ---------------------------------- */

function jsonLdArray(v) {
  return v == null ? undefined : Array.isArray(v) ? v : [v];
}

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const escapeAttr = escapeHtml;

const clip = (s, n) => {
  const clean = s.replace(/\s+/g, ' ').trim();
  return clean.length <= n ? clean : `${clean.slice(0, n - 1).trimEnd()}\u2026`;
};

const money = (n) => `KES ${n.toLocaleString('en-KE')}`;

function render(page, SITE_URL) {
  const canonical = `${SITE_URL}${page.path === '/' ? '/' : `${page.path}/`}`;
  const ogImage = page.ogImage ?? '/og-image.jpg';

  const head = [
    `<link rel="canonical" href="${canonical}" />`,
    ...(page.noindex ? ['<meta name="robots" content="noindex" />'] : []),
    `<meta property="og:title" content="${escapeAttr(page.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(page.description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${SITE_URL}${ogImage}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:site_name" content="Keja AI" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(page.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(page.description)}" />`,
    `<meta name="twitter:image" content="${SITE_URL}${ogImage}" />`,
    ...(page.jsonLd ? [`<script type="application/ld+json">${JSON.stringify(page.jsonLd)}</script>`] : []),
  ].join('\n    ');

  const bootScript = `
    <script>
      location.hash = '${page.path === '/' ? '' : page.path}';
    </script>
  `;

  const noscript = page.noscript
    ? `<noscript><div style="padding:2rem;max-width:60ch;margin:0 auto">${page.noscript}</div></noscript>`
    : '';

  const title = `<title>${escapeHtml(page.title)}</title>`;

  // Replace description in the original meta tag
  const updated = template
    .replace(/<title[^>]*>.*?<\/title>/i, title)
    .replace(/<meta name="description"[^>]*>/i, (m) => {
      const match = m.match(/content="([^"]*)"/);
      return `<meta name="description" content="${escapeAttr(page.description)}" />`;
    })
    .replace(/<\/head>/i, (m) => `\n    ${head}\n    ${m}`)
    .replace(/<\/body>/i, (m) => `\n    ${noscript}\n    ${bootScript}\n    ${m}`);

  return updated;
}

function writePage(page, SITE_URL) {
  const path = join(DIST, page.path);
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
  const indexPath = join(path, 'index.html');
  const html = render(page, SITE_URL);
  writeFileSync(indexPath, html);
  console.log(`[prerender] ${page.path === '/' ? '/index.html' : `${page.path}/index.html`}`);
}

/* ------------------------------ main ------------------------------------- */

async function main() {
  const [properties, articles, neighborhoods, autoListings, SITE_URL, detailMeta, sectionMeta] = await Promise.all([
    loadProperties(),
    loadArticles(),
    loadNeighborhoods(),
    loadAutoListings(),
    loadConfig(),
    loadDetailMeta(),
    loadSectionMeta(),
  ]);

  const { listingMeta, articleMeta, areaMeta } = detailMeta;
  const { SECTION_META, APP_SECTION_META } = sectionMeta;

  // All properties (authored + auto-pilot)
  const allProperties = [...properties, ...autoListings];

  // Write property pages
  for (const p of allProperties) {
    const meta = listingMeta(p);
    writePage(
      {
        path: `/properties/${p.id}`,
        title: meta.title,
        description: meta.description,
        ogImage: p.images?.[0]?.replace(/^\//, '') || undefined,
        jsonLd: jsonLdArray(meta.jsonLd),
        noscript: `Property: ${p.title} in ${p.neighborhood}  ${money(p.price)}  ${p.bedrooms} bed, ${p.bathrooms} bath, ${p.sizeSqft} sqft`,
      },
      SITE_URL
    );
  }

  // Write article pages
  for (const a of articles) {
    const meta = articleMeta(a);
    writePage(
      {
        path: `/articles/${a.slug}`,
        title: meta.title,
        description: meta.description,
        ogImage: a.image || undefined,
        jsonLd: jsonLdArray(meta.jsonLd),
        noscript: `Article: ${a.title}`,
      },
      SITE_URL
    );
  }

  // Write neighborhood guide pages
  for (const g of neighborhoods) {
    const meta = areaMeta(g);
    writePage(
      {
        path: `/areas/${g.slug}`,
        title: meta.title,
        description: meta.description,
        ogImage: g.image || undefined,
        jsonLd: jsonLdArray(meta.jsonLd),
        noscript: `Area Guide: ${g.title}`,
      },
      SITE_URL
    );
  }

  // Write static section pages
  for (const section of SECTION_META) {
    writePage(
      {
        path: `/${section.path}`,
        title: section.title,
        description: section.description,
        noindex: section.noindex,
        noscript: section.noscriptSummary || section.title,
      },
      SITE_URL
    );
  }

  // Write app workspace shells (noindexed, interactive-only)
  for (const section of APP_SECTION_META) {
    writePage(
      {
        path: `/${section.path}`,
        title: section.title,
        description: section.description,
        noindex: true,
        noscript: section.noscriptSummary || section.title,
      },
      SITE_URL
    );
  }

  // Write home page
  writePage(
    {
      path: '/',
      title: 'Keja AI  Africa\'s Real Estate Intelligence & Trust Infrastructure',
      description: 'Discover. Verify. Analyse. Finance. Invest. Transact. Manage. Keja AI is the intelligent, trusted ecosystem for every stakeholder in African real estate.',
      noscript: 'Keja AI: Discover, Verify, Analyse, Finance, Invest, Transact, Manage properties in Africa',
    },
    SITE_URL
  );

  console.log(`[prerender] wrote ${allProperties.length + articles.length + neighborhoods.length + SECTION_META.length + APP_SECTION_META.length + 1} pages`);
}

main().catch((err) => {
  console.error('[prerender] fatal:', err);
  process.exit(1);
});
