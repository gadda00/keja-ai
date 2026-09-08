import { m } from 'framer-motion';
import {
  Briefcase,
  CalendarClock,
  Copy,
  Flame,
  Info,
  MessageCircle,
  PenLine,
  Phone,
  Printer,
  Scale,
  Snowflake,
  Sparkles,
  Sun,
  Trash2,
  Users,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import TrustBadge from '@/components/property/TrustBadge';
import { track } from '@/lib/analytics';
import { formatKES, timeAgo } from '@/lib/format';
import { findProperty, marketInventory } from '@/lib/inventory';
import type {
  CmaReport,
  CmaSubject,
  GeneratedListing,
  ListingTone,
  ProSubjectType,
  Viewing,
} from '@/lib/proStore';
import {
  buildCma,
  FEATURE_OPTIONS,
  findCmaComps,
  generateListingCopy,
  newProId,
  upcomingViewings,
  useProStore,
} from '@/lib/proStore';
import { usePageMeta } from '@/lib/seo';
import type { Lead } from '@/lib/store';
import { KEYS, seedLeads, useStore } from '@/lib/store';

const TABS = [
  { key: 'leads', label: 'Leads', icon: Users },
  { key: 'cma', label: 'CMA builder', icon: Scale },
  { key: 'writer', label: 'Listing writer', icon: PenLine },
  { key: 'viewings', label: 'Viewings', icon: CalendarClock },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const SUBJECT_TYPES: ProSubjectType[] = [
  'apartment',
  'villa',
  'townhouse',
  'bungalow',
  'land',
  'commercial',
];

const TONES: { value: ListingTone; label: string; hint: string }[] = [
  { value: 'professional', label: 'Professional', hint: 'Factual, evidence-first' },
  { value: 'warm', label: 'Warm', hint: 'Family & feeling' },
  { value: 'luxury', label: 'Luxury', hint: 'Quietly premium' },
  { value: 'diaspora', label: 'Diaspora', hint: 'Buy-at-a-distance' },
];

const TEMPS = [
  {
    key: 'HOT',
    label: 'HOT',
    icon: Flame,
    style: 'bg-red-50 border-red-200 text-red-700',
    dot: 'bg-red-500',
  },
  {
    key: 'WARM',
    label: 'WARM',
    icon: Sun,
    style: 'bg-amber-50 border-amber-200 text-amber-700',
    dot: 'bg-amber-500',
  },
  {
    key: 'COLD',
    label: 'COLD',
    icon: Snowflake,
    style: 'bg-sky-50 border-sky-200 text-sky-700',
    dot: 'bg-sky-500',
  },
] as const;

const STATUS_ACTIONS: { value: Viewing['status']; label: string }[] = [
  { value: 'completed', label: 'Mark done' },
  { value: 'no-show', label: 'No-show' },
  { value: 'cancelled', label: 'Cancel' },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45 },
};

const numVal = (raw: string): number => {
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? 0 : n;
};

const formatWhen = (iso: string): string =>
  new Date(iso).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });

