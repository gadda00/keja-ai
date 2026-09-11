'use client';
/**
 * KejaApp — the SPA root mounted on Next.js `/`.
 * Hash-routed views, app shell, and the platform's global surfaces.
 */
import { Suspense, lazy, useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { HashRouter, useRouter } from '@/lib/router';
import { Navbar } from '@/components/shell/Navbar';
import { Footer } from '@/components/shell/Footer';
import { MobileTabBar } from '@/components/shell/MobileTabBar';
import { DemoBanner } from '@/components/shell/DemoBanner';
import { WhatsAppFloat } from '@/components/shell/WhatsAppFloat';
import { InstallPrompt } from '@/components/shell/InstallPrompt';
import { ErrorBoundary } from '@/components/shell/ErrorBoundary';
import { TokenizeProvider } from '@/lib/tokenizeStore';
import { AuthProvider } from '@/lib/auth';
import { AdminGate } from '@/components/admin/AdminGate';
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
  '/pro': {
    title: 'Pro workspace',
    description: 'Agent and pro tooling — leads, pipeline and client management.',
    robots: 'noindex',
  },
};

/** Applies ROUTE_META for the current hash path. Detail routes
 *  (properties/:id, insights/:slug, areas/:slug) set richer entity-specific
 *  meta + JSON-LD in their own views — those views mount AFTER this effect
 *  (React runs child effects first), so their tags win. */
function RouteMeta() {
  const { route } = useRouter();
  const m = ROUTE_META[route.path] ?? { title: 'Keja AI', description: undefined };
  usePageMeta({ title: m.title, description: m.description, robots: m.robots }, route.path);
  return null;
}

function Routes() {
  const { route } = useRouter();
  const [head, id] = route.segments;

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
 *  SPA straight into that route while the address bar keeps the clean path. */
function PathToHashBridge() {
  useEffect(() => {
    const path = window.location.pathname.replace(/\/+$/, '');
    const hash = window.location.hash;
    if (hash.startsWith('#/') || path === '' || path === '/') return;
    const known = /^\/(properties|insights|areas|tokenize|trust|about|contact|legal|ask|invest|data|finance|transact|manage|tenant|diaspora|develop|institutional|partners|ecosystem|compare|sell|deal-analyst|portfolio|valuation)(\/.+)?$/;
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
 *  preserving the current path + hash. Dev hosts are exempt. */
function CanonicalOriginRedirect() {
  useEffect(() => {
    try {
      const canonical = new URL(SITE_URL);
      const here = window.location;
      if (here.protocol !== 'https:') return; // local dev / file preview
      if (here.hostname === canonical.hostname) return;
      if (!here.hostname.endsWith('.keja.app')) return; // only our own mirrors
      const target = `${canonical.origin}${here.pathname}${here.search}${here.hash}`;
      window.location.replace(target);
    } catch {
      /* malformed env — never trap the user */
    }
  }, []);
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
  return (
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <CanonicalOriginRedirect />
        <PathToHashBridge />
        <TelemetryBootstrap />
        <RouteMeta />
        <div className="flex min-h-screen flex-col bg-background">
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
                <AuthProvider>
                  <TokenizeProvider>
                    <Routes />
                    <AuthModal />
                  </TokenizeProvider>
                </AuthProvider>
              </Suspense>
            </ErrorBoundary>
          </main>
          <Footer />
          <WhatsAppFloat />
          <MobileTabBar />
          <InstallPrompt />
          <ServiceWorkerRegistrar />
        </div>
      </HashRouter>
    </MotionConfig>
  );
}
