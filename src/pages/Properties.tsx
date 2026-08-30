import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, ShieldCheck, X, MapPin } from 'lucide-react'
import PropertyCard from '@/components/property/PropertyCard'
import { AREAS, type Property } from '@/data/properties'
import { useAllProperties } from '@/lib/inventory'

const TYPES = ['apartment', 'villa', 'townhouse', 'bungalow', 'land', 'commercial'] as const
const PURPOSES = [
  { value: 'all', label: 'All' },
  { value: 'buy', label: 'Buy' },
  { value: 'rent', label: 'Rent' },
  { value: 'invest', label: 'Invest' },
] as const

type SortKey = 'trust' | 'price-asc' | 'price-desc' | 'recent' | 'views'

export default function Properties() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [type, setType] = useState<string>('all')
  const [purpose, setPurpose] = useState<string>(params.get('purpose') ?? 'all')
  const [area, setArea] = useState<string>('all')
  const [maxPrice, setMaxPrice] = useState<number>(100)
  const [minBeds, setMinBeds] = useState<number>(0)
  const [verifiedOnly, setVerifiedOnly] = useState(true)
  const [sort, setSort] = useState<SortKey>('trust')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const q = params.get('q')
    if (q !== null) setQuery(q)
    const p = params.get('purpose')
    if (p) setPurpose(p)
  }, [params])

  // merged inventory: approved partner/user submissions + seed stock (see lib/inventory)
  const allProperties: Property[] = useAllProperties()

  const filtered = useMemo(() => {
    let list = [...allProperties]
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.area.toLowerCase().includes(q) ||
          p.county.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.type.includes(q) ||
          p.agency.toLowerCase().includes(q),
      )
    }
    if (type !== 'all') list = list.filter((p) => p.type === type)
    if (purpose === 'rent') list = list.filter((p) => p.purpose.includes('rent'))
    if (purpose === 'buy') list = list.filter((p) => p.purpose.includes('buy'))
    if (purpose === 'invest') list = list.filter((p) => p.purpose.includes('invest'))
    if (area !== 'all') list = list.filter((p) => p.area === area)
    list = list.filter((p) => (p.price < 500000 ? p.price <= maxPrice * 1000 : p.price <= maxPrice * 1_000_000))
    if (minBeds > 0) list = list.filter((p) => (p.bedrooms ?? 0) >= minBeds)
    if (verifiedOnly) list = list.filter((p) => p.trustScore >= 75)

    switch (sort) {
      case 'price-asc':
        list.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        list.sort((a, b) => b.price - a.price)
        break
      case 'recent':
        list.sort((a, b) => b.listedAt.localeCompare(a.listedAt))
        break
      case 'views':
        list.sort((a, b) => b.views - a.views)
        break
      default:
        list.sort((a, b) => b.trustScore - a.trustScore)
    }
    return list
  }, [allProperties, query, type, purpose, area, maxPrice, minBeds, verifiedOnly, sort])

  const clearAll = () => {
    setQuery('')
    setType('all')
    setPurpose('all')
    setArea('all')
    setMaxPrice(100)
    setMinBeds(0)
    setVerifiedOnly(true)
    setParams({})
  }

  return (
    <div className="bg-cream/60">
      <div className="container-luxe py-10 sm:py-14">
        {/* header */}
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Marketplace · {allProperties.length} verified listings</p>
          <h1 className="heading-display text-3xl sm:text-4xl">
            Verified property, <span className="gold-text">zero guesswork</span>
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
            Every listing is trust-scored by the Keja verification layer. Toggle &ldquo;verified only&rdquo; off to see
            flagged listings too — we show them, clearly labelled, because transparency protects buyers.
          </p>
        </div>

        {/* search + filter bar */}
        <div className="sticky top-16 z-30 mt-8 rounded-2xl bg-white p-4 shadow-card ring-1 ring-gold-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-600" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search area, type, ID (e.g. Kilimani, villa, KJA-001)..."
                className="input-luxe !pl-10"
              />
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-gold-50 p-1">
              {PURPOSES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPurpose(p.value)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    purpose === p.value ? 'bg-gold-gradient text-white shadow-gold-sm' : 'text-ink-muted hover:text-gold-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                showFilters ? 'border-gold-400 bg-gold-50 text-gold-700' : 'border-gold-100 text-ink-soft hover:border-gold-300'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid gap-4 border-t border-gold-100 pt-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="label-luxe">Property type</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="input-luxe">
                  <option value="all">All types</option>
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t[0].toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-luxe">Area</label>
                <select value={area} onChange={(e) => setArea(e.target.value)} className="input-luxe">
                  <option value="all">All areas</option>
                  {AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-luxe">
                  Max price: {maxPrice >= 100 ? 'Any' : maxPrice >= 1 ? `KES ${maxPrice}M` : `KES ${maxPrice * 1000}k`}
                </label>
                <input
                  type="range"
                  min={0.05}
                  max={100}
                  step={0.05}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(parseFloat(e.target.value))}
                  className="mt-2.5 w-full accent-gold-600"
                />
              </div>
              <div>
                <label className="label-luxe">Min bedrooms</label>
                <select value={minBeds} onChange={(e) => setMinBeds(parseInt(e.target.value))} className="input-luxe">
                  {[0, 1, 2, 3, 4, 5].map((b) => (
                    <option key={b} value={b}>
                      {b === 0 ? 'Any' : `${b}+`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-soft">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-gold-300 accent-gold-600"
                  />
                  <ShieldCheck className="h-4 w-4 text-gold-600" />
                  Verified only
                </label>
                <button onClick={clearAll} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-faint hover:text-gold-700">
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* results */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-ink-muted">
            <b className="text-ink">{filtered.length}</b> {filtered.length === 1 ? 'property' : 'properties'} found
            {verifiedOnly && <span className="chip ml-2">Verified only</span>}
          </p>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="input-luxe !w-auto !py-2 text-xs">
            <option value="trust">Sort: Trust score</option>
            <option value="price-asc">Price: low → high</option>
            <option value="price-desc">Price: high → low</option>
            <option value="recent">Most recent</option>
            <option value="views">Most viewed</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-16 flex flex-col items-center rounded-2xl bg-white py-16 text-center shadow-card ring-1 ring-gold-100">
            <MapPin className="h-10 w-10 text-gold-400" />
            <p className="mt-4 font-display text-xl font-semibold text-ink">No matches — try widening your search</p>
            <p className="mt-2 max-w-md text-sm text-ink-muted">
              Turn off &ldquo;verified only&rdquo;, raise the budget ceiling, or clear filters to see everything.
            </p>
            <button onClick={clearAll} className="btn-outline mt-6">
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 pb-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
