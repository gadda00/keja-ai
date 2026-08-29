/**
 * Account — signed-in user home: profile, session details, role, activity.
 * Blueprint Ch.14: role-based access, privacy by design, session control.
 */
import { Link } from 'react-router-dom'
import {
  UserCircle2,
  ShieldCheck,
  LogOut,
  KeyRound,
  Activity,
  Heart,
  Clock,
  Sparkles,
  Settings2,
  Mail,
  Phone,
  Building2,
} from 'lucide-react'
import { useAuth, initials } from '@/lib/auth'
import { useStore, KEYS } from '@/lib/store'
import { PROPERTIES } from '@/data/properties'
import PropertyCard from '@/components/property/PropertyCard'

export default function Account() {
  const { user, session, logout, isAdmin, setAuthModalOpen } = useAuth()
  const [favorites] = useStore<string[]>(KEYS.favorites, [])
  const [viewed] = useStore<{ id: string; ts: string }[]>(KEYS.viewed, [])
  const [chat] = useStore<{ id: string; role: string; text: string; ts: string }[]>(KEYS.chat, [])

  if (!user) {
    return (
      <div className="container-luxe flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-gradient shadow-gold-md">
          <UserCircle2 className="h-8 w-8 text-white" />
        </span>
        <h1 className="heading-display text-3xl">Sign in to your account</h1>
        <p className="max-w-md text-sm leading-relaxed text-ink-muted">
          Access your saved properties, investment portfolio, Keja Tokenize holdings and
          personalised AI conversations — all in one secure place.
        </p>
        <button onClick={() => setAuthModalOpen(true)} className="btn-gold mt-2">
          Sign in with Google or email
        </button>
      </div>
    )
  }

  const favProperties = PROPERTIES.filter((p) => favorites.includes(p.id)).slice(0, 3)
  const sessionExpires = session
    ? new Date(session.expiresAt).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  return (
    <div className="container-luxe py-12">
      {/* header card */}
      <div className="card-luxe overflow-hidden">
        <div className="flex flex-col gap-6 bg-gradient-to-br from-ink via-ink-soft to-ink px-6 py-8 text-white sm:flex-row sm:items-center sm:px-8">
          <span
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gold-gradient text-2xl font-bold shadow-gold-md"
            aria-hidden="true"
          >
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow !text-gold-300">Keja Account</p>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{user.name}</h1>
            <p className="mt-1 truncate text-sm text-white/70">{user.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-gradient px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                <ShieldCheck className="h-3.5 w-3.5" /> {user.role} access
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/80">
                {user.provider === 'google' ? 'Google account' : 'Email account'}
              </span>
              {user.company && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/80">
                  {user.company}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            {isAdmin && (
              <Link to="/admin" className="btn-gold !py-2.5 !text-xs">
                <Settings2 className="h-4 w-4" /> Admin Console
              </Link>
            )}
            <button
              onClick={() => logout()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 px-4 py-2.5 text-xs font-semibold text-white/90 transition hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>

        {/* meta strip */}
        <div className="grid grid-cols-2 divide-gold-100 border-t border-gold-100 sm:grid-cols-4 sm:divide-x">
          {[
            { label: 'Member since', value: new Date(user.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }), icon: Clock },
            { label: 'Sign-ins', value: String(user.loginCount), icon: Activity },
            { label: 'Saved properties', value: String(favorites.length), icon: Heart },
            { label: 'AI conversations', value: String(chat.length), icon: Sparkles },
          ].map((m) => (
            <div key={m.label} className="flex flex-col gap-1 px-5 py-4">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                <m.icon className="h-3.5 w-3.5 text-gold-600" /> {m.label}
              </span>
              <span className="font-display text-lg font-bold text-ink">{m.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* body grid */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {favProperties.length > 0 && (
            <section>
              <h2 className="heading-display mb-4 text-xl">Saved properties</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {favProperties.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
              <Link
                to="/properties"
                className="mt-3 inline-block text-xs font-semibold text-gold-700 hover:underline"
              >
                Browse all verified inventory →
              </Link>
            </section>
          )}

          <section className="card-luxe p-6">
            <h2 className="heading-display mb-4 flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-gold-600" /> Recent Keja AI activity
            </h2>
            {chat.length ? (
              <ul className="flex flex-col gap-3">
                {[...chat]
                  .reverse()
                  .slice(0, 5)
                  .map((m) => (
                    <li key={m.id} className="flex items-start gap-3 rounded-xl bg-gold-50/60 p-3">
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          m.role === 'user'
                            ? 'bg-ink text-gold-200'
                            : 'bg-gold-gradient text-white'
                        }`}
                      >
                        {m.role === 'user' ? 'You' : 'AI'}
                      </span>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-xs leading-relaxed text-ink-soft">{m.text}</p>
                        <p className="mt-1 text-[10px] text-ink-faint">
                          {new Date(m.ts).toLocaleString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">
                No conversations yet —{' '}
                <Link to="/ask" className="font-semibold text-gold-700 hover:underline">
                  ask Keja AI
                </Link>{' '}
                about any property, investment or trust question.
              </p>
            )}
          </section>

          {viewed.length > 0 && (
            <section className="card-luxe p-6">
              <h2 className="heading-display mb-4 text-lg">Recently viewed</h2>
              <div className="flex flex-wrap gap-2">
                {viewed.slice(0, 8).map((v) => {
                  const prop = PROPERTIES.find((p) => p.id === v.id)
                  return (
                    <Link
                      key={v.id + v.ts}
                      to={`/properties/${v.id}`}
                      className="rounded-lg bg-gold-50 px-3 py-1.5 text-xs font-medium text-ink-soft ring-1 ring-gold-100 transition hover:bg-gold-100"
                    >
                      {prop ? prop.title.slice(0, 34) + (prop.title.length > 34 ? '…' : '') : v.id}
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        {/* sidebar */}
        <div className="flex flex-col gap-6">
          <section className="card-luxe p-6">
            <h2 className="heading-display mb-4 flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-gold-600" /> Session
            </h2>
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Status</dt>
                <dd className="flex items-center gap-1.5 font-semibold text-green-700">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" /> Active
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-ink-muted">Expires</dt>
                <dd className="text-right font-medium text-ink">{sessionExpires}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-ink-muted">Token</dt>
                <dd className="text-right font-mono text-[11px] text-ink-faint">
                  {session?.token.slice(0, 12)}••••
                </dd>
              </div>
            </dl>
            <button
              onClick={() => logout('security-refresh')}
              className="btn-outline mt-4 w-full !py-2.5 !text-xs"
            >
              Sign out of this device
            </button>
          </section>

          <section className="card-luxe p-6">
            <h2 className="heading-display mb-4 text-lg">Contact & profile</h2>
            <ul className="flex flex-col gap-3 text-sm">
              <li className="flex items-center gap-2.5 text-ink-soft">
                <Mail className="h-4 w-4 shrink-0 text-gold-600" />
                <span className="truncate">{user.email}</span>
              </li>
              <li className="flex items-center gap-2.5 text-ink-soft">
                <Phone className="h-4 w-4 shrink-0 text-gold-600" />
                {user.phone ?? 'Add a phone number for viewing updates'}
              </li>
              <li className="flex items-center gap-2.5 text-ink-soft">
                <Building2 className="h-4 w-4 shrink-0 text-gold-600" />
                {user.company ?? 'Independent member'}
              </li>
            </ul>
            <p className="mt-4 rounded-lg bg-gold-50 p-3 text-[11px] leading-relaxed text-ink-muted ring-1 ring-gold-100">
              <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-gold-600" />
              Privacy by design: your data stays on your device in this demo build. The production
              platform stores it encrypted with role-based access controls and full audit trails.
            </p>
          </section>

          <section className="card-luxe bg-ink p-6 text-white">
            <p className="eyebrow !text-gold-300">Keja ecosystem</p>
            <h3 className="font-display mt-1 text-lg font-bold">
              One account. Every Keja product.
            </h3>
            <ul className="mt-3 flex flex-col gap-2 text-xs text-white/75">
              <li>• KEJA HOME — discovery & guided decisions</li>
              <li>• KEJA INVEST — analysis, scores & reports</li>
              <li>• KEJA PRO — agent CRM & lead engine</li>
              <li>• KEJA MANAGE — landlord & tenant tools</li>
              <li>• KEJA TOKENIZE — fractional ownership</li>
            </ul>
            <Link to="/ecosystem" className="btn-gold mt-4 w-full !py-2.5 !text-xs">
              Explore the ecosystem
            </Link>
          </section>
        </div>
      </div>
    </div>
  )
}
