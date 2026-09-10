'use client';
/**
 * Trust score dial — the KEJA Trust Score™ presentation with the
 * interpretation bands (90+ Exceptional · 80+ Strong · 70+ Moderate ·
 * 60+ High Risk · <60 Significant DD).
 */
import { ShieldCheck } from 'lucide-react';
import { trustTier } from '@/lib/format';
import { cn } from '@/lib/utils';

const TONE_CLASS = {
  high: 'bg-primary text-primary-foreground',
  good: 'bg-primary/85 text-primary-foreground',
  watch: 'bg-gold text-gold-foreground',
  avoid: 'bg-destructive text-destructive-foreground',
} as const;

export function TrustBadge({
  score,
  size = 'md',
  showBand = false,
  className,
}: {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showBand?: boolean;
  className?: string;
}) {
  const tier = trustTier(score);
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full font-bold tabular-nums',
          TONE_CLASS[tier.tone],
          size === 'sm' && 'px-2 py-0.5 text-[11px]',
          size === 'md' && 'px-2.5 py-1 text-xs',
          size === 'lg' && 'px-3.5 py-1.5 text-sm',
        )}
        title={`KEJA Trust Score ${score}/100 — ${tier.label}`}
      >
        <ShieldCheck className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden />
        {score}
      </span>
      {showBand && (
        <span className="text-xs font-semibold text-muted-foreground">{tier.label}</span>
      )}
    </div>
  );
}

/** Circular trust gauge for detail surfaces. */
export function TrustDial({ score, size = 120 }: { score: number; size?: number }) {
  const tier = trustTier(score);
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(Math.max(score, 0), 100) / 100;
  const color =
    tier.tone === 'high'
      ? 'var(--primary)'
      : tier.tone === 'good'
        ? 'var(--primary)'
        : tier.tone === 'watch'
          ? 'var(--gold)'
          : 'var(--destructive)';
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`Trust score ${score} of 100`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="color-mix(in oklch, currentColor 12%, transparent)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black tabular-nums" style={{ color }}>
          {score}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Trust Score
        </span>
      </div>
    </div>
  );
}