const leadWhatsAppHref = (l: Lead): string => {
  const digits = l.phone.replace(/[^0-9]/g, '');
  const firstName = l.name.split(' ')[0];
  const text = `Hi ${firstName}, this is your Keja PRO agent regarding ${l.interest}. When would suit you for a viewing this week?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
};

export default function ProWorkspace() {
  usePageMeta(
    'KEJA PRO — Agent Workspace',
    'Agent tools from Keja: HOT/WARM/COLD lead pipeline, comparables-based CMA builder, listing copywriter and viewing scheduler.'
  );

  const [tab, setTab] = useState<TabKey>('leads');
  const [pro, setPro] = useProStore();
  const [userLeads] = useStore<Lead[]>(KEYS.leads, []);
  const leads = useMemo(() => [...userLeads, ...seedLeads], [userLeads]);

  /* CMA builder subject ------------------------------------------------ */
  const [cmaArea, setCmaArea] = useState('Kilimani');
  const [cmaType, setCmaType] = useState<ProSubjectType>('apartment');
  const [cmaBeds, setCmaBeds] = useState(3);
  const [cmaSize, setCmaSize] = useState(120);

  /* Listing writer inputs ---------------------------------------------- */
  const [lwType, setLwType] = useState('apartment');
  const [lwArea, setLwArea] = useState('Kilimani');
  const [lwBeds, setLwBeds] = useState(3);
  const [lwFeatures, setLwFeatures] = useState<string[]>(['parking', 'gated']);
  const [lwTone, setLwTone] = useState<ListingTone>('professional');
  const [copied, setCopied] = useState(false);

  /* Viewing scheduler -------------------------------------------------- */
  const [vProperty, setVProperty] = useState('');
  const [vLead, setVLead] = useState('');
  const [vWhen, setVWhen] = useState('');
  const [vNote, setVNote] = useState('');

  const inventory = useMemo(() => marketInventory(), []);
  const areas = useMemo(() => [...new Set(inventory.map((p) => p.area))].sort(), [inventory]);
  const viewingProps = useMemo(
    () => [...inventory].sort((a, b) => b.trustScore - a.trustScore).slice(0, 20),
    [inventory]
  );

  const cmaSubject: CmaSubject = useMemo(
    () => ({
      area: cmaArea,
      type: cmaType,
      beds: cmaBeds > 0 ? cmaBeds : undefined,
      sizeSqM: cmaSize > 0 ? cmaSize : undefined,
    }),
    [cmaArea, cmaType, cmaBeds, cmaSize]
  );
  const cmaComps = useMemo(() => findCmaComps(marketInventory(), cmaSubject), [cmaSubject]);
  const cma = useMemo(() => buildCma(cmaComps, cmaSubject), [cmaComps, cmaSubject]);
  const cmaShown = useMemo(
    () => cmaComps.filter((p) => cma.compIds.includes(p.id)).slice(0, 6),
    [cmaComps, cma]
  );

  const listingCopy = useMemo(
    () =>
      generateListingCopy({
        type: lwType,
        area: lwArea,
        beds: lwBeds,
        features: lwFeatures,
        tone: lwTone,
      }),
    [lwType, lwArea, lwBeds, lwFeatures, lwTone]
  );

  const upcoming = useMemo(() => upcomingViewings(pro.viewings), [pro.viewings]);
  const pastViewings = useMemo(() => {
    const upIds = new Set(upcoming.map((v) => v.id));
    return pro.viewings
      .filter((v) => !upIds.has(v.id))
      .sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime());
  }, [pro.viewings, upcoming]);

  const hotCount = leads.filter((l) => l.temperature === 'HOT').length;

  /* actions -------------------------------------------------------------- */
  const saveCma = () => {
    if (cma.compCount === 0) return;
    const report: CmaReport = {
      id: newProId('cma'),
      createdAt: new Date().toISOString(),
      subjectArea: cmaSubject.area,
      subjectType: cmaSubject.type,
      subjectBeds: cmaSubject.beds,
      subjectSizeSqM: cmaSubject.sizeSqM,
      compIds: cma.compIds,
      lowKes: cma.lowKes,
      medianKes: cma.medianKes,
      highKes: cma.highKes,
      pricePerSqMKes: cma.pricePerSqMKes,
      label: `${cmaSubject.beds ? `${cmaSubject.beds}-bed ` : ''}${cmaSubject.type} · ${cmaSubject.area}`,
    };
    setPro((prev) => ({ ...prev, cmas: [report, ...prev.cmas] }));
  };

  const deleteCma = (id: string) => {
    setPro((prev) => ({ ...prev, cmas: prev.cmas.filter((c) => c.id !== id) }));
  };

  const copyListing = async () => {
    const text = `${listingCopy.title}\n\n${listingCopy.description}\n\nHighlights:\n${listingCopy.highlights
      .map((h) => `• ${h}`)
      .join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const saveListing = () => {
    const draft: GeneratedListing = {
      id: newProId('lst'),
      createdAt: new Date().toISOString(),
      listingTitle: listingCopy.title,
      description: listingCopy.description,
      highlights: listingCopy.highlights,
      inputs: {
        type: lwType,
        area: lwArea,
        beds: lwBeds,
        features: lwFeatures,
        tone: lwTone,
      },
    };
    setPro((prev) => ({ ...prev, listings: [draft, ...prev.listings] }));
  };

  const deleteListing = (id: string) => {
    setPro((prev) => ({ ...prev, listings: prev.listings.filter((l) => l.id !== id) }));
  };

  const addViewing = (e: FormEvent) => {
    e.preventDefault();
    if (!vProperty || vLead.trim() === '' || vWhen === '') return;
    const viewing: Viewing = {
      id: newProId('vw'),
      propertyId: vProperty,
      leadName: vLead.trim(),
      scheduledFor: new Date(vWhen).toISOString(),
      status: 'scheduled',
      note: vNote.trim() !== '' ? vNote.trim() : undefined,
    };
    setPro((prev) => ({ ...prev, viewings: [...prev.viewings, viewing] }));
    track({ event: 'viewing_request', propertyId: viewing.propertyId });
    setVLead('');
    setVWhen('');
    setVNote('');
  };

  const setViewingStatus = (id: string, status: Viewing['status']) => {
    setPro((prev) => ({
      ...prev,
      viewings: prev.viewings.map((v) => (v.id === id ? { ...v, status } : v)),
    }));
  };

  const toggleFeature = (f: string) => {
    setLwFeatures((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const cmaImplied =
    cma.pricePerSqMKes !== undefined && cmaSubject.sizeSqM !== undefined
      ? cma.pricePerSqMKes * cmaSubject.sizeSqM
      : undefined;

  return (
    <div className="bg-cream/60">
      <div className="container-luxe py-10 sm:py-14">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Agent workspace · demo</p>
            <h1 className="heading-display mt-3 flex flex-wrap items-center gap-3 text-3xl sm:text-4xl">
              <Briefcase className="h-8 w-8 text-gold-600" />
              KEJA <span className="gold-text">PRO</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              The four tools agents asked for most: the lead pipeline, a comparables-based CMA
              builder, a listing copywriter and viewing scheduling. Everything is client-side and
              every figure is clearly labelled — ESTIMATE means estimate.
            </p>
          </div>
          <span className="chip">
            <Info className="h-3.5 w-3.5" /> DEMO WORKSPACE · DATA STAYS ON THIS DEVICE
          </span>
        </div>

        {/* stat cards */}
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              icon: Users,
              label: 'Leads',
              value: leads.length,
              sub: `${hotCount} HOT · synced from Ask Keja`,
            },
            { icon: Scale, label: 'CMA reports', value: pro.cmas.length, sub: 'saved estimates' },
            {
              icon: PenLine,
              label: 'Listing drafts',
              value: pro.listings.length,
              sub: 'AI-assisted drafts',
            },
            {
              icon: CalendarClock,
              label: 'Upcoming viewings',
              value: upcoming.length,
              sub: `${pastViewings.length} in history`,
            },
          ].map((s) => (
            <div key={s.label} className="card-luxe p-4">
              <s.icon className="h-5 w-5 text-gold-600" />
              <p className="mt-2 font-display text-2xl font-bold text-ink">{s.value}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                {s.label}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-muted">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* tabs */}
        <div
          role="tablist"
          aria-label="KEJA PRO workspace sections"
          className="mt-8 flex flex-wrap gap-1 rounded-2xl bg-gold-50 p-1.5 print:hidden"
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                tab === t.key
                  ? 'bg-gold-gradient text-white shadow-gold-sm'
                  : 'text-ink-muted hover:text-gold-700'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ============================== LEADS ============================== */}
        {tab === 'leads' && (
          <m.section {...fadeUp} aria-label="Leads pipeline" className="mt-6">
            <div className="card-luxe flex items-start gap-3 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
              <p className="text-xs leading-relaxed text-ink-muted">
                Leads qualified through the <b>Ask Keja</b> chat flow land here automatically —
                budget, timeline and temperature are captured in conversation, then routed to this
                pipeline. Leads captured on this device sync instantly; the seeded names below are{' '}
                <b>demo leads</b> for the walkthrough.
              </p>
            </div>

            <div className="mt-4 grid gap-4 grid-cols-1 lg:grid-cols-3">
              {TEMPS.map((t) => {
                const colLeads = leads.filter((l) => l.temperature === t.key);
                return (
                  <div key={t.key} className={`rounded-2xl border p-4 ${t.style}`}>
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-2 text-sm font-bold">
                        <t.icon className="h-4 w-4" /> {t.label}
                      </p>
                      <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-bold">
                        {colLeads.length}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2.5">
                      {colLeads.length === 0 && (
                        <p className="rounded-xl bg-white/50 px-3 py-4 text-center text-xs text-ink-muted">
                          No leads yet
                        </p>
                      )}
                      {colLeads.map((l) => (
                        <div key={l.id} className="rounded-xl bg-white p-3.5 shadow-sm">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-ink">{l.name}</p>
                            <span className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                              {l.source}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs text-ink-muted">{l.interest}</p>
                          <p className="mt-1.5 text-[11px] font-semibold text-gold-700">
                            {l.budget ?? '—'}
                          </p>
                          <div className="mt-2.5 flex gap-2">
                            <a
                              href={`tel:${l.phone.replace(/\s/g, '')}`}
                              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-gold-300 px-2 py-2 text-[11px] font-semibold text-gold-700 transition hover:bg-gold-50"
                            >
                              <Phone className="h-3.5 w-3.5" /> Call
                            </a>
                            <a
                              href={leadWhatsAppHref(l)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2 py-2 text-[11px] font-semibold text-white transition hover:bg-emerald-500"
                            >
                              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </m.section>
        )}

        {/* ============================ CMA BUILDER ========================== */}
        {tab === 'cma' && (
          <m.section {...fadeUp} aria-label="CMA builder" className="mt-6">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,380px)_1fr]">
              {/* subject inputs */}
              <div className="card-luxe space-y-5 p-6 print:hidden">
                <div>
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                    <Scale className="h-5 w-5 text-gold-600" /> Subject property
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    Comparables are pulled live from Keja inventory for the same area and type,
                    within ±1 bedroom. Sale listings only.
                  </p>
                </div>
                <div>
                  <label htmlFor="cma-area" className="label-luxe">
                    Area
                  </label>
                  <select
                    id="cma-area"
                    value={cmaArea}
                    onChange={(e) => setCmaArea(e.target.value)}
                    className="input-luxe"
                  >
                    {areas.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="cma-type" className="label-luxe">
                    Property type
                  </label>
                  <select
                    id="cma-type"
                    value={cmaType}
                    onChange={(e) => setCmaType(e.target.value as ProSubjectType)}
                    className="input-luxe capitalize"
                  >
                    {SUBJECT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cma-beds" className="label-luxe">
                      Bedrooms (0 = any)
                    </label>
                    <input
                      id="cma-beds"
                      type="number"
                      min={0}
                      max={10}
                      value={cmaBeds}
                      onChange={(e) => setCmaBeds(numVal(e.target.value))}
                      className="input-luxe"
                    />
                  </div>
                  <div>
                    <label htmlFor="cma-size" className="label-luxe">
                      Size (sqm, optional)
                    </label>
                    <input
                      id="cma-size"
                      type="number"
                      min={0}
                      max={100000}
                      value={cmaSize}
                      onChange={(e) => setCmaSize(numVal(e.target.value))}
                      className="input-luxe"
                    />
                  </div>
                </div>
                <p className="rounded-xl bg-gold-50 p-3 text-xs leading-relaxed text-ink-soft">
                  <b>{cmaComps.length}</b> sale listing{cmaComps.length === 1 ? '' : 's'} match this
                  area + type in the live inventory; the band keeps comps within ±1 bedroom of the
                  subject.
                </p>
              </div>

              {/* results */}
              <div className="space-y-6">
                <div className="card-luxe p-6" aria-live="polite">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-display text-lg font-bold text-ink">
                      Comparables price band
                    </h3>
                    <span className="chip">ESTIMATE</span>
                  </div>

                  {cma.compCount === 0 ? (
                    <div className="mt-4 rounded-xl bg-gold-50 p-4 text-sm leading-relaxed text-ink-soft">
                      No comparables passed the area + type + ±1-bedroom filters. Adjust the
                      subject, try a neighbouring area, or request a human valuation — an honest gap
                      beats an invented number.
                    </div>
                  ) : (
                    <>
                      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                        {[
                          { label: 'Low', value: cma.lowKes },
                          { label: 'Median', value: cma.medianKes, accent: true },
                          { label: 'High', value: cma.highKes },
                        ].map((b) => (
                          <div
                            key={b.label}
                            className={`rounded-xl p-3 ${
                              b.accent ? 'bg-gold-50 ring-1 ring-gold-200' : 'bg-cream'
                            }`}
                          >
                            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                              {b.label}
                            </p>
                            <p
                              className={`mt-1 font-display font-bold ${
                                b.accent ? 'text-xl text-gold-700 sm:text-2xl' : 'text-lg text-ink'
                              }`}
                            >
                              {formatKES(b.value)}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-ink-muted">
                        Median ±15% across <b>{cma.compCount}</b> sale comparables ·{' '}
                        <span className="capitalize">
                          {cmaSubject.type} · {cmaSubject.area}
                        </span>
                      </p>
                      {cma.pricePerSqMKes !== undefined && (
                        <p className="mt-2 rounded-xl bg-cream p-3 text-xs leading-relaxed text-ink-soft">
                          <b>Price per sqm: {formatKES(cma.pricePerSqMKes)}</b>
                          {cmaImplied !== undefined && (
                            <>
                              {' '}
                              → implied <b>{formatKES(cmaImplied)}</b> for {cmaSubject.sizeSqM} sqm
                              (ESTIMATE)
                            </>
                          )}
                        </p>
                      )}
                      <p className="mt-3 border-t border-gold-100 pt-3 text-[11px] leading-relaxed text-ink-faint">
                        Indicative comparables band from live Keja inventory — not a valuation.
                        Asking prices, not transacted prices.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3 print:hidden">
                        <button onClick={saveCma} className="btn-gold !px-5 !py-2.5 text-xs">
                          <Scale className="h-4 w-4" /> Save CMA report
                        </button>
                        <button
                          onClick={() => window.print()}
                          className="btn-outline !px-5 !py-2.5 text-xs"
                        >
                          <Printer className="h-4 w-4" /> Print CMA
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* comps */}
                {cmaShown.length > 0 && (
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">
                      Comparables used{' '}
                      <span className="text-sm font-normal text-ink-faint">
                        (top {cmaShown.length} of {cma.compCount} by trust)
                      </span>
                    </h3>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {cmaShown.map((p) => (
                        <div key={p.id} className="card-luxe card-luxe-hover p-4">
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              to={`/properties/${p.id}`}
                              className="text-sm font-bold text-ink hover:text-gold-700"
                            >
                              {p.title}
                            </Link>
                            <TrustBadge score={p.trustScore} size="sm" />
                          </div>
                          <p className="mt-1 text-xs text-ink-muted">
                            {p.bedrooms !== undefined ? `${p.bedrooms} bed · ` : ''}
                            {p.sizeSqm.toLocaleString('en-KE')} sqm · {p.agency}
                          </p>
                          <div className="mt-2 flex items-baseline justify-between gap-2">
                            <p className="font-display text-lg font-bold text-gold-700">
                              {formatKES(p.price)}
                            </p>
                            <p className="text-[11px] text-ink-faint">
                              {formatKES(Math.round(p.price / p.sizeSqm))}/sqm
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* saved reports */}
                {pro.cmas.length > 0 && (
                  <div className="card-luxe divide-y divide-gold-100 print:hidden">
                    <p className="px-4 pt-4 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                      Saved CMA reports ({pro.cmas.length}) · ESTIMATES
                    </p>
                    {pro.cmas.map((r) => (
                      <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                        <div className="min-w-[180px] flex-1">
                          <p className="text-sm font-bold capitalize text-ink">{r.label}</p>
                          <p className="text-xs text-ink-faint">
                            {timeAgo(r.createdAt)} · {r.compIds.length} comps
                          </p>
                        </div>
                        <p className="font-display text-base font-bold text-gold-700">
                          {formatKES(r.medianKes)}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {formatKES(r.lowKes)} – {formatKES(r.highKes)}
                        </p>
                        <button
                          onClick={() => deleteCma(r.id)}
                          aria-label={`Delete CMA report ${r.label}`}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gold-100 text-ink-muted transition hover:border-red-200 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </m.section>
        )}

        {/* =========================== LISTING WRITER ======================== */}
        {tab === 'writer' && (
          <m.section {...fadeUp} aria-label="Listing writer" className="mt-6">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,380px)_1fr]">
              {/* inputs */}
              <div className="card-luxe space-y-5 p-6 print:hidden">
                <div>
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                    <PenLine className="h-5 w-5 text-gold-600" /> Draft inputs
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    Deterministic grammar generator — the same inputs always produce the same draft.
                    No LLM call, works offline.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="lw-type" className="label-luxe">
                      Type
                    </label>
                    <select
                      id="lw-type"
                      value={lwType}
                      onChange={(e) => setLwType(e.target.value)}
                      className="input-luxe capitalize"
                    >
                      {SUBJECT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="lw-area" className="label-luxe">
                      Area
                    </label>
                    <select
                      id="lw-area"
                      value={lwArea}
                      onChange={(e) => setLwArea(e.target.value)}
                      className="input-luxe"
                    >
                      {areas.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="lw-beds" className="label-luxe">
                    Bedrooms
                  </label>
                  <input
                    id="lw-beds"
                    type="number"
                    min={1}
                    max={10}
                    value={lwBeds}
                    onChange={(e) => setLwBeds(Math.max(1, numVal(e.target.value)))}
                    className="input-luxe"
                  />
                </div>
                <div>
                  <span className="label-luxe">Features</span>
                  <div className="flex flex-wrap gap-2">
                    {FEATURE_OPTIONS.map((f) => {
                      const active = lwFeatures.includes(f);
                      return (
                        <button
                          key={f}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleFeature(f)}
                          className={`min-h-[40px] rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                            active
                              ? 'border-gold-400 bg-gold-50 text-gold-700'
                              : 'border-gold-100 bg-white text-ink-muted hover:border-gold-300'
                          }`}
                        >
                          {f}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <span className="label-luxe">Tone</span>
                  <div className="grid grid-cols-2 gap-2">
                    {TONES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        aria-pressed={lwTone === t.value}
                        onClick={() => setLwTone(t.value)}
                        className={`min-h-[56px] rounded-xl border p-2.5 text-left transition ${
                          lwTone === t.value
                            ? 'border-gold-400 bg-gold-50'
                            : 'border-gold-100 bg-white hover:border-gold-300'
                        }`}
                      >
                        <p className="text-xs font-bold text-ink">{t.label}</p>
                        <p className="text-[10px] leading-tight text-ink-faint">{t.hint}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* generated draft */}
              <div className="card-luxe p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-bold text-ink">Generated draft</h3>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">
                    <Sparkles className="h-3.5 w-3.5" /> AI-assisted draft — review before
                    publishing
                  </span>
                </div>
                <p className="mt-4 font-display text-xl font-bold text-ink">{listingCopy.title}</p>
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                  {listingCopy.description}
                </p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {listingCopy.highlights.map((h) => (
                    <li
                      key={h}
                      className="flex items-center gap-2 rounded-xl bg-cream px-3 py-2 text-xs font-semibold text-ink-soft"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-gold-500" /> {h}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap gap-3 print:hidden">
                  <button
                    onClick={() => void copyListing()}
                    className="btn-outline !px-5 !py-2.5 text-xs"
                  >
                    <Copy className="h-4 w-4" /> {copied ? 'Copied!' : 'Copy to clipboard'}
                  </button>
                  <button onClick={saveListing} className="btn-gold !px-5 !py-2.5 text-xs">
                    <PenLine className="h-4 w-4" /> Save draft
                  </button>
                </div>
              </div>
            </div>

            {/* saved drafts */}
            {pro.listings.length > 0 && (
              <div className="card-luxe mt-6 divide-y divide-gold-100 print:hidden">
                <p className="px-4 pt-4 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                  Saved drafts ({pro.listings.length}) · AI-assisted, review before publishing
                </p>
                {pro.listings.map((l) => (
                  <div key={l.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-[180px] flex-1">
                      <p className="text-sm font-bold text-ink">{l.listingTitle}</p>
                      <p className="text-xs text-ink-faint">
                        {timeAgo(l.createdAt)} · {l.inputs.tone} tone · {l.inputs.features.length}{' '}
                        features
                      </p>
                    </div>
                    <button
                      onClick={() => deleteListing(l.id)}
                      aria-label={`Delete listing draft ${l.listingTitle}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gold-100 text-ink-muted transition hover:border-red-200 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </m.section>
        )}

        {/* ============================== VIEWINGS =========================== */}
        {tab === 'viewings' && (
          <m.section {...fadeUp} aria-label="Viewings" className="mt-6">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,380px)_1fr]">
              {/* schedule form */}
              <form onSubmit={addViewing} className="card-luxe space-y-5 p-6 print:hidden">
                <div>
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                    <CalendarClock className="h-5 w-5 text-gold-600" /> Schedule a viewing
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    Pick from the top-20 most-trusted live listings. Demo scheduling — nothing is
                    sent to the lead or the agency; in production this syncs to the agency calendar
                    and notifies the lead.
                  </p>
                </div>
                <div>
                  <label htmlFor="v-property" className="label-luxe">
                    Listing
                  </label>
                  <select
                    id="v-property"
                    value={vProperty}
                    onChange={(e) => setVProperty(e.target.value)}
                    className="input-luxe"
                  >
                    <option value="">Select a listing…</option>
                    {viewingProps.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} · {p.area}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="v-lead" className="label-luxe">
                    Lead name
                  </label>
                  <input
                    id="v-lead"
                    list="pro-lead-names"
                    value={vLead}
                    onChange={(e) => setVLead(e.target.value)}
                    placeholder="Type or pick a lead"
                    className="input-luxe"
                  />
                  <datalist id="pro-lead-names">
                    {leads.map((l) => (
                      <option key={l.id} value={l.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label htmlFor="v-when" className="label-luxe">
                    Date & time
                  </label>
                  <input
                    id="v-when"
                    type="datetime-local"
                    value={vWhen}
                    onChange={(e) => setVWhen(e.target.value)}
                    className="input-luxe"
                  />
                </div>
                <div>
                  <label htmlFor="v-note" className="label-luxe">
                    Note (optional)
                  </label>
                  <textarea
                    id="v-note"
                    value={vNote}
                    onChange={(e) => setVNote(e.target.value)}
                    rows={2}
                    placeholder="e.g. Client wants to see the DSQ and parking"
                    className="input-luxe"
                  />
                </div>
                <button
                  type="submit"
                  disabled={vProperty === '' || vLead.trim() === '' || vWhen === ''}
                  className="btn-gold w-full !py-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CalendarClock className="h-4 w-4" /> Add to schedule
                </button>
              </form>

              {/* lists */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">
                    Upcoming ({upcoming.length})
                  </h3>
                  <div className="mt-3 space-y-3">
                    {upcoming.length === 0 && (
                      <p className="card-luxe p-4 text-xs text-ink-muted">
                        Nothing scheduled yet — add a viewing from the form.
                      </p>
                    )}
                    {upcoming.map((v) => (
                      <ViewingRow
                        key={v.id}
                        viewing={v}
                        inventory={inventory}
                        onStatus={setViewingStatus}
                      />
                    ))}
                  </div>
                </div>

                {pastViewings.length > 0 && (
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">
                      History ({pastViewings.length})
                    </h3>
                    <div className="card-luxe mt-3 divide-y divide-gold-100">
                      {pastViewings.map((v) => {
                        const prop = findProperty(inventory, v.propertyId);
                        return (
                          <div key={v.id} className="flex flex-wrap items-center gap-3 p-4">
                            <div className="min-w-[160px] flex-1">
                              <p className="text-sm font-bold text-ink">
                                {prop?.title ?? v.propertyId}
                              </p>
                              <p className="text-xs text-ink-muted">
                                {v.leadName} · {formatWhen(v.scheduledFor)}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                v.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : v.status === 'cancelled'
                                    ? 'bg-gold-100 text-gold-800'
                                    : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {v.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="card-luxe flex items-start gap-3 p-4 print:hidden">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
                  <p className="text-xs leading-relaxed text-ink-muted">
                    <b>Demo notice:</b> viewing records live in this browser only. Statuses
                    (completed / no-show / cancelled) help you keep the pipeline honest — they are
                    not shared with agencies in this build.
                  </p>
                </div>
              </div>
            </div>
          </m.section>
        )}
      </div>
    </div>
  );
}

function ViewingRow({
  viewing,
  inventory,
  onStatus,
}: {
  viewing: Viewing;
  inventory: ReturnType<typeof marketInventory>;
  onStatus: (id: string, status: Viewing['status']) => void;
}) {
  const prop = findProperty(inventory, viewing.propertyId);
  return (
    <div className="card-luxe p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[200px] flex-1">
          {prop ? (
            <Link
              to={`/properties/${prop.id}`}
              className="text-sm font-bold text-ink hover:text-gold-700"
            >
              {prop.title}
            </Link>
          ) : (
            <p className="text-sm font-bold text-ink">{viewing.propertyId}</p>
          )}
          <p className="mt-0.5 text-xs text-ink-muted">
            {viewing.leadName} · {formatWhen(viewing.scheduledFor)}
          </p>
          {viewing.note ? (
            <p className="mt-1.5 rounded-lg bg-gold-50 px-3 py-1.5 text-xs text-ink-soft">
              {viewing.note}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_ACTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => onStatus(viewing.id, s.value)}
              className="min-h-[40px] rounded-full border border-gold-200 px-3.5 py-1.5 text-[11px] font-semibold text-gold-700 transition hover:border-gold-400 hover:bg-gold-50"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
