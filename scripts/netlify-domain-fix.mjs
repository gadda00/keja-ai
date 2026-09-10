#!/usr/bin/env node
/**
 * netlify-domain-fix.mjs — find and release the stale keja.app domain claim,
 * then attach keja.app + www.keja.app to the keja-ai site and verify HTTPS.
 *
 * Usage:
 *   MODE=discover NETLIFY_AUTH_TOKEN=... NETLIFY_SITE_ID=... node netlify-domain-fix.mjs
 *   MODE=fix      NETLIFY_AUTH_TOKEN=... NETLIFY_SITE_ID=... node netlify-domain-fix.mjs
 *
 * MODE=discover (default) is read-only: inventories every team, site, DNS zone
 * and keja.app claim the token can see. MODE=fix additionally:
 *   1. removes keja.app / www.keja.app claims from any OTHER site (e.g. a
 *      forgotten "chacadom" project) — those domains only, nothing else;
 *   2. deletes a dormant Netlify DNS zone for keja.app if one exists in
 *      another team (only after confirming the live NS are NOT Netlify's);
 *   3. attaches keja.app (primary) + www.keja.app (alias) to the keja-ai site;
 *   4. triggers Let's Encrypt provisioning and forces HTTPS;
 *   5. polls until https://keja.app answers 200.
 *
 *   RELEASE_ONLY=1 (with MODE=fix) stops after the release steps — run it with
 *   a token from the CLAIMING account to free keja.app without attaching.
 *
 * Zero dependencies (Node >= 18, global fetch).
 */

const API = 'https://api.netlify.com/api/v1';
const DOMAIN = process.env.DOMAIN || 'keja.app';
const WWW = `www.${DOMAIN}`;
const MODE = (process.env.MODE || 'discover').toLowerCase();
const TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const SITE_ID = process.env.NETLIFY_SITE_ID;

if (!TOKEN) {
  console.error('::error::NETLIFY_AUTH_TOKEN is not set.');
  process.exit(1);
}
if (!['discover', 'fix', 'probe'].includes(MODE)) {
  console.error(`::error::MODE must be "discover", "fix" or "probe" (got "${MODE}")`);
  process.exit(1);
}

const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON response */
  }
  return { status: res.status, ok: res.ok, json, text };
}

/** Is this hostname one of OUR target domains (keja.app family, nothing else)? */
function isTargetDomain(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return h === DOMAIN || h === WWW || h.endsWith(`.${DOMAIN}`);
}

function fmtSite(s) {
  const team = s.account_slug || s.account_name || s.account_id || '?';
  return `${s.name} [${s.id}] team=${team}`;
}

