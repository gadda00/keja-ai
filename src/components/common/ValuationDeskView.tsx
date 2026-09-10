'use client';
/** Valuation desk — indicative valuations from area bands with confidence labels. */
import { useState } from 'react';
import { BadgeCheck, Gauge, History, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAllProperties } from '@/lib/inventory';
import { areaInsights } from '@/data/properties';
import { formatKES } from '@/lib/format';
import { navigate } from '@/lib/router';
import { cn } from '@/lib/utils';

const CONDITIONS = [
  { key: 'excellent', label: 'Excellent — recently renovated', adj: 1.08 },
  { key: 'good', label: 'Good — well maintained', adj: 1.0 },
  { key: 'fair', label: 'Fair — needs touch-ups', adj: 0.92 },
  { key: 'tired', label: 'Tired — needs work', adj: 0.82 },
] as const;

export default function ValuationDeskView() {
  const all = useAllProperties();
  const [area, setArea] = useState('Kilimani');
  const [type, setType] = useState<'apartment' | 'villa' | 'townhouse' | 'land'>('apartment');
  const [size, setSize] = useState(120);
  const [acres, setAcres] = useState(1);
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number]['key']>('good');
  const [result, setResult] = useState<{ low: number; median: number; high: number; comps: number } | null>(null);

  const areas = [...new Set(all.map((p) => p.area))].sort();
  const insight = areaInsights[area];
  const condAdj = CONDITIONS.find((c) => c.key === condition)!.adj;

  const run = () => {
    if (type === 'land') {
      const band = insight?.avgPricePerSqm?.match(/([\d.]+)\s*k\s*[–-]\s*([\d.]+)\s*k/i);
      const lowPerAcre = band ? parseFloat(band[1]) * 1000 * 4046.86 : 20_000_000;
      const highPerAcre = band ? parseFloat(band[2]) * 1000 * 4046.86 : 40_000_000;
      const mid = (lowPerAcre + highPerAcre) / 2 * condAdj;
      setResult({
        low: Math.round((mid * 0.9) * acres),
        median: Math.round(mid * acres),
        high: Math.round((mid * 1.12) * acres),
        comps: all.filter((p) => p.area === area && p.type === 'land').length,
      });
    } else {
      const band = insight?.avgPricePerSqm?.match(/([\d.]+)\s*k\s*[–-]\s*([\d.]+)\s*k/i);
      const lowPsm = band ? parseFloat(band[1]) * 1000 : 60_000;
      const highPsm = band ? parseFloat(band[2]) * 1000 : 110_000;
      const mid = ((lowPsm + highPsm) / 2) * condAdj * size;
      setResult({
        low: Math.round(mid * 0.9),
        median: Math.round(mid),
        high: Math.round(mid * 1.12),
        comps: all.filter((p) => p.area === area && p.type === type).length,
      });
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="max-w-2xl">
        <Badge variant="outline" className="border-primary/40 font-bold text-primary">Keja Verify · Valuation Desk</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">What is it actually worth?</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          An indicative valuation from area price bands and live comparables — the same ESTIMATE-grade
          discipline as everywhere else. For bankable figures, commission a licensed valuer through
          Keja Transact.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4 rounded-3xl border bg-card p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="vd-area">Area</Label>
              <select id="vd-area" className="h-9 rounded-lg border bg-background px-3 text-sm" value={area} onChange={(e) => setArea(e.target.value)}>
                {areas.map((a) => (<option key={a}>{a}</option>))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="vd-type">Type</Label>
              <select id="vd-type" className="h-9 rounded-lg border bg-background px-3 text-sm" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                {['apartment', 'villa', 'townhouse', 'land'].map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
            {type === 'land' ? (
              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor="vd-acres">Size (acres)</Label>
                <Input id="vd-acres" type="number" step={0.1} min={0.05} value={acres || ''} onChange={(e) => setAcres(Number(e.target.value))} />
              </div>
            ) : (
              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor="vd-size">Size (m²)</Label>
                <Input id="vd-size" type="number" min={10} value={size || ''} onChange={(e) => setSize(Number(e.target.value))} />
              </div>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label>Condition</Label>
            <div className="grid gap-1.5">
              {CONDITIONS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCondition(c.key)}
                  className={cn(
                    'rounded-xl border px-3.5 py-2.5 text-left text-xs font-bold transition-colors',
                    condition === c.key ? 'border-primary bg-primary/5 text-primary' : 'hover:border-primary/40',
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <Button className="w-full font-black" onClick={run}>
            <Gauge className="mr-1.5 h-4 w-4" aria-hidden /> Value this property
          </Button>
        </div>

        <div className="space-y-4">
          {result ? (
            <>
              <div className="rounded-3xl bg-gradient-to-b from-primary to-emerald-deep p-6 text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold">Indicative value · ESTIMATE</p>
                <p className="mt-2 text-4xl font-black tabular-nums">{formatKES(result.median)}</p>
                <p className="mt-1 text-sm font-semibold text-white/75">
                  range {formatKES(result.low)} – {formatKES(result.high)}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-semibold">
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="text-white/60">Live comparables</p>
                    <p className="mt-0.5 text-sm font-black">{result.comps}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="text-white/60">Area band</p>
                    <p className="mt-0.5 text-sm font-black">{insight?.avgPricePerSqm ?? '—'}/m²</p>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-2xl border border-gold/40 bg-gold-soft p-4 text-xs leading-relaxed text-gold-foreground/90">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                This is a band-based estimate, not a valuation report. Lenders, courts and tax
                authorities require a licensed valuer — request one through Keja Transact.
              </div>
              <Button variant="outline" className="w-full font-bold" onClick={() => navigate('/transact')}>
                <BadgeCheck className="mr-1.5 h-4 w-4" aria-hidden /> Commission a licensed valuer
              </Button>
            </>
          ) : (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed bg-card/50 p-8 text-center">
              <History className="h-8 w-8 text-muted-foreground/40" aria-hidden />
              <h2 className="text-sm font-bold">The estimate appears here</h2>
              <p className="max-w-xs text-xs text-muted-foreground">
                Set the property parameters and run the desk — outputs are labelled by evidence grade, always.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
