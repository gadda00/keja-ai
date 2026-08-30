/**
 * Keja Tokenize — main page. Client-side real estate tokenization platform
 * (simulation): marketplace, KYC-gated investing, portfolio, issuer console
 * and academy. State persists in localStorage; the ledger is simulated.
 *
 * Deep links: /tokenize?view=marketplace|learn|portfolio|issuer
 */
import { usePageMeta } from '@/lib/seo'
import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Coins, Store, GraduationCap, Briefcase, LayoutDashboard } from 'lucide-react'
import { useTokenize } from '@/lib/tokenizeStore'
import type { TokenizeView } from '@/lib/tokenizeStore'
import { ToastProvider } from '@/components/tokenize/shared'
import { Marketplace } from '@/components/tokenize/Marketplace'
import { PropertyDetail } from '@/components/tokenize/PropertyDetail'
import { PortfolioView } from '@/components/tokenize/PortfolioView'
import { IssuerConsole } from '@/components/tokenize/IssuerConsole'
import { Learn } from '@/components/tokenize/Learn'
import { KycModal } from '@/components/tokenize/KycModal'
import { InvestModal } from '@/components/tokenize/InvestModal'

const VIEW_TABS: { v: TokenizeView; label: string; icon: typeof Store }[] = [
  { v: 'marketplace', label: 'Marketplace', icon: Store },
  { v: 'portfolio', label: 'My Portfolio', icon: LayoutDashboard },
  { v: 'issuer', label: 'Issuer Console', icon: Briefcase },
  { v: 'learn', label: 'Learn', icon: GraduationCap },
]

const VALID_VIEWS: TokenizeView[] = ['marketplace', 'portfolio', 'issuer', 'learn']

function TabBar() {
  const { view, setView } = useTokenize()
  return (
    <div className="sticky top-16 z-30 border-b border-gold-100 bg-white/95 backdrop-blur-md">
      <div className="container-luxe no-scrollbar flex items-center gap-1 overflow-x-auto py-2.5">
        <span className="mr-2 hidden items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide2 text-gold-600 sm:flex">
          <Coins className="h-4 w-4" /> Keja Tokenize
        </span>
        {VIEW_TABS.map((t) => (
          <button
            key={t.v}
            onClick={() => setView(t.v)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors ${
              view === t.v || (view === 'property' && t.v === 'marketplace')
                ? 'bg-gold-50 text-gold-700'
                : 'text-ink-soft hover:bg-gold-50/60 hover:text-gold-700'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
        <span className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 md:inline-flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          DEMO — SIMULATION MODE
        </span>
      </div>
    </div>
  )
}

function TokenizeInner() {
  const { view, setView, properties, selectedPropertyId } = useTokenize()
  const [searchParams, setSearchParams] = useSearchParams()

  // deep-link support: /tokenize?view=learn
  useEffect(() => {
    const q = searchParams.get('view')
    if (q && VALID_VIEWS.includes(q as TokenizeView)) {
      setView(q as TokenizeView)
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selected = properties.find((p) => p.id === selectedPropertyId) ?? properties[0] ?? null

  return (
    <div>
      <TabBar />
      {view === 'marketplace' && <Marketplace />}
      {view === 'property' && selected && <PropertyDetail property={selected} />}
      {view === 'portfolio' && <PortfolioView />}
      {view === 'issuer' && <IssuerConsole />}
      {view === 'learn' && <Learn />}
      {/* InvestModal first, KycModal after — KYC must stack above when both are queued */}
      <InvestModal />
      <KycModal />
    </div>
  )
}

export default function Tokenize() {
  usePageMeta(
    'Keja Tokenize — Fractional Ownership from $100',
    "Own a fraction of Nairobi's finest real estate. KYC-gated, SPV-structured, simulated-ledger tokenization demo.",
  )
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-gold-100 border-t-gold-600" />
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Loading Keja Tokenize…</p>
          </div>
        </div>
      }
    >
      <ToastProvider>
        <TokenizeInner />
      </ToastProvider>
    </Suspense>
  )
}