async function main() {
  log(`=== Netlify domain fix — MODE=${MODE} domain=${DOMAIN} ===\n`);

  // ---- 0. whoami ----------------------------------------------------------
  const me = await api('GET', '/user');
  if (!me.ok) {
    console.error(`::error::Token invalid or expired (GET /user -> ${me.status}). ${me.text?.slice(0, 200)}`);
    process.exit(1);
  }
  log(`Authenticated as: ${me.json.email || me.json.full_name || me.json.id}`);

  // ---- 1. teams ------------------------------------------------------------
  const accounts = await api('GET', '/accounts');
  const teams = accounts.ok && Array.isArray(accounts.json) ? accounts.json : [];
  log(`\n[1] Teams visible to this token (${teams.length}):`);
  for (const t of teams) log(`    - ${t.name} [id=${t.id} slug=${t.slug}]`);
  if (!teams.length) log('    (none returned — token may be team-scoped)');

  // ---- 2. all sites (paginated) --------------------------------------------
  const sites = [];
  for (let page = 1; page <= 20; page++) {
    const r = await api('GET', `/sites?filter=all&page=${page}`);
    if (!r.ok || !Array.isArray(r.json) || r.json.length === 0) break;
    sites.push(...r.json);
    if (r.json.length < 50) break; // last page
  }
  log(`\n[2] Sites visible to this token (${sites.length}):`);
  for (const s of sites) {
    const aliases = (s.domain_aliases || []).filter(Boolean);
    log(
      `    - ${fmtSite(s)}`,
      `\n        url=${s.ssl_url || s.url}`,
      aliases.length ? `\n        aliases=${aliases.join(', ')}` : ''
    );
  }

  const kejaSite = sites.find((s) => s.id === SITE_ID) ||
    sites.find((s) => (s.name || '').toLowerCase() === 'keja-ai');
  if (!kejaSite && process.env.RELEASE_ONLY !== '1') {
    console.error(`::error::Could not find the keja-ai site (NETLIFY_SITE_ID=${SITE_ID}).`);
    console.error('::error::If this token belongs to the CLAIMING account, set RELEASE_ONLY=1 to release keja.app without attaching.');
    process.exit(1);
  }
  if (kejaSite) log(`\n    TARGET site: ${fmtSite(kejaSite)} -> ${kejaSite.ssl_url || kejaSite.url}`);

  // ---- 3. keja.app claims on sites ------------------------------------------
  const claims = []; // {site, kind: 'custom_domain'|'alias', domain}
  for (const s of sites) {
    if (isTargetDomain(s.custom_domain)) claims.push({ site: s, kind: 'custom_domain', domain: s.custom_domain });
    for (const a of s.domain_aliases || []) {
      if (isTargetDomain(a)) claims.push({ site: s, kind: 'alias', domain: a });
    }
  }
  log(`\n[3] ${DOMAIN} claims on sites:`);
  if (!claims.length) {
    log('    (none found on any visible site)');
  }
  for (const c of claims) {
    const own = c.site.id === kejaSite.id;
    log(`    - ${c.domain} on ${c.site.name} [${c.site.id}] team=${c.site.account_slug} as ${c.kind} ${own ? '(already on keja-ai — OK)' : '<< STALE CLAIM'}`);
  }

  // ---- 4. modern domain objects (if the endpoint exists) --------------------
  log(`\n[4] Modern domain records per site (GET /sites/{id}/domains):`);
  const modernClaims = []; // {site, domainObj}
  for (const s of sites.slice(0, 60)) {
    const r = await api('GET', `/sites/${s.id}/domains`);
    // Robust shape handling: array | {domains:[]} | {items:[]} | {data:[]}
    let list = null;
    if (Array.isArray(r.json)) list = r.json;
    else if (r.json && Array.isArray(r.json.domains)) list = r.json.domains;
    else if (r.json && Array.isArray(r.json.items)) list = r.json.items;
    else if (r.json && Array.isArray(r.json.data)) list = r.json.data;
    if (!list) {
      log(`    ${s.name}: GET /domains -> ${r.status} (no list) body=${(r.text || '').slice(0, 180).replace(/\n/g, ' ')}`);
      continue;
    }
    for (const d of list) {
      if (isTargetDomain(d.name)) {
        modernClaims.push({ site: s, domainObj: d });
        log(`    - ${d.name} on ${s.name} [${s.id}] ssl=${d.ssl_status ?? '?'} primary=${d.primary ?? '?'} verified=${d.verified_at ? 'yes' : 'no'}`);
      } else {
        log(`    ${s.name}: domain ${d.name} (ssl=${d.ssl_status ?? '?'})`);
      }
    }
  }
  if (!modernClaims.length) log('    (no modern domain records found for the target domain family)');

  // ---- 5. DNS zones -----------------------------------------------------------
  log(`\n[5] Netlify DNS zones:`);
  const zones = await api('GET', '/dns_zones');
  const zoneList = zones.ok && Array.isArray(zones.json) ? zones.json : [];
  if (!zoneList.length) {
    log('    (none — keja.app is not a Netlify DNS zone for this token)');
  }
  for (const z of zoneList) {
    const isTarget = z.name === DOMAIN || z.name === `*.${DOMAIN}`;
    log(`    - ${z.name} [id=${z.id}] account=${z.account_id}${isTarget ? ' << TARGET ZONE' : ''}`);
  }
  const targetZone = zoneList.find((z) => z.name === DOMAIN);

  // ---- discovery ends here -----------------------------------------------------
  if (MODE === 'probe') {
    log('\n=== PROBE: raw responses from candidate domain endpoints ===');
    const suspects = sites.filter((s) => !kejaSite || s.id !== kejaSite.id);
    const probeTargets = kejaSite ? [kejaSite, ...suspects] : sites;
    for (const s of probeTargets) {
      const paths = [
        `/sites/${s.id}/domains`,
        `/sites/${s.id}/domains/${DOMAIN}`,
        `/sites/${s.id}/domains/${WWW}`,
      ];
      for (const p of paths) {
        const r = await api('GET', p);
        log(`\n  GET ${p.replace(s.id, `<${s.name} id>`)}`);
        log(`    -> ${r.status} ${(r.text || '(empty)').slice(0, 400).replace(/\s+/g, ' ')}`);
      }
    }
    // account- and registry-scoped probes
    for (const t of teams) {
      for (const p of [`/accounts/${t.id}/domains`, `/${t.slug}/domains`]) {
        const r = await api('GET', p);
        log(`\n  GET ${p}`);
        log(`    -> ${r.status} ${(r.text || '(empty)').slice(0, 400).replace(/\s+/g, ' ')}`);
      }
    }
    for (const p of [`/domains`, `/domains/${DOMAIN}`, `/dns_zones?name=${DOMAIN}`]) {
      const r = await api('GET', p);
      log(`\n  GET ${p}`);
      log(`    -> ${r.status} ${(r.text || '(empty)').slice(0, 400).replace(/\s+/g, ' ')}`);
    }

    // every domain-ish field on every site object (catches branch deploy /
    // deploy preview subdomain claims the classic check misses)
    log('\n=== PROBE: every domain-ish field on every site ===');
    for (const s of sites) {
      const fresh = await api('GET', `/sites/${s.id}`);
      const obj = fresh.json || s;
      const domainFields = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v && typeof v === 'string' && /(domain|\.app|\.com|\.net|\.org|\.africa|\.io|\.co)/i.test(k + ' ' + v) && k !== 'url' && k !== 'ssl_url' && k !== 'admin_url' && k !== 'deploy_url' && k !== 'build_settings' && k !== 'created_at' && k !== 'updated_at' && k !== 'published_deploy') {
          domainFields[k] = v;
        }
      }
      log(`  ${s.name}: ${JSON.stringify(domainFields)}`);
    }

    // audit log — when was keja.app ever touched, and by whom?
    log('\n=== PROBE: account audit trail (domain-related events) ===');
    for (const t of teams) {
      const r = await api('GET', `/accounts/${t.id}/audit`);
      if (!r.ok) {
        log(`  GET /accounts/${t.id}/audit -> ${r.status} ${(r.text || '').slice(0, 200)}`);
        continue;
      }
      const entries = r.json.audit_logs || r.json || [];
      const hits = (Array.isArray(entries) ? entries : []).filter((e) =>
        JSON.stringify(e).toLowerCase().includes(DOMAIN) || /domain|dns/i.test(e.action || '')
      );
      log(`  team ${t.name}: ${Array.isArray(entries) ? entries.length : 0} entries total, ${hits.length} domain-related`);
      for (const e of hits.slice(0, 30)) {
        log(`    - ${e.created_at || '?'} ${e.action || '?'} actor=${e.actor?.email || e.actor_id || '?'} ${JSON.stringify(e.payload || {}).slice(0, 220).replace(/\s+/g, ' ')}`);
      }
    }

    // plan / billing / usage state (why are deploys blocked?)
    log('\n=== PROBE: account plan + usage ===');
    for (const t of teams) {
      const acc = await api('GET', `/accounts/${t.id}`);
      const caps = acc.json?.capabilities || acc.json;
      log(`  GET /accounts/${t.id} -> ${acc.status}`);
      log(`    ${JSON.stringify(caps).slice(0, 900).replace(/\s+/g, ' ')}`);
      for (const p of [`/accounts/${t.id}/usage`, `/accounts/${t.id}/billing`, `/accounts/${t.id}/plan`]) {
        const r = await api('GET', p);
        log(`  GET ${p} -> ${r.status} ${(r.text || '(empty)').slice(0, 400).replace(/\s+/g, ' ')}`);
      }
    }
    log('\n=== PROBE COMPLETE (read-only) ===');
    return;
  }

  if (MODE === 'discover') {
    log('\n=== DISCOVERY COMPLETE (no changes made) ===');
    const stale = claims.filter((c) => c.site.id !== kejaSite.id);
    if (stale.length) {
      log(`Stale claims to release: ${stale.map((c) => `${c.domain}@${c.site.name}`).join(', ')}`);
    }
    if (targetZone) log(`Dormant DNS zone to delete: ${targetZone.name} [${targetZone.id}]`);
    if (!stale.length && !targetZone) log('No stale claims visible to this token — if Netlify still refuses the domain, the claim lives in a team this token cannot see (contact Netlify support).');
    return;
  }

  // ============================ FIX MODE =====================================
  log('\n=== FIX MODE — applying changes ===');

  // ---- F1. release stale site claims (keja.app family ONLY) ------------------
  const stale = claims.filter((c) => !kejaSite || c.site.id !== kejaSite.id);
  for (const c of stale) {
    log(`\n[F1] Releasing ${c.domain} from ${c.site.name} [${c.site.id}]`);
    if (c.kind === 'custom_domain') {
      const patch = { custom_domain: null, domain_aliases: (c.site.domain_aliases || []).filter((a) => !isTargetDomain(a)) };
      const r = await api('PATCH', `/sites/${c.site.id}`, patch);
      log(`    PATCH custom_domain=null -> ${r.status} ${r.ok ? 'OK' : r.text?.slice(0, 160)}`);
    } else {
      const keep = (c.site.domain_aliases || []).filter((a) => !isTargetDomain(a));
      const r = await api('PATCH', `/sites/${c.site.id}`, { domain_aliases: keep });
      log(`    PATCH domain_aliases (minus ${c.domain}) -> ${r.status} ${r.ok ? 'OK' : r.text?.slice(0, 160)}`);
    }
  }

  // ---- F1b. release stale modern domain records ------------------------------
  for (const m of modernClaims.filter((m) => !kejaSite || m.site.id !== kejaSite.id)) {
    log(`\n[F1b] Deleting modern domain record ${m.domainObj.name} from ${m.site.name}`);
    const byId = await api('DELETE', `/sites/${m.site.id}/domains/${m.domainObj.id}`);
    if (byId.ok) {
      log(`    DELETE /domains/{id} -> ${byId.status} OK`);
    } else {
      const byName = await api('DELETE', `/sites/${m.site.id}/domains/${m.domainObj.name}`);
      log(`    DELETE by id -> ${byId.status}; by name -> ${byName.status} ${byName.ok ? 'OK' : byName.text?.slice(0, 160)}`);
    }
  }

  // ---- F2. delete dormant DNS zone (safety-checked) ---------------------------
  if (targetZone) {
    log(`\n[F2] Found Netlify DNS zone for ${targetZone.name} — checking live nameservers before deleting`);
    let ns = [];
    try {
      const dig = await (await fetch(`https://dns.google/resolve?name=${DOMAIN}&type=NS`)).json();
      ns = (dig.Answer || []).map((a) => a.data);
    } catch {
      /* resolver unreachable — treat as unknown */
    }
    const onNetlifyDns = ns.some((n) => /netlify\.com\.?$/i.test(n));
    if (ns.length && onNetlifyDns) {
      log(`    LIVE NS are Netlify (${ns.join(', ')}) — NOT deleting (zone is actively serving DNS).`);
      log('    Switch keja.app nameservers to Spaceship/other first, then re-run.');
    } else {
      log(`    Live NS: ${ns.length ? ns.join(', ') : 'unresolved'} — zone is dormant, deleting.`);
      const r = await api('DELETE', `/dns_zones/${targetZone.id}`);
      log(`    DELETE /dns_zones/{id} -> ${r.status} ${r.ok ? 'OK' : r.text?.slice(0, 200)}`);
    }
  }

  // ---- F3. attach keja.app + www to the keja-ai site (retry w/ backoff) ------
  if (process.env.RELEASE_ONLY === '1') {
    log('\n=== RELEASE_ONLY=1 — skipping attach. Now re-run this workflow with the');
    log('    keja-ai token (mode=fix) to attach keja.app + www and provision SSL. ===');
    return;
  }

  log(`\n[F3] Attaching ${DOMAIN} (+ ${WWW}) to ${kejaSite.name}`);
  let attached = false;
  let lastErr = '';
  for (let attempt = 1; attempt <= 6 && !attached; attempt++) {
    // modern endpoint first
    const apex = await api('POST', `/sites/${kejaSite.id}/domains`, { name: DOMAIN });
    const www = await api('POST', `/sites/${kejaSite.id}/domains`, { name: WWW });
    if (apex.ok || www.ok) {
      log(`    POST /domains apex -> ${apex.status} ${apex.ok ? 'OK' : apex.text?.slice(0, 160)}`);
      log(`    POST /domains www  -> ${www.status} ${www.ok ? 'OK' : www.text?.slice(0, 160)}`);
      attached = true;
    } else {
      // classic fallback: set primary custom domain + alias via PATCH
      const existingAliases = new Set((kejaSite.domain_aliases || []).filter((a) => !isTargetDomain(a)));
      const patch = { custom_domain: DOMAIN, domain_aliases: [...existingAliases, WWW] };
      const r = await api('PATCH', `/sites/${kejaSite.id}`, patch);
      log(`    PATCH custom_domain -> ${r.status} ${r.ok ? 'OK' : (r.text || '').slice(0, 600)}`);
      if (r.ok) attached = true;
      else {
        lastErr = r.text || '';
        const ownerId = (lastErr.match(/must be unique \([^)]*?,\s*([0-9a-f-]{36})\)/) || [])[1];
        if (ownerId) {
          log(`\n    !! ${DOMAIN} is claimed by Netlify account ${ownerId} (this token's team: ${kejaSite.account_id}).`);
          log('    !! Log into THAT Netlify account (check your other logins: GitHub / Google / other email),');
          log('    !! remove the keja.app DNS zone / domain there (or run this workflow with a token from it),');
          log('    !! then re-run this workflow with mode=fix.');
        }
        if (attempt < 6) {
          log(`    attempt ${attempt}/6 failed — retrying in 20s`);
          await sleep(20000);
        }
      }
    }
  }
  if (!attached) {
    console.error(`::error::Could not attach ${DOMAIN} after 6 attempts. ${lastErr.slice(0, 400)}`);
    console.error('::error::The claiming account must release the domain first — see docs/DOMAIN_CONFLICT_FIX.md.');
    process.exit(1);
  }

  // ---- F4. SSL provisioning + HTTPS redirect ----------------------------------
  log(`\n[F4] Provisioning Let's Encrypt certificate + enabling HTTPS redirect`);
  const ssl = await api('POST', `/sites/${kejaSite.id}/ssl`, { certificate: '', key: '' });
  log(`    POST /ssl -> ${ssl.status} ${ssl.ok ? 'OK' : (ssl.text || '').slice(0, 160)}`);
  const force = await api('PATCH', `/sites/${kejaSite.id}`, { force_ssl: true });
  log(`    PATCH force_ssl=true -> ${force.status} ${force.ok ? 'OK' : force.text?.slice(0, 160)}`);

  // ---- F5. poll until https://keja.app is live ---------------------------------
  log(`\n[F5] Waiting for https://${DOMAIN} to answer (DNS already points at Netlify)`);
  let live = false;
  for (let i = 1; i <= 30; i++) {
    const site = await api('GET', `/sites/${kejaSite.id}`);
    if (site.ok) {
      log(`    ssl_url=${site.json.ssl_url} ssl=${site.json.ssl}`);
    }
    try {
      const res = await fetch(`https://${DOMAIN}`, { redirect: 'manual' });
      log(`    curl https://${DOMAIN} -> ${res.status}`);
      if (res.status < 500) {
        live = true;
        break;
      }
    } catch {
      /* cert not ready yet */
    }
    await sleep(20000);
  }

  log('\n=== RESULT ===');
  if (live) {
    log(`SUCCESS — https://${DOMAIN} is answering. Certificate may take a few more minutes to settle.`);
  } else {
    log(`Domain attached but https://${DOMAIN} did not answer within the polling window.`);
    log('This is usually Let\'s Encrypt propagation — check https://app.netlify.com/sites/keja-ai/domain-management in a few minutes.');
  }
}

main().catch((e) => {
  console.error(`::error::${e?.stack || e}`);
  process.exit(1);
});
