'use client';
/**
 * KEJA DEVELOPER PORTAL (proposal §11) — verified project profiles (units,
 * prices, payment plans, construction progress, timelines, rental
 * projections, returns) and the KEJA DEVELOPMENT SCORE assessing location,
 * demand, pricing, competition, rental market, infrastructure, population
 * growth and developer track record.
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  CalendarRange,
  Coins,
  HardHat,
  Home,
  LineChart,
  MapPin,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAllProperties } from '@/lib/inventory';
import { navigate } from '@/lib/router';
import { useStore } from '@/lib/store';
import { areaInsights } from '@/data/properties';
import { formatKES } from '@/lib/format';
import { cn } from '@/lib/utils';

/* ------------------------- development score engine ------------------------ */

const SCORE_DIMENSIONS = [
  { key: 'location', label: 'Location', weight: 0.18 },
  { key: 'demand', label: 'Demand fundamentals', weight: 0.16 },
  { key: 'pricing', label: 'Pricing vs market', weight: 0.14 },
  { key: 'competition', label: 'Competitive saturation', weight: 0.1 },
  { key: 'rental', label: 'Rental market depth', weight: 0.12 },
  { key: 'infrastructure', label: 'Infrastructure', weight: 0.1 },
  { key: 'population', label: 'Population growth', weight: 0.08 },
  { key: 'track', label: 'Developer track record', weight: 0.12 },
] as const;

type DimScores = Record<(typeof SCORE_DIMENSIONS)[number]['key'], number>;

export function developmentScore(area: string, all: ReturnType<typeof useAllProperties>): { composite: number; dims: DimScores } {
  const insight = areaInsights[area];
  const listings = all.filter((p) => p.area === area);
  const offPlan = listings.filter((p) => p.offPlan).length;
  const yieldPct = parseFloat(insight?.yield ?? '') || 6.5;
  const dims: DimScores = {
    location: Math.min(96, 62 + Math.min(listings.length, 20)),
    demand: Math.min(95, 60 + yieldPct * 3.4),
    pricing: 74,
    competition: Math.max(40, 88 - offPlan * 4),
    rental: Math.min(95, 58 + yieldPct * 3.8),
    infrastructure: insight ? 78 : 60,
    population: 76,
    track: 72,
  };
  const composite = Math.round(SCORE_DIMENSIONS.reduce((s, d) => s + dims[d.key] * d.weight, 0));
  return { composite, dims };
}

/* ------------------------------ project profiles --------------------------- */

interface DevProfile {
  id: string;
  name: string;
  developer: string;
  area: string;
  units: number;
  unitsSold: number;
  fromPrice: number;
  completion: string;
  progressPct: number;
  paymentPlan: string;
  rentalProjectionPct: number;
  type: 'apartment' | 'townhouse' | 'mixed';
}

const PROJECTS: DevProfile[] = [
  {
    id: 'dv-1',
    name: 'Amani Ridge Residences',
    developer: 'Savanna Heights Development',
    area: 'Karen',
    units: 48,
    unitsSold: 31,
    fromPrice: 14_500_000,
    completion: 'Q3 2027',
    progressPct: 62,
    paymentPlan: '20% deposit · 6 quarterly instalments · 10% on handover',
    rentalProjectionPct: 6.8,
    type: 'townhouse',
  },
  {
    id: 'dv-2',
    name: 'Skyline Lofts, Westlands',
    developer: 'Chacadom Development Co.',
    area: 'Westlands',
    units: 120,
    unitsSold: 96,
    fromPrice: 8_900_000,
    completion: 'Q1 2027',
    progressPct: 84,
    paymentPlan: '10% deposit · milestone-linked instalments · bank finance accepted',
    rentalProjectionPct: 8.2,
    type: 'apartment',
  },
  {
    id: 'dv-3',
    name: 'Madaraka Student Living',
    developer: 'Learning City Properties',
    area: 'Madaraka',
    units: 210,
    unitsSold: 178,
    fromPrice: 2_400_000,
    completion: 'Q4 2026',
    progressPct: 91,
    paymentPlan: '15% deposit · balance on possession · parent-guarantor plans',
    rentalProjectionPct: 9.6,
    type: 'apartment',
  },
];

function ScorePanel({ area, all }: { area: string; all: ReturnType<typeof useAllProperties> }) {
  const { composite, dims } = developmentScore(area, all);
  return (
    <div className="rounded-3xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-wider">Keja Development Score</h3>
        <span className={cn('text-2xl font-black tabular-nums', composite >= 80 ? 'text-primary' : composite >= 65 ? 'text-foreground' : 'text-gold')}>
          {composite}<span className="text-xs font-bold text-muted-foreground">/100</span>
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {SCORE_DIMENSIONS.map((d) => (
          <div key={d.key}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold">
                {d.label}
                <span className="ml-1.5 text-[10px] font-bold text-muted-foreground">×{Math.round(d.weight * 100)}%</span>
              </span>
              <span className="font-black tabular-nums">{Math.round(dims[d.key])}</span>
            </div>
            <Progress value={dims[d.key]} className="mt-1 h-1.5" aria-label={`${d.label} ${dims[d.key]} of 100`} />
          </div>
        ))}
      </div>
      <p className="mt-4 border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">
        Eight weighted dimensions — location, demand, pricing, competition, rental depth,
        infrastructure, population growth and developer track record. ESTIMATE grade: screening
        output for capital conversations, never a substitute for a full appraisal.
      </p>
    </div>
  );
}

