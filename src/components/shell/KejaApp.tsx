'use client';
/**
 * KejaApp — the SPA root mounted on Next.js `/`.
 * Hash-routed views, app shell, and the platform's global surfaces.
 */
import { Suspense, lazy, useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { MotionConfig } from 'framer-motion';
import { HashRouter, navigate, useRouter } from '@/lib/router';
import { Navbar } from '@/components/shell/Navbar';
import { Footer } from '@/components/shell/Footer';
import { MobileTabBar } from '@/components/shell/MobileTabBar';
import { DemoBanner } from '@/components/shell/DemoBanner';
import { WhatsAppFloat } from '@/components/shell/WhatsAppFloat';
import { InstallPrompt } from '@/components/shell/InstallPrompt';
import { ErrorBoundary } from '@/components/shell/ErrorBoundary';
import { TokenizeProvider } from '@/lib/tokenizeStore';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AdminGate } from '@/components/admin/AdminGate';
import { AdminShell } from '@/components/admin/AdminShell';
import {
  adminConsoleOrigin,
  decodeSessionHandoff,
  encodeSessionHandoff,
  handoffGrantsAdmin,
  isAdminHost,
  isMainProductionHost,
  probeAdminReachability,
} from '@/lib/adminHost';
import { userAccountSchema, sessionSchema } from '@/lib/boundaries';
import { store } from '@/lib/store';
import { AuthModal } from '@/components/shell/AuthModal';
import { usePageMeta } from '@/lib/seo';
import { APP_SECTION_META_BY_PATH, SECTION_META_BY_PATH } from '@/lib/sectionMeta';
import { installGlobalErrorHandlers } from '@/lib/telemetry';
import { SITE_URL } from '@/config';
import { Home } from '@/components/home/Home';
import { useToast } from '@/hooks/use-toast';

// Route-level code splitting — heavy views load on demand.
const Properties = lazy(() => import('@/components/property/PropertiesView'));
const PropertyDetail = lazy(() => import('@/components/property/PropertyDetailView'));
const CompareView = lazy(() => import('@/components/property/CompareView'));
const ListProperty = lazy(() => import('@/components/property/ListPropertyView'));
const AskKeja = lazy(() => import('@/components/ai/AskKejaView'));
const DealAnalyst = lazy(() => import('@/components/ai/DealAnalystView'));
const InvestmentCalculator = lazy(() => import('@/components/invest/InvestmentCalculatorView'));
const InvestorDashboard = lazy(() => import('@/components/invest/InvestorDashboardView'));
const MarketData = lazy(() => import('@/components/data/MarketDataView'));
const Finance = lazy(() => import('@/components/finance/FinanceView'));
const Transact = lazy(() => import('@/components/finance/TransactView'));
const Tokenize = lazy(() => import('@/components/tokenize/TokenizeView'));
const Manage = lazy(() => import('@/components/manage/ManageView'));
const TenantHub = lazy(() => import('@/components/manage/TenantHubView'));
const DiasporaHub = lazy(() => import('@/components/diaspora/DiasporaHubView'));
const DeveloperPortal = lazy(() => import('@/components/developer/DeveloperPortalView'));
const InstitutionalPortal = lazy(() => import('@/components/institutional/InstitutionalPortalView'));
const Partners = lazy(() => import('@/components/partners/PartnersView'));
const TrustCenter = lazy(() => import('@/components/trust/TrustCenterView'));
const Ecosystem = lazy(() => import('@/components/trust/EcosystemView'));
const Insights = lazy(() => import('@/components/trust/InsightsView'));
const ArticleDetail = lazy(() => import('@/components/trust/ArticleDetailView'));
const AreaGuide = lazy(() => import('@/components/trust/AreaGuideView'));
const About = lazy(() => import('@/components/trust/AboutView'));
const Contact = lazy(() => import('@/components/trust/ContactView'));
const Legal = lazy(() => import('@/components/trust/LegalView'));
const Account = lazy(() => import('@/components/common/AccountView'));
const Admin = lazy(() => import('@/components/admin/AdminView'));
const ProWorkspace = lazy(() => import('@/components/common/ProWorkspaceView'));
const ValuationDesk = lazy(() => import('@/components/common/ValuationDeskView'));
const NotFound = lazy(() => import('@/components/common/NotFoundView'));

