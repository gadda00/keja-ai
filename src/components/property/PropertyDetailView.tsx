'use client';
/**
 * Property detail — gallery, description, amenities, agent, and the flagship
 * KEJA PROPERTY PASSPORT (proposal §3): the verified digital identity card
 * every property carries, plus the Trust Score factor breakdown (§4),
 * Investment Score™ factors, evidence panels with freshness, and a mortgage
 * quick-quote powered by Keja Finance.
 */
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Bath,
  BedDouble,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Eye,
  FileText,
  Fingerprint,
  Heart,
  Landmark,
  MapPin,
  MessageCircle,
  Phone,
  Ruler,
  ShieldAlert,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useAllProperties } from '@/lib/inventory';
import { track } from '@/lib/analytics';
import { usePageMeta } from '@/lib/seo';
import { listingMeta } from '@/lib/detailMeta';
import { srcsetFor, GALLERY_SIZES } from '@/lib/responsive-images';
import { investmentScore } from '@/lib/investmentScore';
import { trustScore } from '@/lib/trustScore';
import { evidenceFor, listingFreshness } from '@/lib/verification';
import { calculateMortgage } from '@/lib/finance';
import { formatKES, timeAgo, trustTier } from '@/lib/format';
import { areaInsights, type Property } from '@/data/properties';
import { navigate } from '@/lib/router';
import { useStore } from '@/lib/store';
import { whatsappLink } from '@/config';
import { PropertyCard } from './PropertyCard';
import { TrustDial } from './TrustBadge';
import { cn } from '@/lib/utils';

/* --------------------------- passport identity ---------------------------- */

const AREA_CODE: Record<string, string> = {
  Kilimani: 'KLM', Westlands: 'WST', Lavington: 'LVT', Riverside: 'RSV', Karen: 'KRN',
  'Upper Hill': 'UPH', Kileleshwa: 'KLS', Runda: 'RND', Nyali: 'NYL', Diani: 'DNA',
  Kasarani: 'KSN', Madaraka: 'MDK', CBD: 'NBO', Eastleigh: 'EST', Nanyuki: 'NYK',
  Milimani: 'MLM', Ruaka: 'RUK', Syokimau: 'SYK', Kitengela: 'KTG', 'Athi River': 'ATH',
  Nakuru: 'NKR', Kisumu: 'KSM',
};

export function passportId(p: Property): string {
  const code = AREA_CODE[p.area] ?? p.area.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const seq = (p.id.match(/(\d+)$/)?.[1] ?? '0').padStart(6, '0');
  return `KEJA-${code}-${seq}`;
}

function fraudRisk(p: Property): { label: string; tone: string } {
  const t = trustScore(p).composite;
  if (t >= 85) return { label: 'Low', tone: 'text-primary' };
  if (t >= 70) return { label: 'Moderate', tone: 'text-gold' };
  if (t >= 60) return { label: 'Elevated', tone: 'text-gold' };
  return { label: 'High', tone: 'text-destructive' };
}

/** Market range estimate ±8% around asking — clearly labelled as an estimate. */
function marketRange(p: Property): [number, number] {
  return [Math.round(p.price * 0.92), Math.round(p.price * 1.08)];
}

/* ------------------------------ the passport ------------------------------ */

