/**
 * Wave-19 live smoke test — serves the production build and verifies the
 * two user-facing changes end to end in a real browser:
 *
 *   A. ACCOUNT MENU (main site, localhost):
 *      1. guest → "Sign in" trigger, popover with sign-in/register + the
 *         eight portals
 *      2. signed-in landlord (injected localStorage session) → avatar
 *         trigger, profile + lane chip + portal quick actions + sign out
 *      3. signed-in viewing context → on /manage the menu names the
 *         landlord console and confirms the lane
 *
 *   B. ADMIN TERRITORY (admin.localhost):
 *      4. public chrome is GONE (no navbar wordmark, no footer), the admin
 *         shell renders, the hash snaps to #/admin, page is noindexed
 *      5. stray hash (#/properties) still renders the gated console
 *      6. a valid session handoff (?handoff=…) installs the admin session
 *         and boots straight into the console; a tampered one does not
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';

const OUT = join(process.cwd(), 'out');
const PORT = 4173;
const BASE = `http://localhost:${PORT}`;
const ADMIN_BASE = `http://admin.localhost:${PORT}`;

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
  '.xml': 'application/xml',
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

const landlordUser = {
  id: 'u-smoke-landlord',
  name: 'Amina Smoke',
  email: 'amina.smoke@example.com',
  role: 'user',
  provider: 'google',
  status: 'active',
  accountType: 'landlord',
  onboardedAt: '2026-09-19T00:00:00.000Z',
  createdAt: '2026-09-01T00:00:00.000Z',
  lastLoginAt: '2026-09-19T00:00:00.000Z',
  loginCount: 3,
};

const session = {
  token: 'smoketoken000000000001',
  userId: 'u-smoke-landlord',
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  remember: false,
  mfaVerified: false,
};

const adminUser = {
  ...landlordUser,
  id: 'u-smoke-admin',
  email: 'torv54@gmail.com',
  role: 'admin',
  name: 'Smoke Admin',
  accountType: undefined,
};

const adminSession = {
  ...session,
  userId: 'u-smoke-admin',
  mfaVerified: true,
};

const installSession = (user, sess) =>
  `localStorage.setItem('keja:users', ${JSON.stringify(JSON.stringify([user]))});
   localStorage.setItem('keja:session', ${JSON.stringify(JSON.stringify(sess))});`;

/* handoff envelope minted exactly like the app does (mirrors adminHost.ts) */
const mintHandoff = (user, sess) => {
  const json = JSON.stringify({ u: user, s: sess, t: Date.now() });
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/* --------------------------------- runner --------------------------------- */

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch();
try {
  server.listen(PORT);

  /* ---- A. guest account menu on the main site ---- */
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${BASE}/#`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const signIn = await page.locator('button[aria-label="Sign in or register"], button:has-text("Sign in")').first();
    check('A1 guest sees the Sign in trigger in the navbar', await signIn.count() > 0);
    await signIn.click();
    await page.waitForTimeout(400);
    const body = await page.textContent('body') ?? '';
    check('A1 guest popover offers sign-in/register', body.includes('Sign in or register'));
    check('A1 guest popover lists all eight portals', body.includes('The eight portals')
      && body.includes('Buyers & Sellers') && body.includes('Landlords')
      && body.includes('Investors') && body.includes('Tenants')
      && body.includes('Banks & Lenders') && body.includes('Developers')
      && body.includes('Diaspora') && body.includes('Agents & Professionals'));
    await page.keyboard.press('Escape');
    check('A1 zero console errors on guest menu', errors.length === 0, errors.join(' | '));
    await page.close();
  }

  /* ---- A2. signed-in landlord account menu ---- */
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.addInitScript(installSession(landlordUser, session));
    await page.goto(`${BASE}/#`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const trigger = page.locator('button[aria-label="Your account"]').first();
    check('A2 signed-in trigger is the profile pill', await trigger.count() > 0);
    await trigger.click();
    await page.waitForTimeout(400);
    const body = await page.textContent('body') ?? '';
    check('A2 profile shows name + email', body.includes('Amina Smoke') && body.includes('amina.smoke@example.com'));
    check('A2 lane chip names the portal + workspace', body.includes('Landlords · Landlord console'));
    check('A2 portal quick actions render', body.includes('landlord · quick actions'.toUpperCase()) || body.toLowerCase().includes('landlords · quick actions'));
    check('A2 quick action links from accountTypes', body.includes('Post a property') && body.includes('Landlord console'));
    check('A2 sign out offered in place', body.includes('Sign out'));
    await page.keyboard.press('Escape');
    check('A2 zero console errors signed-in', errors.length === 0, errors.join(' | '));
    await page.close();
  }

  /* ---- A3. viewing context strip on a portal route ---- */
  {
    const page = await browser.newPage();
    await page.addInitScript(installSession(landlordUser, session));
    await page.goto(`${BASE}/#/manage`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.locator('button[aria-label="Your account"]').first().click();
    await page.waitForTimeout(400);
    const body = await page.textContent('body') ?? '';
    check('A3 viewing strip names the landlord console', body.includes('Viewing') && body.includes('Landlord console'));
    check('A3 lane match confirmed', body.includes('Your lane'));
    await page.close();
  }

  /* ---- B4. admin territory chrome + route discipline ---- */
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${ADMIN_BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const body = await page.textContent('body') ?? '';
    check('B4 admin shell renders the territory label', body.includes('Keja Admin') && body.includes('admin.localhost'));
    check('B4 public navbar chrome is gone', !(await page.locator('nav >> text=Ecosystem').count()));
    check('B4 gated console shows (sign-in wall)', body.includes('Admin console') && body.includes('restricted to platform administrators'));
    check('B4 hash snapped to #/admin', new URL(page.url()).hash === '#/admin',
      new URL(page.url()).hash);
    const robots = await page.evaluate(() => document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '');
    check('B4 page is noindexed', robots.includes('noindex'), robots);
    check('B4 zero console errors on admin host', errors.length === 0, errors.join(' | '));
    await page.close();
  }

  /* ---- B5. stray hash still lands on the console ---- */
  {
    const page = await browser.newPage();
    await page.goto(`${ADMIN_BASE}/#/properties`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const body = await page.textContent('body') ?? '';
    check('B5 stray hash renders the gated console, not the marketplace',
      body.includes('restricted to platform administrators') && !body.includes('Discover your next home'));
    check('B5 stray hash snaps back to #/admin', new URL(page.url()).hash === '#/admin');
    await page.close();
  }

  /* ---- B6. session handoff ---- */
  {
    const valid = mintHandoff(adminUser, adminSession);
    const page = await browser.newPage();
    await page.goto(`${ADMIN_BASE}/?handoff=${encodeURIComponent(valid)}#/admin`, { waitUntil: 'networkidle' });
    // install + reload + lazy AdminView chunk — wait for the console to
    // actually render the signed-in administrator, not a fixed timer
    let booted = false;
    try {
      await page.waitForFunction(
        () => document.body?.textContent?.includes('torv54@gmail.com') ?? false,
        undefined,
        { timeout: 12_000 },
      );
      booted = true;
    } catch { /* reported below */ }
    const body = await page.textContent('body') ?? '';
    check('B6 valid handoff boots into the console (admin email chip)',
      booted && body.includes('The verification desk'));
    check('B6 handoff envelope stripped from the URL', !new URL(page.url()).searchParams.has('handoff'), page.url());
    await page.close();

    const page2 = await browser.newPage();
    await page2.goto(`${ADMIN_BASE}/?handoff=${encodeURIComponent('tampered!!!')}#/admin`, { waitUntil: 'networkidle' });
    await page2.waitForTimeout(1200);
    const body2 = await page2.textContent('body') ?? '';
    check('B6 tampered handoff falls to the sign-in wall',
      body2.includes('restricted to platform administrators') && !body2.includes('torv54@gmail.com'));
    check('B6 tampered envelope stripped too', !new URL(page2.url()).searchParams.has('handoff'));
    await page2.close();
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
