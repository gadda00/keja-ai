/**
 * Admin Console — platform operations hub (blueprint Ch.14–15 & Ch.8):
 * overview KPIs, user management (RBAC), listing review with trust-by-design
 * anomaly flags, lead pipeline, partner & feed ops, audit trail, settings.
 */
import { usePageMeta } from '@/lib/seo'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutGrid,
  Users,
  Building2,
  Flame,
  Handshake,
  FileClock,
  Settings2,
  ShieldCheck,
  TrendingUp,
  Lock,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import AdminOverview from '@/components/admin/AdminOverview'
import AdminUsers from '@/components/admin/AdminUsers'
import AdminListings from '@/components/admin/AdminListings'
import AdminLeads from '@/components/admin/AdminLeads'
import AdminPartners from '@/components/admin/AdminPartners'
import AdminAudit from '@/components/admin/AdminAudit'
import AdminSettings from '@/components/admin/AdminSettings'

type Tab = 'overview' | 'users' | 'listings' | 'leads' | 'partners' | 'audit' | 'settings'

const TABS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'listings', label: 'Listings', icon: Building2 },
  { id: 'leads', label: 'Leads', icon: Flame },
  { id: 'partners', label: 'Partners & Feeds', icon: Handshake },
  { id: 'audit', label: 'Audit Trail', icon: FileClock },
  { id: 'settings', label: 'Settings', icon: Settings2 },
]

export default function Admin() {
  usePageMeta(
    'Admin Console — Keja Platform Operations',
    'Users, verification queue, leads, partners, audit trail and settings.',
  )
  const { isAdmin, isLoggedIn, setAuthModalOpen } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')

  const guard = useMemo(() => {
    if (!isLoggedIn) return 'auth'
    if (!isAdmin) return 'role'
    return null
  }, [isLoggedIn, isAdmin])

  if (guard === 'auth') {
    return (
      <div className="container-luxe flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-gradient shadow-gold-md">
          <Lock className="h-8 w-8 text-white" />
        </span>
        <h1 className="heading-display text-3xl">Admin Console</h1>
        <p className="max-w-md text-sm leading-relaxed text-ink-muted">
          Restricted area. Sign in with an administrator account to manage users, listings,
          partners and platform operations.
        </p>
        <button onClick={() => setAuthModalOpen(true)} className="btn-gold mt-2">
          Sign in as administrator
        </button>
        <p className="text-xs text-ink-faint">
          Demo: admin@keja.ai / admin123 — or continue with Google (Clive Mwangi)
        </p>
      </div>
    )
  }

  if (guard === 'role') {
    return (
      <div className="container-luxe flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
          <ShieldCheck className="h-8 w-8 text-red-600" />
        </span>
        <h1 className="heading-display text-3xl">Access denied</h1>
        <p className="max-w-md text-sm leading-relaxed text-ink-muted">
          Your account does not have administrator privileges. Role-based access control is active
          per the KEJA security architecture — contact the platform owner if you believe this is an
          error.
        </p>
        <Link to="/account" className="btn-outline mt-2">
          Back to my account
        </Link>
      </div>
    )
  }

  return (
    <div className="container-luxe py-10">
      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Keja Platform Operations
          </p>
          <h1 className="heading-display mt-1 text-3xl sm:text-4xl">Admin Console</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
            The operating layer of the KEJA marketplace — users, verification queue, lead engine,
            global supply partnerships, auditability and platform settings in one command centre.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2.5 ring-1 ring-green-200">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
          <span className="text-xs font-semibold text-green-800">All systems operational</span>
          <RefreshCw className="ml-1 h-3.5 w-3.5 text-green-600" />
        </div>
      </div>

      {/* tabs */}
      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-gold-100 pb-px" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-gold-600 bg-gold-50/60 text-gold-700'
                : 'border-transparent text-ink-soft hover:bg-gold-50/40 hover:text-gold-700'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* content */}
      <div className="py-8">
        {tab === 'overview' && <AdminOverview onNavigate={(t) => setTab(t as Tab)} />}
        {tab === 'users' && <AdminUsers />}
        {tab === 'listings' && <AdminListings />}
        {tab === 'leads' && <AdminLeads />}
        {tab === 'partners' && <AdminPartners />}
        {tab === 'audit' && <AdminAudit />}
        {tab === 'settings' && <AdminSettings />}
      </div>
    </div>
  )
}