function ViewFallback() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center" role="status" aria-label="Loading view">
      <div className="flex flex-col items-center gap-3">
        <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Per-route SEO meta (audit F-09, P0-4)                               */
/* ------------------------------------------------------------------ */

/** Static section metadata. Public sections derive from the shared catalogue
 *  (src/lib/sectionMeta.ts) — the SAME source the prerender pipeline and the
 *  sitemap generator use, so the hydrated <title>, the crawler-facing static
 *  HTML and the sitemap can never drift apart. App-workspace sections
 *  (finance, data, manage, …) also derive from the catalogue — noindexed,
 *  matching their prerendered shells. Dynamic routes (listing/article/area
 *  detail) call usePageMeta themselves with entity-specific titles + JSON-LD;
 *  the remaining private routes stay inline with noindex. */
export const ROUTE_META: Record<string, { title: string; description: string; robots?: string }> = {
  '/': {
    title: 'Keja AI — Africa\u2019s Real Estate Intelligence & Trust Infrastructure',
    description:
      'Discover. Verify. Analyse. Finance. Invest. Transact. Manage — one intelligent ecosystem for African real estate.',
  },
  ...SECTION_META_BY_PATH,
  ...APP_SECTION_META_BY_PATH,
  '/areas': {
    title: 'Area guides',
    description: 'Neighbourhood guides for Nairobi, Mombasa and Kenya\u2019s growth areas.',
  },
  '/account': {
    title: 'Your account',
    description: 'Sign in, profile and account settings.',
    robots: 'noindex',
  },
  '/admin': {
    title: 'Admin console',
    description: 'Platform administration (restricted).',
    robots: 'noindex',
  },
  // /pro and /develop derive from APP_SECTION_META since wave 17 — the
  // workspaces are noindexed app shells, no longer hand-duplicated here.
};

/** Applies ROUTE_META for the current hash path. Detail routes
 *  (properties/:id, insights/:slug, areas/:slug) set richer entity-specific
 *  meta + JSON-LD in their own views — those views mount AFTER this effect
 *  (React runs child effects first), so their tags win. On the admin host
 *  every route is the console and stays noindexed regardless of hash. */
function RouteMeta({ forceNoindex = false }: { forceNoindex?: boolean }) {
  const { route } = useRouter();
  const m = forceNoindex
    ? { title: 'Admin console', description: 'Platform administration (restricted).', robots: 'noindex' }
    : ROUTE_META[route.path] ?? { title: 'Keja AI', description: undefined };
  usePageMeta({ title: m.title, description: m.description, robots: m.robots }, route.path);
  return null;
}

function Routes({ adminOnly = false }: { adminOnly?: boolean }) {
  const { route } = useRouter();
  const [head, id] = route.segments;

  // Admin territory (admin.keja.app): every route is the console. A stray
  // hash boots into the gated console — the public marketplace never
  // renders on the admin host. AdminRouteForce snaps the hash to #/admin.
  if (adminOnly && head !== 'admin') {
    return (
      <AdminGate>
        <Admin />
      </AdminGate>
    );
  }

  switch (head) {
    case undefined:
      return <Home />;
    case 'properties':
      return id ? <PropertyDetail id={id} /> : <Properties />;
    case 'compare':
      return <CompareView />;
    case 'sell':
      return <ListProperty />;
    case 'ask':
      return <AskKeja />;
    case 'deal-analyst':
      return <DealAnalyst />;
    case 'invest':
      return <InvestmentCalculator />;
    case 'portfolio':
      return <InvestorDashboard />;
    case 'data':
      return <MarketData />;
    case 'finance':
      return <Finance />;
    case 'transact':
      return <Transact />;
    case 'tokenize':
      return <Tokenize />;
    case 'manage':
      return <Manage />;
    case 'tenant':
      return <TenantHub />;
    case 'diaspora':
      return <DiasporaHub />;
    case 'develop':
      return <DeveloperPortal />;
    case 'institutional':
      return <InstitutionalPortal />;
    case 'partners':
      return <Partners />;
    case 'trust':
      return <TrustCenter />;
    case 'ecosystem':
      return <Ecosystem />;
    case 'insights':
      return id ? <ArticleDetail slug={id} /> : <Insights />;
    case 'areas':
      return id ? <AreaGuide slug={id} /> : <NotFound />;
    case 'about':
      return <About />;
    case 'contact':
      return <Contact />;
    case 'legal':
      return <Legal />;
    case 'account':
      return <Account />;
    case 'admin':
      return (
        <AdminGate>
          <Admin />
        </AdminGate>
      );
    case 'pro':
      return <ProWorkspace />;
    case 'valuation':
      return <ValuationDesk />;
    default:
      return <NotFound />;
  }
}

