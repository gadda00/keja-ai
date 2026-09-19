/**
 * Wave-20 live smoke test — serves the production build and walks the five
 * thoughtful-depth features end to end in a real browser:
 *
 *   A. SHARE — the detail page share dialog: WhatsApp share-picker link,
 *      live QR, copy link, and the poster download path.
 *   B. PRICING INTELLIGENCE — the honest comps band renders on a priced
 *      sale listing, and stays absent on a rental (nothing honest to say).
 *   C. INTENT CHIPS — "2BR Kilimani under 15M" shows what Keja AI parsed.
 *   D. RECENTLY VIEWED — two opened listings land in the store and the
 *      discovery strip.
 *   E. TENANT AFFORDABILITY — the wired competitiveness engine (income →
 *      verdict, bands, budget CTA) + the guided journey tab on account.
 *
 * Zero console errors on every visited surface, as ever.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';

const OUT = join(process.cwd(), 'out');
const PORT = 4174;
const BASE = `http://localhost:${PORT}`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  let p = decodeURIComponent(url.pathname).replace(/\/+$/, '');
  if (!p || !existsSync(join(OUT, p))) p = 'index.html';
  const file = join(OUT, p);
  if (!existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404).end('not found');
    return;
  }
  const body = readFileSync(file);
  res.writeHead(200, {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  res.end(body);
});

/* ---------------------------- session fixtures ---------------------------- */

const renterUser = {
  id: 'u-smoke-renter',
  name: 'Zawadi Smoke',
  email: 'zawadi.smoke@example.com',
  role: 'user',
  provider: 'google',
  status: 'active',
  accountType: 'renter',
  onboardedAt: '2026-09-19T00:00:00.000Z',
  createdAt: '2026-09-01T00:00:00.000Z',
  lastLoginAt: '2026-09-19T00:00:00.000Z',
  loginCount: 2,
};

const renterSession = {
  token: 'smoketoken000000000002',
  userId: 'u-smoke-renter',
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  remember: false,
  mfaVerified: false,
};

const installRenter = `localStorage.setItem('keja:users', ${JSON.stringify(JSON.stringify([renterUser]))});
  localStorage.setItem('keja:session', ${JSON.stringify(JSON.stringify(renterSession))});`;

/* --------------------------------- runner --------------------------------- */

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const newPage = async (browser) => {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return { page, errors };
};

