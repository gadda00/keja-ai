import { Link, useSearchParams } from 'react-router-dom'
import { GitCompareArrows, X, TrendingUp, ShieldCheck, BedDouble, Bath, Ruler, Building2, Gauge, MapPin } from 'lucide-react'
import { useAllProperties } from '@/lib/inventory'
import { formatKES } from '@/lib/format'
import { investmentScore, scoreTone } from '@/lib/investmentScore'
import { calculateMortgage } from '@/lib/finance'
import { useStore, KEYS } from '@/lib/store'
import SmartImg from '@/components/ui/SmartImg'
import { usePageMeta } from '@/lib/seo'

export default function Compare() {
  usePageMeta('Compare Properties', 'Side-by-side comparison of Keja-verified properties: price, yields, Investment Score, trust and mortgage estimates.')
  const [params] = useSearchParams()
  const all = useAllProperties()
  const [compare, setCompare] = useStore<string[]>(KEYS.compare, [])

  const ids = params.get('ids')?.split(',').filter(Boolean) ?? compare
  const items = ids.map((id) => all.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p)).slice(0, 4)

  const removeOne = (id: string) => setCompare(compare.filter((c) => c !== id))

  const rows: { label: string; render: (p: (typeof items)[number]) => React.ReactNode }[] = [
    { label: 'Price', render: (p) => <b className="font-display text-lg text-ink">{formatKES(p.price, { monthly: p.price < 500_000 })}</b> },
    { label: 'Area', render: (p) => <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-gold-600" />{p.area}, {p.county}</span> },
    { label: 'Type', render: (p) => <span className="capitalize">{p.type}</span> },
    { label: 'Bedrooms', render: (p) => <span className="inline-flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5 text-gold-600" />{p.bedrooms ?? '—'}</span> },
    { label: 'Bathrooms', render: (p) => <span className="inline-flex items-center gap-1.5"><Bath className="h-3.5 w-3.5 text-gold-600" />{p.bathrooms ?? '—'}</span> },
    { label: 'Size', render: (p) => <span className="inline-flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5 text-gold-600" />{p.sizeSqm.toLocaleString()} sqm</span> },
    { label: 'Agency', render: (p) => <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-gold-600" />{p.agency}</span> },
    { label: 'Trust score', render: (p) => <span className="inline-flex items-center gap-1.5 font-semibold"><ShieldCheck className="h-4 w-4 text-gold-600" />{p.trustScore}/100</span> },
    {
      label: 'Investment Score™',
      render: (p) => {
        const s = investmentScore(p)
        return (
          <span className="inline-flex items-baseline gap-1.5">
            <span className={`rounded-md px-2 py-0.5 font-display text-sm font-bold ${scoreTone(s.overall).chip}`}>{s.overall.toFixed(1)}</span>
            <span className="text-xs text-ink-muted">{s.band}</span>
          </span>
        )
      },
    },
    {
      label: 'Est. gross yield',
      render: (p) => (p.grossYieldEstimate ? <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700"><TrendingUp className="h-3.5 w-3.5" />{p.grossYieldEstimate}% p.a.</span> : <span className="text-ink-muted">—</span>),
    },
    {
      label: 'Est. rent',
      render: (p) => (p.rentEstimate ? formatKES(p.rentEstimate, { monthly: true }) : <span className="text-ink-muted">—</span>),
    },
    {
      label: 'Mortgage (20% deposit, 15yr)',
      render: (p) => {
        if (p.price < 500_000) return <span className="text-ink-muted">Rental listing</span>
        const m = calculateMortgage({ propertyPrice: p.price, depositPct: 20, annualRatePct: 13.5, termYears: 15 })
        return <span>{formatKES(Math.round(m.monthlyRepayment), { monthly: true })}</span>
      },
    },
    {
      label: 'Score breakdown',
      render: (p) => {
        const s = investmentScore(p)
        return (
          <ul className="space-y-1 text-left text-xs">
            {s.factors.slice(0, 5).map((f) => (
              <li key={f.label} className="flex items-center justify-between gap-2">
                <span className="text-ink-muted">{f.label}</span>
                <b>{f.score.toFixed(1)}</b>
              </li>
            ))}
          </ul>
        )
      },
    },
  ]

  return (
    <div className="container-luxe py-10">
      <p className="eyebrow">Decision tools</p>
      <h1 className="heading-display mt-2 text-3xl sm:text-4xl">
        Compare <span className="gold-text">side by side</span>
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
        Up to four properties, one honest table: price, yields, Investment Score™, trust and mortgage
        estimates — the numbers that actually decide a purchase, computed the same way for every listing.
      </p>

      {items.length === 0 ? (
        <div className="mt-14 flex flex-col items-center rounded-2xl bg-white py-16 text-center shadow-card ring-1 ring-gold-100">
          <GitCompareArrows className="h-10 w-10 text-gold-400" />
          <p className="mt-4 font-display text-xl font-semibold text-ink">Nothing to compare yet</p>
          <p className="mt-2 max-w-md text-sm text-ink-muted">
            Browse the marketplace and tap the compare icon on any property card to add it here.
          </p>
          <Link to="/properties" className="btn-gold mt-6">Browse properties</Link>
        </div>
      ) : (
        <>
          <div className="mt-8 overflow-x-auto rounded-2xl bg-white shadow-card ring-1 ring-gold-100">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <caption className="sr-only">Property comparison table</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-10 bg-white p-4 text-left align-bottom text-xs font-bold uppercase tracking-wider text-ink-muted">
                    Property
                  </th>
                  {items.map((p) => (
                    <th key={p.id} scope="col" className="min-w-[220px] p-4 text-left align-bottom">
                      <div className="relative">
                        <button
                          onClick={() => removeOne(p.id)}
                          aria-label={`Remove ${p.title} from comparison`}
                          className="absolute right-0 top-0 rounded-full bg-white/90 p-1 text-ink-muted shadow-sm hover:text-red-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <Link to={`/properties/${p.id}`} className="group block pr-6">
                          <div className="h-24 w-full overflow-hidden rounded-xl">
                            <SmartImg src={p.images[0]} alt={p.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                          </div>
                          <p className="mt-2 font-display text-sm font-bold leading-snug text-ink group-hover:text-gold-700">{p.title}</p>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-700">{p.id}</p>
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.label} className={i % 2 === 0 ? 'bg-cream/40' : ''}>
                    <th scope="row" className="sticky left-0 z-10 bg-inherit p-4 text-left text-xs font-bold uppercase tracking-wider text-ink-muted">
                      {r.label}
                    </th>
                    {items.map((p) => (
                      <td key={p.id} className="p-4 align-top text-ink-soft">
                        {r.render(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/properties" className="btn-outline">
              <GitCompareArrows className="h-4 w-4" /> Add more properties
            </Link>
            <button onClick={() => setCompare([])} className="btn-outline !border-red-200 !text-red-700 hover:!bg-red-50">
              Clear comparison
            </button>
          </div>
        </>
      )}

      <section className="card-luxe mt-10 p-6">
        <p className="flex items-center gap-2 text-sm font-bold text-ink">
          <Gauge className="h-4 w-4 text-gold-600" /> How to read this table
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Investment Score™ weighs location intelligence, yield, trust, liquidity and growth potential —
          every property is scored on the same seven factors, so a 7.8 apartment in Kilimani and a 7.8
          villa in Karen faced identical tests. Mortgage figures assume 20% down, 13.5% p.a. over 15
          years (ESTIMATE — your bank quotes the binding rate). Gross yields are marketplace estimates;
          net yields after service charges and vacancies run 1.5–2.5 points lower.
        </p>
      </section>
    </div>
  )
}