export default function DeveloperPortalView() {
  const all = useAllProperties();
  const [selected, setSelected] = useState<DevProfile>(PROJECTS[0]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="max-w-2xl">
        <Badge variant="outline" className="border-primary/40 font-bold text-primary">Keja Developers</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          Verified project profiles, scored before capital meets concrete
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Developers publish verified project profiles — units, prices, payment plans, construction
          progress, timelines, rental projections and returns — and every project carries the
          <strong className="text-foreground"> Keja Development Score</strong>, assessed across
          location, demand, pricing, competition, rental market, infrastructure, population growth
          and developer track record.
        </p>
      </div>

      <Tabs defaultValue="projects" className="mt-8">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="projects" className="gap-1.5 font-bold"><Building2 className="h-4 w-4" aria-hidden /> Project profiles</TabsTrigger>
          <TabsTrigger value="score" className="gap-1.5 font-bold"><ShieldCheck className="h-4 w-4" aria-hidden /> Development Score</TabsTrigger>
          <TabsTrigger value="offplan" className="gap-1.5 font-bold"><HardHat className="h-4 w-4" aria-hidden /> Off-plan on the marketplace</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECTS.map((p, i) => (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.06, 0.2) }}
                onClick={() => setSelected(p)}
                className={cn(
                  'card-lift rounded-2xl border bg-card p-5 text-left',
                  selected.id === p.id && 'ring-2 ring-primary',
                )}
                aria-label={`Select ${p.name}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-[15px] font-bold">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">{p.developer}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px] font-bold capitalize">{p.type}</Badge>
                </div>
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" aria-hidden /> {p.area} · <CalendarRange className="h-3.5 w-3.5" aria-hidden /> {p.completion}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-accent/60 py-1.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Units</p>
                    <p className="text-xs font-black">{p.units}</p>
                  </div>
                  <div className="rounded-lg bg-accent/60 py-1.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Sold</p>
                    <p className="text-xs font-black">{p.unitsSold}</p>
                  </div>
                  <div className="rounded-lg bg-accent/60 py-1.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">From</p>
                    <p className="text-xs font-black">{formatKES(p.fromPrice)}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                    <span>Construction</span><span>{p.progressPct}%</span>
                  </div>
                  <Progress value={p.progressPct} className="mt-1 h-1.5" aria-label={`${p.progressPct}% complete`} />
                </div>
              </motion.button>
            ))}
          </div>

          {/* selected project detail */}
          <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-3xl border bg-card p-5 sm:p-6">
              <h2 className="text-xl font-black">{selected.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{selected.developer} · {selected.area}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ['Units', `${selected.units} (${selected.unitsSold} sold — ${((selected.unitsSold / selected.units) * 100).toFixed(0)}%)`],
                  ['Completion', selected.completion],
                  ['From price', formatKES(selected.fromPrice)],
                  ['Rental projection', `${selected.rentalProjectionPct}% gross yield (ESTIMATE)`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-accent/50 p-3.5">
                    <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{k}</p>
                    <p className="mt-0.5 text-sm font-bold">{v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Payment plan</p>
                <p className="mt-1 text-sm font-semibold">{selected.paymentPlan}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button className="font-bold" onClick={() => navigate(`/properties?q=${encodeURIComponent(selected.area)}`)}>
                  <Home className="mr-1.5 h-4 w-4" aria-hidden /> View {selected.area} inventory
                </Button>
                <Button variant="outline" className="font-bold" onClick={() => navigate('/institutional')}>
                  Developer financing desk
                </Button>
              </div>
            </div>
            <ScorePanel area={selected.area} all={all} />
          </div>
        </TabsContent>

        <TabsContent value="score" className="mt-6">
          <div className="grid gap-5 lg:grid-cols-2">
            {['Westlands', 'Kilimani', 'Karen', 'Madaraka'].map((area) => (
              <div key={area} className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground">{area}</h3>
                <ScorePanel area={area} all={all} />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="offplan" className="mt-6">
          <div className="overflow-hidden rounded-3xl border bg-card">
            <div className="border-b px-5 py-4 text-sm font-black uppercase tracking-wider">
              Off-plan &amp; new-development listings on the marketplace
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-accent/40 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3">Project / listing</th>
                    <th className="px-4 py-3">Area</th>
                    <th className="px-4 py-3">Developer / agency</th>
                    <th className="px-4 py-3 text-right">From</th>
                    <th className="px-4 py-3 text-right">Trust</th>
                  </tr>
                </thead>
                <tbody>
                  {all.filter((p) => p.offPlan).slice(0, 12).map((p) => (
                    <tr key={p.id} className="cursor-pointer border-b transition-colors last:border-0 hover:bg-accent/30" onClick={() => navigate(`/properties/${p.id}`)}>
                      <td className="px-5 py-3.5 font-bold">{p.title}</td>
                      <td className="px-4 py-3.5">{p.area}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{p.agency}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums">{p.priceOnApplication ? 'POA' : formatKES(p.price)}</td>
                      <td className="px-4 py-3.5 text-right font-black tabular-nums text-primary">{p.trustScore}</td>
                    </tr>
                  ))}
                  {all.filter((p) => p.offPlan).length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">No off-plan listings live — check back soon.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