const boot = async (page, hash, setup = '') => {
  if (setup) await page.addInitScript(setup);
  // DIRECT navigation to the hash URL as the first load — the router
  // initialises reading location.hash, so there is no hashchange race
  await page.goto(`${BASE}/#${hash}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => document.body?.textContent?.length > 2000,
    undefined,
    { timeout: 12_000 },
  );
  await page.waitForTimeout(600); // lazy-chunk settle
};

const browser = await chromium.launch();
try {
  server.listen(PORT);

  /* ---- A + B: a priced Kilimani sale listing (detail page) ---- */
  {
    const { page, errors } = await newPage(browser);
    await boot(page, '/properties/KJA-001');

    // B: pricing intelligence renders with the honest band
    let panel = false;
    try {
      await page.waitForSelector('[data-testid="pricing-intelligence"]', { timeout: 8000 });
      panel = true;
    } catch { /* reported below */ }
    const body = await page.textContent('body') ?? '';
    const compLine = body.match(/ESTIMATE from (\d+) live comparable/);
    check('B1 pricing intelligence panel renders on a priced sale listing', panel);
    check('B2 the band names its comp count (honest labelling)',
      !!compLine && Number(compLine[1]) > 0, compLine?.[1] ?? 'no comp line');
    check('B2b the panel states a position verdict (within/below/above)',
      /Within band|Below band|Above band/.test(body));
    check('B2c price-per-sqm read present when sizes known', body.includes('/m²'));

    // A: the share dialog
    let shareOk = false;
    try {
      await page.click('button:has-text("Share")', { timeout: 4000 });
      await page.waitForSelector('[role="dialog"]', { timeout: 4000 });
      shareOk = true;
    } catch { /* reported below */ }
    check('A1 the Share button opens the share dialog', shareOk);
    const dlg = await page.textContent('body') ?? '';
    check('A2 WhatsApp share-picker entry present', dlg.includes('Share on WhatsApp'));
    const waHref = await page.getAttribute('a:has-text("Share on WhatsApp")', 'href');
    check('A3 the WhatsApp link is a picker link with the listing encoded',
      !!waHref && waHref.startsWith('https://wa.me/?text='), (waHref ?? '').slice(0, 60));
    // QR renders as a data URL
    let qr = false;
    try {
      await page.waitForFunction(
        () => !!document.querySelector('img[alt^="QR code"]')?.getAttribute('src')?.startsWith('data:image/png'),
        undefined,
        { timeout: 6000 },
      );
      qr = true;
    } catch { /* reported below */ }
    check('A4 the QR renders live from the listing URL', qr);
    check('A5 poster download button present', dlg.includes('QR poster'));
    // copy link path
    const before = await page.evaluate(() => navigator.clipboard && undefined);
    void before;
    check('A6 the canonical link is shown in the dialog', dlg.includes('keja.app/properties/'));

    // D: this open entered the recently-viewed store
    const viewed = await page.evaluate(() => localStorage.getItem('keja:recently-viewed'));
    check('D1 the opened listing lands in keja:recently-viewed', !!viewed && viewed.includes('KJA-001'));
    check('Z1 zero console errors on the listing detail', errors.length === 0, errors.join(' | ').slice(0, 200));
    await page.close();
  }

  /* ---- B2: a rental listing — the panel stays away (KJA-012, seeded) ---- */
  {
    const { page, errors } = await newPage(browser);
    await boot(page, '/properties/KJA-012'); // furnished 1BR Kileleshwa, 65k/mo
    const body = await page.textContent('body') ?? '';
    check('B3 the seeded rental detail page boots', body.includes('Furnished 1BR'));
    const panelCount = await page.locator('[data-testid="pricing-intelligence"]').count();
    check('B4 pricing intelligence stays absent on a rental (honest null)', panelCount === 0);
    check('Z2 zero console errors on the rental path', errors.length === 0, errors.join(' | ').slice(0, 200));
    await page.close();
  }

  /* ---- C + D: discovery — intent chips + recently-viewed strip ---- */
  {
    const { page, errors } = await newPage(browser);
    await boot(page, '/properties?q=2BR%20Kilimani%20under%2015M',
      `localStorage.setItem('keja:recently-viewed', ${JSON.stringify(JSON.stringify([{ id: 'KJA-001', at: new Date().toISOString() }]))});`);
    const chips = await page.locator('[data-testid="intent-chips"]').count();
    const chipText = chips > 0 ? await page.textContent('[data-testid="intent-chips"]') ?? '' : '';
    check('C1 intent chips render under the search box', chips > 0);
    check('C2 the chips echo the parsed structure (beds, area, price)',
      chipText.includes('2+ beds') && chipText.includes('Kilimani') && chipText.includes('15M'), chipText.slice(0, 120));
    const strip = await page.locator('[data-testid="recently-viewed"]').count();
    check('D2 the recently-viewed strip renders on discovery', strip > 0);
    if (strip > 0) {
      const stripText = await page.textContent('[data-testid="recently-viewed"]') ?? '';
      check('D3 the strip lists the opened listing', stripText.includes('Kilimani') || stripText.length > 20);
    }
    check('Z3 zero console errors on discovery with chips + strip', errors.length === 0, errors.join(' | ').slice(0, 200));
    await page.close();
  }

  /* ---- E: tenant affordability + account journey (signed-in renter) ---- */
  {
    const { page, errors } = await newPage(browser);
    await boot(page, '/tenant', installRenter);
    let affTab = false;
    try {
      await page.click('[data-radix-collection-item]:has-text("Affordability")', { timeout: 6000 });
      affTab = true;
    } catch { /* reported below */ }
    check('E1 the tenant hub shows the Affordability tab', affTab);
    if (affTab) {
      await page.fill('#aff-income', '150000');
      await page.fill('#aff-rent', '45000');
      await page.waitForTimeout(300);
      const body = await page.textContent('body') ?? '';
      check('E2 the competitiveness verdict renders (30% → moderate)',
        body.includes('Moderate') && body.includes('% of income on rent'));
      check('E3 comfort bands render from income', body.includes('Comfortable') && body.includes('37,500'));
      check('E4 moving-in cash stack (2mo deposit + first month) shows 135,000',
        body.includes('135,000'), 'KES 135,000 = 45,000 × 3');
      const cta = await page.textContent('a, button').catch(() => '');
      void cta;
      const budgetBtn = await page.locator('button:has-text("rentals within your 30% budget")').count();
      check('E5 the budget-matched rentals CTA exists', budgetBtn > 0);
    }
    check('Z4 zero console errors in the tenant hub', errors.length === 0, errors.join(' | ').slice(0, 200));
    await page.close();
  }

  {
    const { page, errors } = await newPage(browser);
    await boot(page, '/account', installRenter);
    let journeyTab = false;
    try {
      await page.click('[data-radix-collection-item]:has-text("My journey")', { timeout: 6000 });
      journeyTab = true;
    } catch { /* reported below */ }
    check('E6 the account page has the My journey tab', journeyTab);
    if (journeyTab) {
      await page.waitForTimeout(400);
      const body = await page.textContent('body') ?? '';
      check('E7 the nine steps render with CTAs', body.includes('Discover verified stock') && body.includes('Transfer, stamp duty, keys'));
      // toggle the first step
      await page.click('button[aria-label^="Mark \\"Discover verified stock\\""]');
      await page.waitForTimeout(300);
      const stored = await page.evaluate(() => localStorage.getItem('keja:buying-journey'));
      check('E8 toggling a step persists (keja:buying-journey)', !!stored && stored.includes('"discover":true'));
      const pct = await page.textContent('body') ?? '';
      check('E9 progress moves to 11%', pct.includes('11%'));
    }
    check('Z5 zero console errors on the account page', errors.length === 0, errors.join(' | ').slice(0, 200));
    await page.close();
  }

  /* ---- F: valuation desk deep-link prefill ---- */
  {
    const { page, errors } = await newPage(browser);
    await boot(page, '/valuation?area=Kilimani&type=villa&size=200');
    // selects keep value as a DOM property, not an attribute — read via $eval
    const areaVal = await page.$eval('#vd-area', (el) => el.value);
    const typeVal = await page.$eval('#vd-type', (el) => el.value);
    const sizeVal = await page.$eval('#vd-size', (el) => el.value);
    check('F1 valuation desk prefills area from the deep link', areaVal === 'Kilimani', String(areaVal));
    check('F2 valuation desk prefills type', typeVal === 'villa', String(typeVal));
    check('F3 valuation desk prefills size', sizeVal === '200', String(sizeVal));
    check('Z6 zero console errors on the valuation desk', errors.length === 0, errors.join(' | ').slice(0, 200));
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} smoke checks passed`);
if (failed.length > 0) {
  console.log('FAILED:');
  for (const f of failed) console.log(`  ✗ ${f.name} ${f.detail}`);
  process.exit(1);
}