/** Register the service worker (PWA offline shell) in production and
 *  surface updates (audit F-36): when a new SW takes control, offer a
 *  one-click reload instead of silently swapping behaviour mid-session. */
function ServiceWorkerRegistrar() {
  const { toast } = useToast();
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          registration.addEventListener('updatefound', () => {
            const installing = registration.installing;
            installing?.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                toast({
                  title: 'A new version is ready',
                  description: 'Reload to pick up the latest Keja update.',
                  duration: 10000,
                  action: (
                    <button
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                      onClick={() => window.location.reload()}
                    >
                      Reload
                    </button>
                  ),
                });
              }
            });
          });
        })
        .catch(() => undefined);
    }
  }, [toast]);
  return null;
}

/** Map prerendered path URLs onto the hash router on first boot.
 *  The build emits static HTML at /properties/KJA-001/ (etc.) for crawlers
 *  and social unfurls; when a human lands on one, the same index.html shell
 *  is served — setting location.hash (no reload, no navigation) boots the
 *  SPA straight into that route while the address bar keeps the clean path.
 *  On the admin host every path boots into #/admin — the console is the
 *  whole site there (wave 19). */
function PathToHashBridge() {
  useEffect(() => {
    if (isAdminHost(window.location.hostname)) {
      if (!window.location.hash.startsWith('#/')) window.location.hash = '#/admin';
      return; // admin territory: no public path mapping
    }
    const path = window.location.pathname.replace(/\/+$/, '');
    const hash = window.location.hash;
    if (hash.startsWith('#/') || path === '' || path === '/') return;
    const known = /^\/(admin|properties|insights|areas|tokenize|trust|about|contact|legal|ask|invest|data|finance|transact|manage|tenant|diaspora|develop|institutional|partners|ecosystem|compare|sell|deal-analyst|portfolio|valuation|pro)(\/.+)?$/;
    if (known.test(path)) {
      window.location.hash = `#${path}`;
    }
    // first-boot mapping only (single intentional run)
  }, []);
  return null;
}

/** Keep sessions, service workers and Google Sign-In on the single
 *  canonical origin (keja.app). The OAuth client is registered for the
 *  apex — on a www mirror Google refuses to return a credential (the
 *  stuck-popup failure mode), so we bounce to the canonical origin once,
 *  preserving the current path + hash. Dev hosts are exempt — and so is
 *  the admin territory (admin.keja.app is an intentional origin, not a
 *  mirror to squash: without the exemption this redirect would bounce
 *  every admin-host visit straight back to keja.app). */
function CanonicalOriginRedirect() {
  useEffect(() => {
    try {
      const canonical = new URL(SITE_URL);
      const here = window.location;
      if (here.protocol !== 'https:') return; // local dev / file preview
      if (here.hostname === canonical.hostname) return;
      if (isAdminHost(here.hostname)) return; // admin.keja.app lives here
      if (!here.hostname.endsWith('.keja.app')) return; // only our own mirrors
      const target = `${canonical.origin}${here.pathname}${here.search}${here.hash}`;
      window.location.replace(target);
    } catch {
      /* malformed env — never trap the user */
    }
  }, []);
  return null;
}

/* ------------------------------------------------------------------ */
/* Admin territory (wave 19): admin.keja.app                            */
/* ------------------------------------------------------------------ */

