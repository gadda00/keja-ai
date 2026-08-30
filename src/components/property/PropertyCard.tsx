import {
  Bath,
  BedDouble,
  Building2,
  Eye,
  Gauge,
  GitCompareArrows,
  Heart,
  Ruler,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import SmartImg from '@/components/ui/SmartImg';
import type { Property } from '@/data/properties';
import { isRentalPrice } from '@/lib/finance';
import { formatKES } from '@/lib/format';
import { investmentScore, scoreTone } from '@/lib/investmentScore';
import { KEYS, useStore } from '@/lib/store';

import TrustBadge from './TrustBadge';

/** Auto-Pilot listings carry the KJA-A id prefix — labelled, never hidden. */
const isAutoPilot = (id: string) => id.startsWith('KJA-A');

/** Listed within the last 7 days. */
const isNewArrival = (listedAt: string) => Date.now() - +new Date(listedAt) < 7 * 24 * 3600 * 1000;

export default function PropertyCard({ property }: { property: Property }) {
  const [favorites, setFavorites] = useStore<string[]>(KEYS.favorites, []);
  const [compare, setCompare] = useStore<string[]>(KEYS.compare, []);
  const isFav = favorites.includes(property.id);
  const isRent = isRentalPrice(property.price);
  const inCompare = compare.includes(property.id);
  const score = investmentScore(property);
  const toggleFav = () => {
    setFavorites(isFav ? favorites.filter((f) => f !== property.id) : [...favorites, property.id]);
  };
  const toggleCompare = () => {
    if (inCompare) setCompare(compare.filter((c) => c !== property.id));
    else setCompare([...compare, property.id].slice(-4));
  };

  return (
    <div className="card-luxe card-luxe-hover group relative flex flex-col overflow-hidden">
      <div className="relative h-56 overflow-hidden">
        <Link to={`/properties/${property.id}`}>
          <SmartImg
            src={property.images[0]}
            alt={property.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </Link>
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          <TrustBadge score={property.trustScore} size="sm" />
          {isNewArrival(property.listedAt) && (
            <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Fresh
            </span>
          )}
          {isAutoPilot(property.id) && (
            <span className="rounded-full bg-sky-600/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Auto-Pilot
            </span>
          )}
          {property.offPlan ? (
            <span className="rounded-full bg-ink/85 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-300">
              Off-Plan
            </span>
          ) : null}
          {property.availability === 'reserved' && (
            <span className="rounded-full bg-ink/85 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Reserved
            </span>
          )}
        </div>
        <button
          onClick={toggleFav}
          aria-label={
            isFav
              ? `Remove ${property.title} from favourites`
              : `Save ${property.title} to favourites`
          }
          aria-pressed={isFav}
          className={`absolute right-3 top-3 rounded-full p-2 shadow-sm transition ${
            isFav ? 'bg-gold-500 text-white' : 'bg-white/90 text-ink-muted hover:text-gold-600'
          }`}
        >
          <Heart className="h-4 w-4" fill={isFav ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={toggleCompare}
          aria-label={
            inCompare
              ? `Remove ${property.title} from comparison`
              : `Add ${property.title} to comparison`
          }
          aria-pressed={inCompare}
          className={`absolute right-14 top-3 rounded-full p-2 shadow-sm transition ${
            inCompare ? 'bg-ink text-gold-300' : 'bg-white/90 text-ink-muted hover:text-gold-700'
          }`}
        >
          <GitCompareArrows className="h-4 w-4" />
        </button>
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-ink-muted">
          <Eye className="h-3 w-3" /> {property.views}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-600">
              {property.area} · {property.county}
            </p>
            <Link to={`/properties/${property.id}`}>
              <h3 className="mt-1 truncate font-display text-lg font-semibold text-ink transition-colors hover:text-gold-700">
                {property.title}
              </h3>
            </Link>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-muted">
          {property.bedrooms ? (
            <span className="inline-flex items-center gap-1.5">
              <BedDouble className="h-4 w-4 text-gold-500" /> {property.bedrooms} bed
            </span>
          ) : null}
          {property.bathrooms ? (
            <span className="inline-flex items-center gap-1.5">
              <Bath className="h-4 w-4 text-gold-500" /> {property.bathrooms} bath
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Ruler className="h-4 w-4 text-gold-500" /> {property.sizeSqm.toLocaleString()} sqm
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-gold-500" /> {property.agency}
          </span>
        </div>

        {property.grossYieldEstimate ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <TrendingUp className="h-4 w-4" /> Est. gross yield ~{property.grossYieldEstimate}% p.a.
          </p>
        ) : null}

        {/* KEJA Investment Score™ */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-ink px-3.5 py-2.5">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gold-300">
            <Gauge className="h-3.5 w-3.5" /> Investment Score™
          </span>
          <span className="flex items-baseline gap-1.5">
            <span
              className={`rounded-md px-2 py-0.5 font-display text-sm font-bold ${scoreTone(score.overall).chip}`}
            >
              {score.overall.toFixed(1)}
            </span>
            <span className="text-[10px] text-white/60">/ 10 · {score.band}</span>
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between border-t border-gold-100 pt-4">
          <div>
            <p className="font-display text-xl font-bold text-ink">
              {formatKES(property.price, { monthly: isRent })}
            </p>
            {property.rentEstimate && !isRent ? (
              <p className="text-xs text-ink-faint">
                Est. rent {formatKES(property.rentEstimate, { monthly: true })}
              </p>
            ) : null}
          </div>
          <Link
            to={`/properties/${property.id}`}
            className="text-sm font-semibold text-gold-700 transition hover:text-gold-600"
          >
            View →
          </Link>
        </div>
      </div>
    </div>
  );
}