function PropertyPassport({ p }: { p: Property }) {
  const ts = trustScore(p);
  const tier = trustTier(ts.composite);
  const insight = areaInsights[p.area];
  const range = marketRange(p);
  const risk = fraudRisk(p);
  const freshness = listingFreshness(p);

  const rows: [string, string, 'ok' | 'warn' | 'bad' | 'info'][] = [
    ['Location', `${p.area}, ${p.county}`, 'info'],
    ['Property type', p.type.charAt(0).toUpperCase() + p.type.slice(1), 'info'],
    ['Land / floor size', `${p.sizeSqm.toLocaleString('en-KE')} m²`, 'info'],
    [
      'Ownership',
      p.verification.ardhisasaMatch ? 'Verified — Ardhisasa match' : p.verification.titleCheck === 'verified' ? 'Verified' : 'Pending',
      p.verification.titleCheck === 'verified' ? 'ok' : 'warn',
    ],
    [
      'Title check',
      p.verification.titleCheck === 'verified' ? 'Clear' : p.verification.titleCheck === 'pending' ? 'In progress' : 'Flagged',
      p.verification.titleCheck === 'verified' ? 'ok' : p.verification.titleCheck === 'pending' ? 'warn' : 'bad',
    ],
    [
      'Encumbrance check',
      p.verification.titleCheck === 'verified' ? 'No encumbrances found' : 'To be confirmed',
      p.verification.titleCheck === 'verified' ? 'ok' : 'warn',
    ],
    [
      'Rates & zoning',
      p.verification.titleCheck === 'verified' ? 'Compliant (screened)' : 'To be confirmed',
      p.verification.titleCheck === 'verified' ? 'ok' : 'warn',
    ],
    ['Valuation', p.priceOnApplication ? 'On application' : `Estimated ${formatKES(p.price)}`, 'info'],
    ['Estimated market range', p.priceOnApplication ? 'On application' : `${formatKES(range[0])} – ${formatKES(range[1])}`, 'info'],
    ['Agent', `${p.agency} — verified`, 'ok'],
    ['Fraud risk', risk.label, risk.tone.includes('primary') ? 'ok' : 'warn'],
    ['Last verification', `${p.verification.lastChecked} · ${timeAgo(p.verification.lastChecked)}`, 'info'],
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      aria-label="Keja Property Passport"
      className="overflow-hidden rounded-3xl border bg-card"
    >
      <div className="flex items-center justify-between gap-3 border-b bg-emerald-deep px-5 py-3.5 text-white sm:px-6">
        <div className="flex items-center gap-2.5">
          <Fingerprint className="h-5 w-5 text-gold" aria-hidden />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">Keja Property Passport</p>
            <p className="font-mono text-sm font-bold tracking-widest">{passportId(p)}</p>
          </div>
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
            freshness.state === 'fresh' ? 'bg-primary text-primary-foreground' : 'bg-gold text-gold-foreground',
          )}
        >
          {freshness.state === 'fresh' ? 'Verification current' : 'Recheck due'}
        </span>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[auto_1fr]">
        {/* Trust score dial */}
        <div className="flex flex-col items-center gap-3 lg:w-56">
          <TrustDial score={ts.composite} />
          <p
            className={cn(
              'text-sm font-black uppercase tracking-wide',
              ts.composite >= 80 ? 'text-primary' : ts.composite >= 60 ? 'text-gold' : 'text-destructive',
            )}
          >
            {tier.label}
          </p>
          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            Twelve-factor score · evidence-labelled · never a guarantee — always pair with
            professional due diligence.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full font-bold"
            onClick={() => navigate('/trust?tab=methodology')}
          >
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Score methodology
          </Button>
        </div>

        {/* Passport rows */}
        <dl className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
          {rows.map(([k, v, status]) => (
            <div key={k} className="flex items-start justify-between gap-3 border-b border-dashed border-border py-2.5 last:border-0">
              <dt className="text-xs font-semibold text-muted-foreground">{k}</dt>
              <dd className="flex items-center gap-1.5 text-right text-xs font-bold">
                {status === 'ok' && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />}
                {status === 'warn' && <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />}
                {status === 'bad' && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden />}
                <span className={cn(status === 'bad' && 'text-destructive')}>{v}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {insight && (
        <div className="border-t bg-accent/40 px-5 py-3 text-[11px] text-muted-foreground sm:px-6">
          <strong className="text-foreground">{p.area} market band:</strong> {insight.avgPricePerSqm}/m² ·
          typical yield {insight.yield}. {insight.note}
        </div>
      )}
    </motion.section>
  );
}

/* ------------------------------ score panels ------------------------------ */

function InvestmentPanel({ p }: { p: Property }) {
  const score = investmentScore(p);
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-wider">Investment Score™</h3>
        <span
          className={cn(
            'text-2xl font-black tabular-nums',
            score.overall >= 8 ? 'text-primary' : score.overall >= 6.5 ? 'text-foreground' : 'text-gold',
          )}
        >
          {score.overall.toFixed(1)}
          <span className="text-xs font-bold text-muted-foreground">/10 · {score.band}</span>
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {score.factors.map((f) => (
          <div key={f.key}>
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-semibold">
                {f.label}
                <span
                  className={cn(
                    'ml-1.5 rounded px-1 py-0.5 text-[8px] font-black uppercase tracking-wider',
                    f.basis === 'FACT'
                      ? 'bg-primary/10 text-primary'
                      : f.basis === 'ESTIMATE'
                        ? 'bg-gold/15 text-gold-foreground'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {f.basis}
                </span>
              </span>
              <span className="font-black tabular-nums">{f.score.toFixed(1)}</span>
            </div>
            <Progress value={f.score * 10} className="mt-1 h-1.5" aria-label={`${f.label} ${f.score} of 10`} />
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{f.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrustFactorsPanel({ p }: { p: Property }) {
  const ts = trustScore(p);
  return (
    <div className="rounded-2xl border bg-card p-5">
      <h3 className="text-sm font-black uppercase tracking-wider">Trust Score factors</h3>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Composite {ts.composite}/100 — {ts.band}. Weights shown per factor.
      </p>
      <div className="mt-4 space-y-3">
        {ts.factors.map((f) => (
          <div key={f.key}>
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-semibold">
                {f.label}
                <span className="ml-1.5 text-[10px] font-bold text-muted-foreground">
                  ×{Math.round(f.weight * 100)}%
                </span>
              </span>
              <span className="font-black tabular-nums">{Math.round(f.score)}</span>
            </div>
            <Progress value={f.score} className="mt-1 h-1.5" aria-label={`${f.label} ${f.score} of 100`} />
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{f.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EvidencePanel({ p }: { p: Property }) {
  const checks = evidenceFor(p);
  return (
    <div className="rounded-2xl border bg-card p-5">
      <h3 className="text-sm font-black uppercase tracking-wider">Verification evidence</h3>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Scope, method and check dates for every claim — evidence expires after 90 days.
      </p>
      <div className="mt-4 space-y-3">
        {checks.map((c) => (
          <div key={c.name} className="rounded-xl border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold">
                {c.status === 'pass' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-gold" aria-hidden />
                )}
                {c.name}
              </span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider',
                  c.freshness === 'fresh' ? 'bg-primary/10 text-primary' : 'bg-gold/15 text-gold-foreground',
                )}
              >
                {c.freshness === 'fresh' ? 'Fresh' : c.freshness === 'recheck-due' ? 'Recheck due' : 'Expired'}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{c.scope}</p>
            <p className="mt-1 text-[10px] text-muted-foreground/70">
              Checked {c.checkedAt} · valid to {c.expiresAt} · {c.method} method
            </p>
          </div>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="mt-3 w-full text-xs font-bold"
        onClick={() => {
          track({ event: 'issue_reported', propertyId: p.id, reason: 'listing-flag' });
          toast({
            title: 'Issue reported',
            description: 'The verification desk will review this listing. Thank you — trust is a shared effort.',
          });
        }}
      >
        <ShieldAlert className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Report an issue with this listing
      </Button>
    </div>
  );
}

/* --------------------------------- gallery -------------------------------- */

function Gallery({ images, title }: { images: string[]; title: string }) {
  const [idx, setIdx] = useState(0);
  const [ok, setOk] = useState(true);
  const safe = images.length ? images : [''];
  const go = (d: number) => setIdx((i) => (i + d + safe.length) % safe.length);
  return (
    <div className="overflow-hidden rounded-3xl border bg-card">
      <div className="relative aspect-[16/10] bg-muted">
        {ok ? (
          <img
            src={safe[idx]}
            srcSet={srcsetFor(safe[idx])}
            sizes={GALLERY_SIZES}
            alt={`${title} — photo ${idx + 1} of ${safe.length}`}
            className="h-full w-full object-cover"
            onError={() => setOk(false)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl" aria-hidden>🏠</div>
        )}
        {safe.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
              {idx + 1} / {safe.length}
            </span>
          </>
        )}
      </div>
      {safe.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-3 slim-scroll">
          {safe.map((src, i) => (
            <button
              key={i}
              onClick={() => {
                setIdx(i);
                setOk(true);
              }}
              aria-label={`Photo ${i + 1}`}
              className={cn(
                'h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                i === idx ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ detail view ------------------------------- */

export default function PropertyDetailView({ id }: { id: string }) {
  const all = useAllProperties();
  const p = useMemo(() => all.find((x) => x.id === id), [all, id]);
  const [favorites, setFavorites] = useStore<string[]>('favorites', []);
  const saved = p ? favorites.includes(p.id) : false;

  // Entity SEO (2026-09-12): re-apply the prerendered meta after hydration so
  // the tab title, OG tags and JSON-LD stay entity-specific instead of
  // reverting to the generic shell default (RouteMeta's fallback).
  usePageMeta(
    p ? listingMeta(p) : { title: 'Listing not found', robots: 'noindex' },
    `/properties/${id}`,
  );

  // Analytics (audit F-11): one result_view per listing open.
  useEffect(() => {
    if (p) track({ event: 'result_view', propertyId: p.id });
  }, [p]);

  const similar = useMemo(
    () =>
      p
        ? all
            .filter((x) => x.id !== p.id && (x.area === p.area || x.type === p.type))
            .sort((a, b) => b.trustScore - a.trustScore)
            .slice(0, 4)
        : [],
    [all, p],
  );

  const mortgage = useMemo(() => {
    if (!p || p.priceOnApplication || p.purpose.includes('rent')) return null;
    return calculateMortgage({ propertyPrice: p.price, depositPct: 20, annualRatePct: 13.5, termYears: 15 });
  }, [p]);

  if (!p) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <span className="text-5xl" aria-hidden>🔎</span>
        <h1 className="text-xl font-black">Property not found</h1>
        <p className="text-sm text-muted-foreground">
          Listing {id} isn&rsquo;t in the marketplace — it may have been withdrawn or sold.
        </p>
        <Button className="font-bold" onClick={() => navigate('/properties')}>
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Back to discovery
        </Button>
      </div>
    );
  }

  const isRent = p.purpose.includes('rent');
  const toggleSave = () =>
    setFavorites((prev) => (prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <button
        onClick={() => navigate('/properties')}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All properties
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px] font-bold">{passportId(p)}</Badge>
            {p.offPlan && <Badge className="border-0 bg-gold text-[10px] font-bold text-gold-foreground">Off-Plan</Badge>}
            {p.purpose.map((pp) => (
              <Badge key={pp} variant="secondary" className="text-[10px] font-bold capitalize">{pp}</Badge>
            ))}
          </div>
          <h1 className="mt-2.5 text-2xl font-black tracking-tight sm:text-3xl">{p.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" aria-hidden /> {p.area}, {p.county}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4" aria-hidden /> {p.views.toLocaleString('en-KE')} views
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" aria-hidden /> listed {timeAgo(p.listedAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="font-bold" onClick={toggleSave} aria-label={saved ? 'Remove from saved' : 'Save property'}>
            <Heart className={cn('h-4 w-4', saved && 'fill-gold text-gold')} aria-hidden />
            {saved ? 'Saved' : 'Save'}
          </Button>
          <Button size="sm" className="font-bold" onClick={() => navigate(`/finance?price=${p.price}`)}>
            <Landmark className="mr-1.5 h-4 w-4" aria-hidden /> Financing
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-8">
          <Gallery images={p.images} title={p.title} />

          {/* key facts strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Tag, label: p.priceOnApplication ? 'Price' : isRent ? 'Monthly rent' : 'Asking price', value: p.priceOnApplication ? 'On application' : formatKES(p.price) },
              { icon: BedDouble, label: 'Bedrooms', value: p.bedrooms ? `${p.bedrooms}` : '—' },
              { icon: Bath, label: 'Bathrooms', value: p.bathrooms ? `${p.bathrooms}` : '—' },
              { icon: Ruler, label: 'Size', value: `${p.sizeSqm.toLocaleString('en-KE')} m²` },
            ].map((f) => (
              <div key={f.label} className="rounded-2xl border bg-card p-4">
                <f.icon className="h-4 w-4 text-gold" aria-hidden />
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{f.label}</p>
                <p className="text-sm font-black">{f.value}</p>
              </div>
            ))}
          </div>

          <PropertyPassport p={p} />

          <Tabs defaultValue="about" className="w-full" onValueChange={(v) => { if (v === 'evidence') track({ event: 'evidence_reviewed', propertyId: p.id }); }}>
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="about" className="font-bold">About</TabsTrigger>
              <TabsTrigger value="amenities" className="font-bold">Amenities</TabsTrigger>
              <TabsTrigger value="scores" className="font-bold">Scores</TabsTrigger>
              <TabsTrigger value="evidence" className="font-bold">Evidence</TabsTrigger>
            </TabsList>
            <TabsContent value="about" className="mt-4 space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{p.description}</p>
              {p.highlights.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {p.highlights.map((h) => (
                    <Badge key={h} variant="secondary" className="font-semibold">{h}</Badge>
                  ))}
                </div>
              )}
              {p.paymentPlan && (
                <div className="rounded-xl border bg-accent/40 p-4 text-sm">
                  <p className="font-bold">Payment plan</p>
                  <p className="mt-1 text-muted-foreground">{p.paymentPlan}</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="amenities" className="mt-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {p.amenities.map((a) => (
                  <div key={a} className="flex items-center gap-2 rounded-xl border bg-card p-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden /> {a}
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="scores" className="mt-4 grid gap-4 sm:grid-cols-2">
              <InvestmentPanel p={p} />
              <TrustFactorsPanel p={p} />
            </TabsContent>
            <TabsContent value="evidence" className="mt-4">
              <EvidencePanel p={p} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              Listed by
            </p>
            <p className="mt-1.5 text-base font-black">{p.agency}</p>
            <Separator className="my-4" />
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">
                {p.agent.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <p className="text-sm font-bold">{p.agent.name}</p>
                <p className="text-xs text-muted-foreground">Verified agent</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {/* Conversion honesty (audit F-26 / P1-7): every CTA either
                  captures a real lead or hands off truthfully to WhatsApp —
                  no toast-only dead ends. */}
              <a href={whatsappLink(`Hello Keja AI — please call me back about ${p.title} (${passportId(p)}).`)} target="_blank" rel="noopener noreferrer" onClick={() => track({ event: 'human_handoff', channel: 'whatsapp', context: 'callback' })}>
                <Button className="w-full font-bold">
                  <Phone className="mr-1.5 h-4 w-4" aria-hidden /> Request callback
                </Button>
              </a>
              <a href={whatsappLink(`Hello Keja AI — I'd like to book a viewing for ${p.title} (${passportId(p)}).`)} target="_blank" rel="noopener noreferrer" onClick={() => track({ event: 'viewing_request', propertyId: p.id })}>
                <Button variant="outline" className="w-full font-bold">
                  <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden /> Book a viewing
                </Button>
              </a>
              <a href={whatsappLink(`Hello Keja AI — I'm interested in ${p.title} (${passportId(p)}).`)} target="_blank" rel="noopener noreferrer" onClick={() => track({ event: 'human_handoff', channel: 'whatsapp', context: 'listing-enquiry' })}>
                <Button variant="ghost" className="w-full font-bold text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]">
                  <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden /> WhatsApp the desk
                </Button>
              </a>
            </div>
          </div>

          {mortgage && (
            <div className="rounded-2xl border bg-gradient-to-b from-accent/60 to-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                  Keja Finance · indicative
                </p>
                <Badge variant="outline" className="text-[9px] font-bold">Estimate</Badge>
              </div>
              <p className="mt-3 text-2xl font-black tabular-nums">
                {formatKES(Math.round(mortgage.monthlyRepayment))}
                <span className="text-sm font-bold text-muted-foreground">/mo</span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                80% LTV · 13.5% p.a. · 15 years · deposit {formatKES(mortgage.deposit)}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full font-bold"
                onClick={() => navigate(`/finance?price=${p.price}`)}
              >
                Adjust in Keja Finance
              </Button>
            </div>
          )}

          {p.purpose.includes('invest') && (
            <div className="rounded-2xl border border-gold/40 bg-gold-soft p-5">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-gold-foreground">
                <Coins className="h-3.5 w-3.5" aria-hidden /> Keja Token
              </p>
              <p className="mt-2 text-sm font-bold leading-snug">
                Prefer fractional exposure to this asset class?
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try fractional ownership in the tokenization trial — fictional assets, virtual wallet.
              </p>
              <Button size="sm" className="mt-3 w-full bg-gold font-black text-gold-foreground hover:bg-gold/90" onClick={() => navigate('/tokenize')}>
                Open trial marketplace
              </Button>
            </div>
          )}

          <div className="rounded-2xl border bg-card p-5">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              <FileText className="h-3.5 w-3.5" aria-hidden /> Before you commit
            </p>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              {[
                'Upload the sale documents to the AI Deal Analyst for a pre-screening.',
                'Commission an independent valuation through Keja Transact.',
                'Engage a conveyancing lawyer — every flagged item gets human review.',
              ].map((li) => (
                <li key={li} className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden /> {li}
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="sm" className="mt-3 w-full font-bold text-primary" onClick={() => navigate('/deal-analyst')}>
              Run the AI Deal Analyst →
            </Button>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-black tracking-tight">Similar verified listings</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((s, i) => (
              <PropertyCard key={s.id} property={s} index={i} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
