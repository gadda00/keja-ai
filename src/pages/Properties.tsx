import {
  BellRing,
  BookmarkPlus,
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import MapView from '@/components/property/MapView';
import PropertyCard from '@/components/property/PropertyCard';
import { AREAS, type Property } from '@/data/properties';
import { track } from '@/lib/analytics';
import { isRentalPrice } from '@/lib/finance';
import { useAllProperties } from '@/lib/inventory';
import { PRICE_CEILING, RENT_CEILING, VERIFIED_TRUST_FLOOR } from '@/lib/searchStore';
import { useAlertSweep, useSavedSearches } from '@/lib/searchStore';
import { usePageMeta } from '@/lib/seo';

const TYPES = ['apartment', 'villa', 'townhouse', 'bungalow', 'land', 'commercial'] as const;
const PURPOSES = [
  { value: 'all', label: 'All' },
  { value: 'buy', label: 'Buy' },
  { value: 'rent', label: 'Rent' },
  { value: 'invest', label: 'Invest' },
] as const;

type SortKey = 'trust' | 'price-asc' | 'price-desc' | 'recent' | 'views';

export default function Properties() {
  usePageMeta(
    'Property Marketplace — Buy, Rent & Invest',
    'Browse verified apartments, villas, townhouses and land across Nairobi, Mombasa and beyond — every listing trust-scored.'
  );
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [type, setType] = useState<string>(params.get('type') ?? 'all');
  const [purpose, setPurpose] = useState<string>(params.get('purpose') ?? 'all');
  const [area, setArea] = useState<string>(params.get('area') ?? 'all');
  const [maxPrice, setMaxPrice] = useState<number>(() => {
    const mp = parseFloat(params.get('maxPrice') ?? '');
    if (Number.isFinite(mp) && mp > 0) return mp;
    // Deep-linking ?purpose=rent must start at the RENT ceiling — otherwise
    // the default 100 reads as "KES 100k/mo cap" and hides pricier rentals.
    return params.get('purpose') === 'rent' ? RENT_CEILING : PRICE_CEILING;
  });
  const [minBeds, setMinBeds] = useState<number>(() => parseInt(params.get('minBeds') ?? '0') || 0);
  const [verifiedOnly, setVerifiedOnly] = useState(params.get('verified') !== '0');
  const [sort, setSort] = useState<SortKey>((params.get('sort') as SortKey) ?? 'trust');
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const { searches, save, remove, toggleAlerts } = useSavedSearches();

  const purposeRef = useRef(purpose);
  useEffect(() => {
    const q = params.get('q');
    if (q !== null) setQuery(q);
    const p = params.get('purpose');
    if (p && p !== purposeRef.current) {
      purposeRef.current = p;
      setPurpose(p);
      setMaxPrice(p === 'rent' ? RENT_CEILING : PRICE_CEILING);
    }
  }, [params]);

  // merged inventory: approved partner/user submissions + seed stock (see lib/inventory)
  const allProperties: Property[] = useAllProperties();
  useAlertSweep(allProperties);

  const filtered = useMemo(() => {
    let list = [...allProperties];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.area.toLowerCase().includes(q) ||
          p.county.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.type.includes(q) ||
          p.agency.toLowerCase().includes(q)
      );
    }
    if (type !== 'all') list = list.filter((p) => p.type === type);
    // Rent mode shows true rentals only (price IS the monthly rent, below the
    // rental price floor). Sale-priced listings that merely allow renting
    // (purpose includes 'rent' but price is a sale price) used to leak into
    // rent results at their sale price — e.g. "KES 11M" next to a KES 65k/mo
    // rental. They are investment stock for the buy/invest modes instead.
    if (purpose === 'rent')
      list = list.filter((p) => p.purpose.includes('rent') && isRentalPrice(p.price));
    if (purpose === 'buy') list = list.filter((p) => p.purpose.includes('buy'));
    if (purpose === 'invest') list = list.filter((p) => p.purpose.includes('invest'));
    if (area !== 'all') list = list.filter((p) => p.area === area);
    // Dual-scale price cap: rent mode caps monthly rent (KES k), sale mode
    // caps sale price (KES M). At ceiling, no cap. Rentals never get filtered
    // by a sale cap and vice-versa — the units are incomparable.
    const rentMode = purpose === 'rent';
    const atCeiling = maxPrice >= (rentMode ? RENT_CEILING : PRICE_CEILING);
    if (!atCeiling) {
      // POA listings carry no price, so a price cap cannot vouch for them —
      // they drop out of capped result sets (portals behave the same way).
      list = list.filter((p) =>
        p.priceOnApplication
          ? false
          : isRentalPrice(p.price)
            ? !(rentMode && p.price > maxPrice * 1000)
            : !(!rentMode && p.price > maxPrice * 1_000_000)
      );
    }
    if (minBeds > 0) list = list.filter((p) => (p.bedrooms ?? 0) >= minBeds);
    if (verifiedOnly) list = list.filter((p) => p.trustScore >= VERIFIED_TRUST_FLOOR);

    switch (sort) {
      case 'price-asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'recent':
        list.sort((a, b) => b.listedAt.localeCompare(a.listedAt));
        break;
      case 'views':
        list.sort((a, b) => b.views - a.views);
        break;
      case 'trust':
      default:
        list.sort((a, b) => b.trustScore - a.trustScore);
    }
    return list;
  }, [allProperties, query, type, purpose, area, maxPrice, minBeds, verifiedOnly, sort]);

  // Local-only analytics: log completed searches (debounced) with their result
  // counts. Never leaves the device — see lib/analytics.ts.
  useEffect(() => {
    if (!query.trim()) return;
    const t = window.setTimeout(() => {
      track({ event: 'search', query: query.trim().slice(0, 80), results: filtered.length });
    }, 800);
    return () => window.clearTimeout(t);
  }, [query, filtered.length]);

  const clearAll = () => {
    setQuery('');
    setType('all');
    setPurpose('all');
    setArea('all');
    setMaxPrice(PRICE_CEILING);
    setMinBeds(0);
    setVerifiedOnly(true);
    setSort('trust');
    setParams({});
  };

  // Keep the URL shareable: filters sync to query params (deep-linkable state)
  useEffect(() => {
    const next: Record<string, string> = {};
    if (query.trim()) next.q = query.trim();
    if (type !== 'all') next.type = type;
    if (purpose !== 'all') next.purpose = purpose;
    if (area !== 'all') next.area = area;
    if (maxPrice < (purpose === 'rent' ? RENT_CEILING : PRICE_CEILING))
      next.maxPrice = String(maxPrice);
    if (minBeds > 0) next.minBeds = String(minBeds);
    if (!verifiedOnly) next.verified = '0';
    if (sort !== 'trust') next.sort = sort;
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, type, purpose, area, maxPrice, minBeds, verifiedOnly, sort]);

  return (
    <div className="bg-cream/60">
      <div className="container-luxe py-10 sm:py-14">
        {/* header */}
        <div className="flex flex-col gap-2">
          <p className="eyebrow">
            Marketplace · {allProperties.filter((p) => p.trustScore >= 75).length} verified ·{' '}
            {allProperties.length} total
          </p>
          <h1 className="heading-display text-3xl sm:text-4xl">
            Verified property, <span className="gold-text">zero guesswork</span>
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
            Every listing is trust-scored by the Keja verification layer. Toggle &ldquo;verified
            only&rdquo; off to see flagged listings too — we show them, clearly labelled, because
            transparency protects buyers.
          </p>
        </div>

        {/* search + filter bar */}
        <div className="sticky top-16 sticky-banner-shift z-30 mt-8 rounded-2xl bg-white p-4 shadow-card ring-1 ring-gold-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-600" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search area, type, ID (e.g. Kilimani, villa, KJA-001)..."
                aria-label="Search properties by area, type or listing ID"
                className="input-luxe !pl-10"
              />
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-gold-50 p-1">
              {PURPOSES.map((p) => (
                <button
                  key={p.value}
                  aria-pressed={purpose === p.value}
                  onClick={() => {
                    setPurpose(p.value);
                    setMaxPrice(p.value === 'rent' ? RENT_CEILING : PRICE_CEILING);
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    purpose === p.value
                      ? 'bg-gold-gradient text-white shadow-gold-sm'
                      : 'text-ink-muted hover:text-gold-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                showFilters
                  ? 'border-gold-400 bg-gold-50 text-gold-700'
                  : 'border-gold-100 text-ink-soft hover:border-gold-300'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
            <button
              onClick={() =>
                save(
                  {
                    q: query || undefined,
                    type,
                    purpose,
                    area,
                    maxPrice,
                    minBeds,
                    verifiedOnly,
                    sort,
                  },
                  [
                    query || 'All areas',
                    type !== 'all' ? type : '',
                    purpose !== 'all' ? purpose : '',
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'All properties'
                )
              }
              className="inline-flex items-center gap-2 rounded-xl border border-gold-100 px-4 py-2.5 text-sm font-semibold text-ink-soft transition hover:border-gold-300 hover:text-gold-700"
            >
              <BookmarkPlus className="h-4 w-4" />
              Save search
            </button>
            <div
              className="flex items-center gap-1 rounded-xl bg-gold-50 p-1"
              role="group"
              aria-label="Result view"
            >
              <button
                onClick={() => setView('list')}
                aria-pressed={view === 'list'}
                aria-label="List view"
                className={`rounded-lg p-2 transition ${view === 'list' ? 'bg-gold-gradient text-white shadow-gold-sm' : 'text-ink-muted hover:text-gold-700'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('map')}
                aria-pressed={view === 'map'}
                aria-label="Map view"
                className={`rounded-lg p-2 transition ${view === 'map' ? 'bg-gold-gradient text-white shadow-gold-sm' : 'text-ink-muted hover:text-gold-700'}`}
              >
                <MapIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {showFilters ? (
            <div className="mt-4 grid gap-4 border-t border-gold-100 pt-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label htmlFor="pr-type" className="label-luxe">
                  Property type
                </label>
                <select
                  id="pr-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="input-luxe"
                >
                  <option value="all">All types</option>
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t[0].toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pr-area" className="label-luxe">
                  Area
                </label>
                <select
                  id="pr-area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="input-luxe"
                >
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
                  {purpose === 'rent'
                    ? `Max rent: ${maxPrice >= RENT_CEILING ? 'Any' : `KES ${maxPrice}k/mo`}`
                    : `Max price: ${maxPrice >= PRICE_CEILING ? 'Any' : maxPrice >= 1 ? `KES ${maxPrice}M` : `KES ${maxPrice * 1000}k`}`}
                </label>
                <input
                  type="range"
                  min={purpose === 'rent' ? 10 : 0.05}
                  max={purpose === 'rent' ? RENT_CEILING : PRICE_CEILING}
                  step={purpose === 'rent' ? 5 : 0.05}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(parseFloat(e.target.value))}
                  className="mt-2.5 w-full accent-gold-600"
                  aria-label={
                    purpose === 'rent' ? 'Maximum monthly rent' : 'Maximum purchase price'
                  }
                />
              </div>
              <div>
                <label htmlFor="pr-beds" className="label-luxe">
                  Min bedrooms
                </label>
                <select
                  id="pr-beds"
                  value={minBeds}
                  onChange={(e) => setMinBeds(parseInt(e.target.value))}
                  className="input-luxe"
                >
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
                <button
                  onClick={clearAll}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-ink-faint hover:text-gold-700"
                >
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* saved searches */}
        {searches.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Saved searches
            </span>
            {searches.map((s) => (
              <span key={s.id} className="chip group">
                <button
                  onClick={() => {
                    setQuery(s.filters.q ?? '');
                    setType(s.filters.type ?? 'all');
                    setPurpose(s.filters.purpose ?? 'all');
                    setArea(s.filters.area ?? 'all');
                    if (s.filters.maxPrice != null) setMaxPrice(s.filters.maxPrice);
                    else
                      setMaxPrice(
                        (s.filters.purpose ?? 'all') === 'rent' ? RENT_CEILING : PRICE_CEILING
                      );
                    if (s.filters.minBeds != null) setMinBeds(s.filters.minBeds);
                    if (s.filters.verifiedOnly != null) setVerifiedOnly(s.filters.verifiedOnly);
                    if (s.filters.sort) setSort(s.filters.sort as SortKey);
                  }}
                  className="font-semibold"
                >
                  {s.label}
                </button>
                <button
                  onClick={() => toggleAlerts(s.id)}
                  aria-label={
                    s.alerts ? `Disable alerts for ${s.label}` : `Enable alerts for ${s.label}`
                  }
                  aria-pressed={s.alerts}
                  className={s.alerts ? 'text-gold-700' : 'text-ink-muted/50'}
                >
                  <BellRing className="h-3 w-3" />
                </button>
                <button
                  onClick={() => remove(s.id)}
                  aria-label={`Delete saved search ${s.label}`}
                  className="text-ink-muted/50 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* results */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-ink-muted">
            <b className="text-ink">{filtered.length}</b>{' '}
            {filtered.length === 1 ? 'property' : 'properties'} found
            {verifiedOnly ? <span className="chip ml-2">Verified only</span> : null}
          </p>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort results"
            className="input-luxe !w-auto !py-2 text-xs"
          >
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
            <p className="mt-4 font-display text-xl font-semibold text-ink">
              No matches — try widening your search
            </p>
            <p className="mt-2 max-w-md text-sm text-ink-muted">
              Turn off &ldquo;verified only&rdquo;, raise the budget ceiling, or clear filters to
              see everything.
            </p>
            <button onClick={clearAll} className="btn-outline mt-6">
              Clear all filters
            </button>
          </div>
        ) : view === 'map' ? (
          <div className="mt-6">
            <MapView
              properties={filtered}
              onSelectArea={(a) => {
                setArea(a);
                setView('list');
              }}
            />
            <div className="mt-6 grid gap-6 pb-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.slice(0, 6).map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
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
  );
}
