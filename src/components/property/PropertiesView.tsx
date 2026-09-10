'use client';
/**
 * Keja Home — property discovery (proposal §2).
 * Search, facets (area/type/purpose/price/beds/trust), sorting, comparison
 * and saved searches. Every card surfaces the Trust Score.
 */
import { useMemo, useState } from 'react';
import { Bell, Filter, Search, SlidersHorizontal, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from '@/hooks/use-toast';
import { useAllProperties } from '@/lib/inventory';
import { isRentalPrice } from '@/lib/finance';
import type { Property } from '@/data/properties';
import { PropertyCard } from '@/components/property/PropertyCard';
import { CompareBar, useCompare } from '@/components/property/CompareBar';
import { navigate, useRouter } from '@/lib/router';
import { useStore } from '@/lib/store';
import { useSavedSearches } from '@/lib/searchStore';
import { cn } from '@/lib/utils';

type SortKey = 'trust' | 'price-asc' | 'price-desc' | 'newest' | 'yield';

const MAX_PRICE = 150_000_000;

function priceIsMonthly(p: Property) {
  return p.purpose.includes('rent') && !p.purpose.some((x) => x === 'buy' || x === 'invest');
}

function PropertiesInner({ initialQ }: { initialQ: string }) {
  const all = useAllProperties();
  const [q, setQ] = useState(initialQ);
  const [area, setArea] = useState<string>('all');
  const [type, setType] = useState<string>('all');
  const [purpose, setPurpose] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const [minTrust, setMinTrust] = useState(0);
  const [beds, setBeds] = useState<string>('any');
  const [sort, setSort] = useState<SortKey>('trust');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [favorites, setFavorites] = useStore<string[]>('favorites', []);
  const { ids: compareIds, toggle } = useCompare();
  const { save: addSavedSearch } = useSavedSearches();

  const areas = useMemo(() => [...new Set(all.map((p) => p.area))].sort(), [all]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = all.filter((p) => {
      if (needle) {
        const hay = `${p.title} ${p.area} ${p.county} ${p.type} ${p.description}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (area !== 'all' && p.area !== area) return false;
      if (type !== 'all' && p.type !== type) return false;
      if (purpose !== 'all' && !p.purpose.includes(purpose as Property['purpose'][number])) return false;
      if (p.price > maxPrice && !p.priceOnApplication) return false;
      if (p.trustScore < minTrust) return false;
      if (beds !== 'any') {
        const min = parseInt(beds, 10);
        if ((p.bedrooms ?? 0) < min) return false;
      }
      return true;
    });
    const monthly = (p: Property) => (priceIsMonthly(p) || isRentalPrice(p.price));
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'newest':
          return new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime();
        case 'yield':
          return (b.grossYieldEstimate ?? 0) - (a.grossYieldEstimate ?? 0);
        default:
          return b.trustScore - a.trustScore;
      }
    });
    void monthly;
    return list;
  }, [all, q, area, type, purpose, maxPrice, minTrust, beds, sort]);

  const toggleSave = (p: Property) =>
    setFavorites((prev) =>
      prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id],
    );

  const saveSearch = () => {
    const label = [
      q.trim() || 'All areas',
      area !== 'all' ? area : null,
      type !== 'all' ? type : null,
      purpose !== 'all' ? purpose : null,
    ]
      .filter(Boolean)
      .join(' · ');
    addSavedSearch(
      {
        q: q.trim() || undefined,
        area: area !== 'all' ? area : undefined,
        type: type !== 'all' ? type : undefined,
        purpose: purpose !== 'all' ? purpose : undefined,
      },
      label,
    );
    toast({ title: 'Search saved', description: `We'll alert you when matching listings arrive. (${label})` });
  };

  const activeFilters =
    (area !== 'all' ? 1 : 0) +
    (type !== 'all' ? 1 : 0) +
    (purpose !== 'all' ? 1 : 0) +
    (maxPrice < MAX_PRICE ? 1 : 0) +
    (minTrust > 0 ? 1 : 0) +
    (beds !== 'any' ? 1 : 0);

  const FiltersBody = (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Area</p>
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">All areas</SelectItem>
            {areas.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Property type</p>
        <div className="flex flex-wrap gap-1.5">
          {['all', 'apartment', 'villa', 'townhouse', 'bungalow', 'land', 'commercial'].map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-bold capitalize transition-colors',
                type === t ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/50',
              )}
            >
              {t === 'all' ? 'All types' : t}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Purpose</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            { k: 'all', l: 'Any' },
            { k: 'buy', l: 'Buy' },
            { k: 'rent', l: 'Rent' },
            { k: 'invest', l: 'Invest' },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setPurpose(t.k)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                purpose === t.k ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/50',
              )}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Max price · KES {maxPrice >= MAX_PRICE ? 'Any' : `${(maxPrice / 1_000_000).toFixed(1)}M`}
        </p>
        <Slider
          min={500_000}
          max={MAX_PRICE}
          step={500_000}
          value={[maxPrice]}
          onValueChange={([v]) => setMaxPrice(v)}
          aria-label="Maximum price"
        />
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Minimum Trust Score · {minTrust === 0 ? 'Any' : minTrust}
        </p>
        <Slider
          min={0}
          max={95}
          step={5}
          value={[minTrust]}
          onValueChange={([v]) => setMinTrust(v)}
          aria-label="Minimum trust score"
        />
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Bedrooms</p>
        <Select value={beds} onValueChange={setBeds}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['any', '1', '2', '3', '4', '5'].map((b) => (
              <SelectItem key={b} value={b}>{b === 'any' ? 'Any' : `${b}+ beds`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        variant="outline"
        className="w-full font-bold"
        onClick={() => {
          setArea('all'); setType('all'); setPurpose('all');
          setMaxPrice(MAX_PRICE); setMinTrust(0); setBeds('any');
        }}
      >
        <X className="mr-1.5 h-4 w-4" aria-hidden /> Clear filters
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Discover verified properties</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {filtered.length} of {all.length} listings · sorted by{' '}
            {{
              trust: 'Trust Score',
              'price-asc': 'price (low → high)',
              'price-desc': 'price (high → low)',
              newest: 'newest first',
              yield: 'estimated yield',
            }[sort]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="font-bold" onClick={saveSearch}>
            <Bell className="mr-1.5 h-4 w-4" aria-hidden /> Save search
          </Button>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-9 w-44 text-xs font-bold" aria-label="Sort listings">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trust">Trust Score</SelectItem>
              <SelectItem value="price-asc">Price · low to high</SelectItem>
              <SelectItem value="price-desc">Price · high to low</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="yield">Estimated yield</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search area, title, keyword…"
            aria-label="Search listings"
            className="h-11 rounded-xl pl-10"
          />
        </div>
        {/* Mobile filter sheet */}
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-11 rounded-xl font-bold lg:hidden">
              <Filter className="h-4 w-4" aria-hidden />
              {activeFilters > 0 && (
                <Badge className="ml-1 h-5 w-5 rounded-full p-0 text-[10px]">{activeFilters}</Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-left">Filters</SheetTitle>
            </SheetHeader>
            {FiltersBody}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop filters row */}
      <div className="mt-4 hidden gap-3 rounded-2xl border bg-card p-4 lg:grid lg:grid-cols-[1fr_1fr_1fr_1.4fr]">
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger aria-label="Filter by area"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">All areas</SelectItem>
            {areas.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger aria-label="Filter by type"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['all', 'apartment', 'villa', 'townhouse', 'bungalow', 'land', 'commercial'].map((t) => (
              <SelectItem key={t} value={t} className="capitalize">{t === 'all' ? 'All types' : t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={purpose} onValueChange={setPurpose}>
          <SelectTrigger aria-label="Filter by purpose"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any purpose</SelectItem>
            <SelectItem value="buy">Buy</SelectItem>
            <SelectItem value="rent">Rent</SelectItem>
            <SelectItem value="invest">Invest</SelectItem>
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Select value={beds} onValueChange={setBeds}>
            <SelectTrigger aria-label="Filter by bedrooms"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['any', '1', '2', '3', '4', '5'].map((b) => (
                <SelectItem key={b} value={b}>{b === 'any' ? 'Any beds' : `${b}+ beds`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center rounded-lg border px-3">
            <Star className="h-3.5 w-3.5 text-gold" aria-hidden />
            <span className="ml-2 text-xs font-bold text-muted-foreground">
              Trust ≥ {minTrust === 0 ? 'Any' : minTrust}
            </span>
            <input
              type="range"
              min={0}
              max={95}
              step={5}
              value={minTrust}
              onChange={(e) => setMinTrust(parseInt(e.target.value, 10))}
              className="ml-auto w-20 accent-[var(--primary)]"
              aria-label="Minimum trust score"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-5xl" aria-hidden>🔍</span>
          <h2 className="text-lg font-bold">No listings match those filters</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Try widening the price band or clearing the area filter — or save this search and
            we&rsquo;ll alert you when a match arrives.
          </p>
          <Button variant="outline" className="font-bold" onClick={() => { setQ(''); setArea('all'); setType('all'); setPurpose('all'); setMaxPrice(MAX_PRICE); setMinTrust(0); setBeds('any'); }}>
            Clear everything
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p, i) => (
            <PropertyCard
              key={p.id}
              property={p}
              index={i}
              compareActive={compareIds.includes(p.id)}
              onCompare={(pp) => toggle(pp.id)}
              saved={favorites.includes(p.id)}
              onSave={toggleSave}
            />
          ))}
        </div>
      )}

      <CompareBar onOpen={() => navigate('/compare')} />
    </div>
  );
}

/** Remounts the desk whenever the ?q= param changes — the search box state
 *  re-initialises from the route without effect-based syncing. */
export default function PropertiesView() {
  const { route } = useRouter();
  return <PropertiesInner key={route.query.q ?? ''} initialQ={route.query.q ?? ''} />;
}
