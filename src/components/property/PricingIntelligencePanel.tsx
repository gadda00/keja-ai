'use client';
/**
 * Pricing Intelligence panel (wave 20) — the Buyers & Sellers portal's
 * "fair-price screening" promise, on every priced sale listing.
 *
 * Until this panel the only band a listing showed was ±8% around its own
 * asking price — arithmetic that brackets whatever the seller asks and can
 * never warn "this is 30% over the market". This panel screens the asking
 * price against live comparables (same area + type, not sold, minus the
 * subject), states where it sits, and shows the price-per-sqm read — all
 * ESTIMATE-labelled with the comp count in plain sight.
 */
import { useMemo } from 'react';
import { ArrowRight, BarChart3, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAllProperties } from '@/lib/inventory';
import { priceVerdict, pricingIntelligence } from '@/lib/pricingIntel';
import { formatKES } from '@/lib/format';
import { navigate } from '@/lib/router';
import type { Property } from '@/data/properties';
import { cn } from '@/lib/utils';

export function PricingIntelligencePanel({ p }: { p: Property }) {
  const all = useAllProperties();
  const intel = useMemo(() => pricingIntelligence(p, all), [p, all]);
  if (!intel) return null; // rentals / POA / no comps: show nothing, honestly

  const tone =
    intel.position === 'below'
      ? 'text-primary'
      : intel.position === 'above'
        ? 'text-gold'
        : 'text-foreground';
  const chip =
    intel.position === 'below'
      ? 'border-primary/40 text-primary'
      : intel.position === 'above'
        ? 'border-gold/60 text-gold-foreground bg-gold/15'
        : 'border-border text-muted-foreground';

  return (
    <div className="rounded-2xl border bg-card p-5" data-testid="pricing-intelligence">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5" aria-hidden /> Pricing Intelligence
        </p>
        <Badge variant="outline" className={cn('text-[9px] font-bold', chip)}>
          {intel.position === 'below' ? 'Below band' : intel.position === 'above' ? 'Above band' : 'Within band'}
        </Badge>
      </div>

      {/* the honest band */}
      <div className="mt-4">
        <div className="relative h-2 overflow-hidden rounded-full bg-muted">
          {/* band position scale: low…median…high with an asking marker */}
          <div
            className="absolute inset-y-0 rounded-full bg-primary/25"
            style={{
              left: `${Math.max(0, Math.min(100, ((intel.lowKes - intel.medianKes * 0.5) / (intel.medianKes * 1.5 - intel.medianKes * 0.5)) * 100))}%`,
              width: `${Math.max(8, Math.min(100, ((intel.highKes - intel.lowKes) / (intel.medianKes * 1.5 - intel.medianKes * 0.5)) * 100))}%`,
            }}
          />
          {/* asking marker, clamped into the scale */}
          {(() => {
            const scale = (v: number) =>
              Math.max(2, Math.min(98, ((v - intel.medianKes * 0.5) / (intel.medianKes)) * 100));
            return (
              <span
                className="absolute top-1/2 h-4 w-1.5 -translate-y-1/2 rounded-full bg-foreground"
                style={{ left: `${scale(p.price)}%` }}
                aria-hidden
              />
            );
          })()}
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-bold text-muted-foreground">
          <span>{formatKES(intel.lowKes)}</span>
          <span className="text-foreground">median {formatKES(intel.medianKes)}</span>
          <span>{formatKES(intel.highKes)}</span>
        </div>
      </div>

      {/* the verdict */}
      <p className={cn('mt-3 text-sm font-bold leading-snug', tone)}>{priceVerdict(intel)}</p>
      <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
        ESTIMATE from {intel.compCount} live comparable{intel.compCount > 1 ? 's' : ''} in {p.area} (
        {intel.confidence} confidence{intel.compCount < 4 ? ' — thin data' : ''}). Asking prices,
        not valuations — commission a licensed valuer before you transact.
      </p>

      {/* price per sqm */}
      {intel.psqmKes != null && intel.psqmMedianKes != null && intel.psqmDeltaPct != null && (
        <div className="mt-3 rounded-xl bg-accent/50 px-3.5 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Price per m²</p>
          <p className="mt-0.5 text-xs font-bold">
            KES {intel.psqmKes.toLocaleString('en-KE')}/m²{' '}
            <span className={cn('font-bold', Math.abs(intel.psqmDeltaPct) < 10 ? 'text-muted-foreground' : intel.psqmDeltaPct > 0 ? 'text-gold' : 'text-primary')}>
              ({intel.psqmDeltaPct > 0 ? '+' : ''}{Math.round(intel.psqmDeltaPct)}% vs area median)
            </span>
          </p>
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="mt-3 w-full text-xs font-bold text-primary"
        onClick={() =>
          navigate(
            `/valuation?area=${encodeURIComponent(p.area)}&type=${p.type}${p.type !== 'land' ? `&size=${p.sizeSqm}` : `&acres=${(p.sizeSqm / 4046.86).toFixed(2)}`}`,
          )
        }
      >
        Open the Valuation Desk with these inputs <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
      </Button>
      <p className="mt-1 flex items-start gap-1 text-[10px] leading-snug text-muted-foreground/70">
        <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
        Screening against listing asks. Condition, floor level and finishing are not comparable
        from ask data alone.
      </p>
    </div>
  );
}
