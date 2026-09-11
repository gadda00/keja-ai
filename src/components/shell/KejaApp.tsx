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
import { installGlobalErrorHandlers } from '@/lib/telemetry';
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

/** Static section metadata — dynamic routes (listing/article/area detail)
 *  call usePageMeta themselves with entity-specific titles + JSON-LD. */
const ROUTE_META: Record<string, { title: string; description: string; robots?: string }> = {
  '/': {
    title: 'Keja AI — Africa\u2019s Real Estate Intelligence & Trust Infrastructure',
    description:
      'Discover. Verify. Analyse. Finance. Invest. Transact. Manage — one intelligent ecosystem for African real estate.',
  },
  '/properties': {
    title: 'Properties for sale & rent in Kenya',
    description:
      'Verified houses, apartments and land across Nairobi, Mombasa and Kenya\u2019s growth corridors — with trust scores, evidence panels and honest pricing.',
  },
  '/compare': {
    title: 'Compare properties',
    description: 'Side-by-side comparison of up to four properties — price, yield, trust and evidence.',
  },
  '/sell': {
    title: 'List a property',
    description: 'Publish a property to the Keja marketplace with AI-assisted pricing and verification-ready evidence.',
  },
  '/ask': {
    title: 'Ask Keja AI',
    description: 'Your AI property advisor for Kenya — search, qualify and hand off to a human expert.',
  },
  '/deal-analyst': {
    title: 'Deal Analyst',
    description: 'Stress-test an investment deal: yield, cash-flow, downside and exit scenarios.',
  },
  '/invest': {
    title: 'Investment calculators',
    description: 'ROI, mortgage and affordability calculators tuned to Kenyan market realities.',
  },
  '/portfolio': {
    title: 'Investor dashboard',
    description: 'Your holdings, distributions and portfolio performance.',
  },
  '/data': {
    title: 'Market data',
    description: 'Kenyan market data — area price bands, rent medians and yield trends.',
  },
  '/finance': {
    title: 'Finance centre',
    description: 'Mortgage pre-qualification, affordability and financing partners for Kenyan property.',
  },
  '/transact': {
    title: 'Transaction desk',
    description: 'Guide a property transaction from offer to closing with escrow-aligned steps.',
  },
  '/tokenize': {
    title: 'Tokenize — fractional real estate',
    description: 'Learn how Keja tokenizes income-producing Kenyan real estate — trial marketplace, journey and regulatory readiness.',
  },
  '/manage': {
    title: 'Landlord console',
    description: 'Manage units, tenants, rent collection and arrears in one console.',
  },
  '/tenant': {
    title: 'Tenant hub',
    description: 'Rent payments, maintenance requests and lease documents for tenants.',
  },
  '/diaspora': {
    title: 'Diaspora hub',
    description: 'Buy and oversee Kenyan property from abroad — verified evidence and remote processes.',
  },
  '/develop': {
    title: 'Developer portal',
    description: 'Partner with Keja to move inventory with data-backed pricing and reach.',
  },
  '/institutional': {
    title: 'Institutional portal',
    description: 'For funds, banks and REITs — portfolio tools, data feeds and co-investment.',
  },
  '/partners': {
    title: 'Partners',
    description: 'The Keja partner ecosystem — agencies, valuers, lawyers and financiers.',
  },
  '/trust': {
    title: 'Trust Center',
    description: 'How Keja verifies listings, scores trust and stays honest — claims, evidence and methodology.',
  },
  '/ecosystem': {
    title: 'Ecosystem',
    description: 'The full Keja platform map — every product surface and how they connect.',
  },
  '/insights': {
    title: 'Insights',
    description: 'Long-form guides to buying, financing and investing in Kenyan real estate.',
  },
  '/areas': {
    title: 'Area guides',
    description: 'Neighbourhood guides for Nairobi, Mombasa and Kenya\u2019s growth areas.',
  },
  '/about': {
    title: 'About Keja AI',
    description: 'The team and mission behind Keja — trusted African real estate infrastructure.',
  },
  '/contact': {
    title: 'Contact',
    description: 'Talk to the Keja team — WhatsApp, email or visit the Nairobi office.',
  },
  '/legal': {
    title: 'Legal & privacy',
    description: 'Terms of use and privacy policy — Kenya Data Protection Act aligned.',
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
  '/valuation': {
    title: 'Valuation desk',
    description: 'Instant property valuations anchored to Kenyan comparables.',
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
