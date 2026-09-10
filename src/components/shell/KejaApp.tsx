'use client';
/**
 * KejaApp — the SPA root mounted on Next.js `/`.
 * Hash-routed views, app shell, and the platform's global surfaces.
 */
import dynamic from 'next/dynamic';
import { Suspense, lazy, useEffect } from 'react';
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
import { Home } from '@/components/home/Home';

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
      return <Admin />;
    case 'pro':
      return <ProWorkspace />;
    case 'valuation':
      return <ValuationDesk />;
    default:
      return <NotFound />;
  }
}

/** Register the service worker (PWA offline shell) in production. */
function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);
  return null;
}

export default function KejaApp() {
  return (
    <HashRouter>
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
  );
}