/** Consume the one-time session handoff on the admin host. localStorage
 *  is per-origin, so a session signed in on keja.app is invisible here —
 *  the envelope (?handoff=…) carries the 2FA-verified admin account
 *  across, is validated against the account + session schemas, installed
 *  into the admin origin's storage and stripped from the address bar.
 *  Tampered / expired envelopes are dropped: the sign-in wall shows. */
function AdminSessionHandoff() {
  useEffect(() => {
    try {
      if (!isAdminHost(window.location.hostname)) return;
      const payload = new URLSearchParams(window.location.search).get('handoff');
      if (!payload) return;
      const handoff = decodeSessionHandoff(payload);
      let installed = false;
      if (handoff) {
        const user = userAccountSchema.safeParse(handoff.u);
        const session = sessionSchema.safeParse(handoff.s);
        if (
          user.success &&
          session.success &&
          handoffGrantsAdmin(handoff, {
            userValid: true,
            sessionValid: true,
            user: user.data as { id: string; role: string },
            session: session.data as unknown as {
              userId: string;
              expiresAt: string;
              mfaVerified: boolean;
            },
          })
        ) {
          store.set('users', [user.data]);
          // same key AuthProvider reads (SESSION_KEY is module-private in
          // auth.tsx — kept in sync by the auth boundary tests)
          localStorage.setItem('keja:session', JSON.stringify(session.data));
          installed = true;
        }
      }
      // the envelope leaves the address bar either way (history, not reload)
      window.history.replaceState({}, '', `${window.location.pathname}#/admin`);
      // the auth provider read storage before this effect ran — one clean
      // reload boots the console with the installed session
      if (installed) window.location.reload();
    } catch {
      /* never trap an admin on a broken handoff URL */
    }
  }, []);
  return null;
}

/** Snap the hash to #/admin whenever a stray route surfaces on the admin
 *  host (old bookmarks, edited URLs). Routes already renders the console
 *  for every hash — this keeps the address bar honest. */
function AdminRouteForce() {
  const { route } = useRouter();
  useEffect(() => {
    if (route.path !== '/admin') navigate('/admin');
  }, [route.path]);
  return null;
}

/** Splash while the main site checks whether the admin territory is
 *  actually serving. Covers the flash of the gated console beneath it
 *  so an admin crossing to the subdomain never sees the main site's
 *  chrome flicker mid-handoff. */
function AdminTerritorySplash() {
  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-3 bg-background/95 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-semibold">Connecting to the admin console…</p>
      <p className="text-xs text-muted-foreground">Handing you to the admin territory</p>
    </div>
  );
}

/** The territory is unreachable (DNS not attached yet): the console runs
 *  right here on the main site — the same inline console dev and preview
 *  deployments have always used — with a dismissible amber note. The note
 *  disappears on its own the day the subdomain goes live, because a live
 *  territory means the handoff redirects before this ever mounts. */
function AdminTerritoryPending() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 pr-10 text-xs shadow-lg backdrop-blur supports-[backdrop-filter]:bg-amber-500/10 dark:text-amber-400"
      role="note"
    >
      <p className="font-semibold text-amber-700 dark:text-amber-300">
        Admin console running on the main site
      </p>
      <p className="mt-1 leading-relaxed text-amber-700/90 dark:text-amber-400/90">
        The dedicated admin.keja.app address isn&rsquo;t attached yet — DNS + Vercel domain
        wiring is a two-step, ten-minute task (docs/ADMIN_SUBDOMAIN.md). Everything works
        here in the meantime; the console moves over automatically once the subdomain is
        live.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 rounded-md p-1 text-amber-700/70 transition-colors hover:bg-amber-500/20 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 dark:text-amber-400/70 dark:hover:text-amber-400"
        aria-label="Dismiss the admin subdomain note"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

