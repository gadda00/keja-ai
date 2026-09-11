'use client';
/**
 * Marketplace property card — image, trust badge, price, investment signals,
 * compare + save actions. Used across Discover, Home, Area guides, AI answers.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Bath, BedDouble, Heart, Ruler, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { investmentScore } from '@/lib/investmentScore';
import { isRentalPrice } from '@/lib/finance';
import { formatKES } from '@/lib/format';
import type { Property } from '@/data/properties';
import { srcsetFor, CARD_SIZES } from '@/lib/responsive-images';
import { Link, navigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import { TrustBadge } from './TrustBadge';

export function PropertyCard({
  property: p,
  compact = false,
  compareActive,
  onCompare,
  saved,
  onSave,
  index = 0,
}: {
  property: Property;
  compact?: boolean;
  compareActive?: boolean;
  onCompare?: (p: Property) => void;
  saved?: boolean;
  onSave?: (p: Property) => void;
  index?: number;
}) {
  const [imgOk, setImgOk] = useState(true);
  const isRent = p.purpose.includes('rent') || isRentalPrice(p.price);
  const score = investmentScore(p);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }}
      className={cn(
        'group card-lift relative flex flex-col overflow-hidden rounded-2xl border bg-card',
        compareActive && 'ring-2 ring-primary',
      )}
    >
      <Link
        to={`/properties/${p.id}`}
        ariaLabel={`${p.title} — view property passport`}
        className="relative block aspect-[4/3] overflow-hidden bg-muted"
      >
        {imgOk ? (
          <img
            src={p.images[0]}
            srcSet={srcsetFor(p.images[0])}
            sizes={CARD_SIZES}
            alt={p.title}
            loading="lazy"
            onError={() => setImgOk(false)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-emerald-deep/10">
            <span className="text-4xl" aria-hidden>🏠</span>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <TrustBadge score={p.trustScore} size="sm" className="drop-shadow-md" />
          <div className="flex gap-1.5">
            {p.offPlan && (
              <Badge className="border-0 bg-gold/90 text-[10px] font-bold text-gold-foreground drop-shadow-md">
                Off-Plan
              </Badge>
            )}
            {p.availability === 'sold' && (
              <Badge variant="secondary" className="text-[10px] font-bold drop-shadow-md">
                Sold
              </Badge>
            )}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
          <Badge
            variant="secondary"
            className={cn(
              'border-0 text-[10px] font-bold capitalize text-white',
              isRent ? 'bg-primary/80' : 'bg-black/50 backdrop-blur-sm',
            )}
          >
            {isRent ? 'For Rent' : 'For Sale'}
          </Badge>
          <span className="text-[11px] font-semibold text-white/90">
            {p.area}, {p.county}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/properties/${p.id}`}
            className="line-clamp-1 text-[15px] font-bold leading-snug hover:text-primary"
          >
            {p.title}
          </Link>
          {onSave && (
            <button
              aria-label={saved ? 'Remove from saved' : 'Save property'}
              onClick={() => onSave(p)}
              className={cn(
                'shrink-0 rounded-full p-1.5 transition-colors',
                saved ? 'bg-gold/15 text-gold' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Heart className={cn('h-4 w-4', saved && 'fill-current')} />
            </button>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          {p.priceOnApplication ? (
            <span className="flex items-center gap-1.5 text-sm font-bold text-primary">
              <Tag className="h-3.5 w-3.5" aria-hidden /> Price on application
            </span>
          ) : (
            <>
              <span className="text-lg font-black tracking-tight">
                {isRent ? `${formatKES(p.price)}${'/mo'}` : formatKES(p.price)}
              </span>
              {!isRent && p.rentEstimate ? (
                <span className="text-[11px] text-muted-foreground">
                  ~{formatKES(p.rentEstimate, { monthly: true })}
                </span>
              ) : null}
            </>
          )}
        </div>

        {!compact && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {p.bedrooms ? (
              <span className="inline-flex items-center gap-1">
                <BedDouble className="h-3.5 w-3.5" aria-hidden /> {p.bedrooms} bed
              </span>
            ) : null}
            {p.bathrooms ? (
              <span className="inline-flex items-center gap-1">
                <Bath className="h-3.5 w-3.5" aria-hidden /> {p.bathrooms} bath
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5" aria-hidden /> {p.sizeSqm.toLocaleString('en-KE')} m²
            </span>
          </div>
        )}

        {!compact && p.purpose.includes('invest') && (
          <div className="mt-auto flex items-center justify-between rounded-lg bg-accent/60 px-2.5 py-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Investment Score
            </span>
            <span
              className={cn(
                'text-sm font-black tabular-nums',
                score.overall >= 8 ? 'text-primary' : score.overall >= 6.5 ? 'text-foreground' : 'text-gold',
              )}
            >
              {score.overall.toFixed(1)}
              <span className="text-[10px] font-bold text-muted-foreground">/10</span>
            </span>
          </div>
        )}

        {onCompare && (
          <button
            onClick={() => onCompare(p)}
            className={cn(
              'mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors',
              compareActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:border-primary hover:text-primary',
            )}
          >
            {compareActive ? 'In comparison' : 'Compare'}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>
    </motion.article>
  );
}

/** Compact horizontal row variant for lists inside answers/drawers. */
export function PropertyRow({ property: p, onSave }: { property: Property; onSave?: (p: Property) => void }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div className="group flex items-center gap-3 rounded-xl border bg-card p-2.5 transition-colors hover:border-primary/40">
      <button
        className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-muted"
        onClick={() => navigate(`/properties/${p.id}`)}
        aria-label={`Open ${p.title}`}
      >
        {imgOk ? (
          <img
            src={p.images[0]}
            alt=""
            loading="lazy"
            onError={() => setImgOk(false)}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl" aria-hidden>🏠</div>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-bold">{p.title}</p>
        <p className="text-xs text-muted-foreground">
          {p.area} · {p.priceOnApplication ? 'POA' : formatKES(p.price)}
        </p>
        <TrustBadge score={p.trustScore} size="sm" className="mt-1" />
      </div>
      {onSave && (
        <button
          aria-label="Save property"
          onClick={() => onSave(p)}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Heart className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