/** On the main production site, #/admin is the admin territory's door —
 *  and the door probes before it swings (wave 21). A blind handoff to
 *  admin.keja.app strands every admin on the browser's DNS error page
 *  until the subdomain's DNS + Vercel domain are attached, so first we
 *  check the territory is actually serving (no-cors fetch, ~2 s ceiling,
 *  cached per tab for 10 minutes). Live territory → the 2FA-verified
 *  session crosses in the 90-second envelope as before (the splash
 *  covers the handoff). Unreachable → the console runs inline on the
 *  main site (AdminGate still walls it) with the amber note above. Dev
 *  hosts and preview deployments never probe — they keep the local
 *  console, so test flows have no DNS dependency. */
function MainHostAdminRedirect() {
  const { route } = useRouter();
  const { user, session, isAdmin } = useAuth();
  /** Territory unreachable → the console stays on this host. Set only
   *  from the probe's async callback (state transitions during render
   *  are derived: crossing = admin-route && main-host && !fallback). */
  const [fallback, setFallback] = useState(false);

  // the shell mounts ssr:false — window is browser-only by construction
  const onAdminRoute = route.path === '/admin';
  const mainHost = isMainProductionHost(window.location.hostname);
  const crossing = onAdminRoute && mainHost && !fallback;

  useEffect(() => {
    if (!onAdminRoute || !mainHost) return; // dev/preview: local console
    let cancelled = false;
    probeAdminReachability(adminConsoleOrigin()).then((reachable) => {
      if (cancelled) return;
      if (!reachable) {
        setFallback(true);
        return;
      }
      const handoff =
        isAdmin && user && session ? encodeSessionHandoff(user, session) : null;
      const target = handoff
        ? `${adminConsoleOrigin()}/?handoff=${encodeURIComponent(handoff)}#/admin`
        : `${adminConsoleOrigin()}/#/admin`;
      window.location.replace(target);
    });
    return () => {
      cancelled = true;
    };
  }, [onAdminRoute, mainHost, user, session, isAdmin]);

  if (crossing) return <AdminTerritorySplash />;
  if (onAdminRoute && mainHost && fallback) return <AdminTerritoryPending />;
  return null;
}

/** Global error telemetry install (audit F-10). */
function TelemetryBootstrap() {
  useEffect(() => {
    installGlobalErrorHandlers();
  }, []);
  return null;
}

export default function KejaApp() {
  // The host never changes during a session — decided once at boot. The
  // root page mounts this shell with ssr:false, so the window access is
  // browser-only by construction.
  const adminHost = typeof window !== 'undefined' && isAdminHost(window.location.hostname);
  return (
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <CanonicalOriginRedirect />
        <PathToHashBridge />
        <AdminSessionHandoff />
        <TelemetryBootstrap />
        <RouteMeta forceNoindex={adminHost} />
        {/* AuthProvider wraps the whole shell (wave 17): the navbar's admin
            quick entry and account-aware chrome read the auth context — it
            can no longer live below the Navbar in the tree. */}
        <AuthProvider>
          {adminHost ? (
            /* ---------------- the admin territory (admin.keja.app) ---------------- */
            <AdminShell>
              <ErrorBoundary>
                <Suspense fallback={<ViewFallback />}>
                  <AdminRouteForce />
                  <Routes adminOnly />
                  <AuthModal />
                </Suspense>
              </ErrorBoundary>
              <ServiceWorkerRegistrar />
            </AdminShell>
          ) : (
            /* --------------------------- the public site --------------------------- */
            <div className="flex min-h-screen flex-col bg-background">
              <MainHostAdminRedirect />
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground"
              >
                Skip to main content
              </a>
              <Navbar />
              <DemoBanner />
              {/* pb-20 clears the app-style mobile tab bar */}
              <main id="main-content" className="flex-1 pb-20 pt-16 md:pb-0">
                <ErrorBoundary>
                  <Suspense fallback={<ViewFallback />}>
                    <TokenizeProvider>
                      <Routes />
                      <AuthModal />
                    </TokenizeProvider>
                  </Suspense>
                </ErrorBoundary>
              </main>
              <Footer />
              <WhatsAppFloat />
              <MobileTabBar />
              <InstallPrompt />
              <ServiceWorkerRegistrar />
            </div>
          )}
        </AuthProvider>
      </HashRouter>
    </MotionConfig>
  );
}
