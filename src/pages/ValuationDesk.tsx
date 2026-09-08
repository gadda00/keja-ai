import { m } from 'framer-motion';
import { AlertTriangle, Calculator, Info, MessageCircle, Printer, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import TrustBadge from '@/components/property/TrustBadge';
import { whatsappLink } from '@/config';
import { track } from '@/lib/analytics';
import { formatKES, timeAgo } from '@/lib/format';
import { marketInventory } from '@/lib/inventory';
import { usePageMeta } from '@/lib/seo';
import type { SavedValuation, ValuationCondition, ValuationType } from '@/lib/valuationStore';
import {
  computeIndicativeValuation,
  newValuationId,
  useSavedValuations,
} from '@/lib/valuationStore';

const TYPES: { value: ValuationType; label: string }[] = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'bungalow', label: 'Bungalow' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
];

const CONDITIONS: { value: ValuationCondition; label: string; hint: string }[] = [
  { value: 'new', label: 'New / renovated', hint: '+5%' },
  { value: 'good', label: 'Good — maintained', hint: '±0%' },
  { value: 'needs-work', label: 'Needs work', hint: '−12%' },
];

const CONFIDENCE_STYLES: Record<'low' | 'medium' | 'high', string> = {
  low: 'bg-amber-100 text-amber-700',
  medium: 'bg-gold-100 text-gold-800',
  high: 'bg-emerald-100 text-emerald-700',
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45 },
};

const numVal = (raw: string): number => {
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? 0 : n;
};

const savedLabel = (s: SavedValuation): string => {
  const bits = [s.inputs.type, s.inputs.area];
  if (s.inputs.beds !== undefined) bits.push(`${s.inputs.beds} bed`);
  if (s.inputs.sizeSqM !== undefined) bits.push(`${s.inputs.sizeSqM} sqm`);
  if (s.inputs.acres !== undefined) bits.push(`${s.inputs.acres} acres`);
  return bits.join(' · ');
};

export default function ValuationDesk() {
  usePageMeta(
    'Valuation Desk — Indicative Price Bands from Live Comparables',
    'Self-serve indicative valuation estimates from live Keja inventory comparables — clearly not a licensed valuation. Formal valuations are escalated to humans.'
  );

  const [saved, setSaved] = useSavedValuations();
  const [area, setArea] = useState('Kilimani');
  const [type, setType] = useState<ValuationType>('apartment');
  const [beds, setBeds] = useState(3);
  const [size, setSize] = useState(120);
  const [acres, setAcres] = useState(1);
  const [condition, setCondition] = useState<ValuationCondition>('good');
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const inventory = useMemo(() => marketInventory(), []);
  const areas = useMemo(() => [...new Set(inventory.map((p) => p.area))].sort(), [inventory]);

  const inputs = useMemo(
    () => ({
      area,
      type,
      beds: type !== 'land' && beds > 0 ? beds : undefined,
      sizeSqM: type !== 'land' && size > 0 ? size : undefined,
      acres: type === 'land' && acres > 0 ? acres : undefined,
      condition,
    }),
    [area, type, beds, size, acres, condition]
  );

  const result = useMemo(() => computeIndicativeValuation(inputs, inventory), [inputs, inventory]);
  const compsShown = useMemo(() => (result ? result.comps.slice(0, 8) : []), [result]);

  const handoffHref = whatsappLink(
    `Hi Keja, I'd like a formal (human) valuation for a ${type} in ${area}${
      type === 'land' && acres > 0 ? ` (${acres} acres)` : ''
    }. The indicative desk found ${result ? `${result.compCount} comparables` : 'too few comparables'} — please connect me with a licensed valuer.`
  );

  const compare = saved.filter((s) => compareIds.includes(s.id));

  const saveValuation = () => {
    if (!result) return;
    const record: SavedValuation = {
      id: newValuationId(),
      createdAt: new Date().toISOString(),
      inputs,
      lowKes: result.lowKes,
      medianKes: result.medianKes,
      highKes: result.highKes,
      confidence: result.confidence,
      compCount: result.compCount,
    };
    setSaved((prev) => [record, ...prev]);
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 2 ? prev : [...prev, id]
    );
  };

  const deleteSaved = (id: string) => {
    setSaved((prev) => prev.filter((s) => s.id !== id));
    setCompareIds((prev) => prev.filter((x) => x !== id));
  };

  const needsAcreage = type === 'land' && acres <= 0;

  return (
    <div className="bg-cream/60">
      <div className="container-luxe py-10 sm:py-14">
        {/* header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Self-serve · ESTIMATE tool</p>
          <h1 className="heading-display mt-3 text-3xl sm:text-5xl">
            Valuation <span className="gold-text">desk</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
            An honest price band from live Keja inventory comparables — the same evidence the chat
            engine cites, with the confidence level and the limits shown in plain sight.
          </p>
        </div>

        {/* honesty notice */}
        <div
          role="note"
          className="mx-auto mt-8 max-w-3xl rounded-2xl border border-gold-300 bg-gold-50 p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gold-700" />
            <p className="text-xs leading-relaxed text-ink-soft sm:text-sm">
              <b>
                Indicative estimates from live inventory comparables — not a licensed valuation.
              </b>{' '}
              Keja AI escalates formal valuations to humans by design; this desk exists so you never
              mistake an estimate for one.
            </p>
          </div>
        </div>

        {/* stat cards */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { label: 'Live listings', value: inventory.length, sub: 'in the comparables pool' },
            { label: 'Areas covered', value: areas.length, sub: 'with sale inventory' },
            { label: 'Saved estimates', value: saved.length, sub: 'on this device' },
          ].map((s) => (
            <div key={s.label} className="card-luxe p-4">
              <Calculator className="h-5 w-5 text-gold-600" />
              <p className="mt-2 font-display text-2xl font-bold text-ink">{s.value}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                {s.label}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-muted">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,400px)_1fr]">
          {/* subject form */}
          <div className="card-luxe space-y-5 p-6 print:hidden">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                <Calculator className="h-5 w-5 text-gold-600" /> Subject property
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                Comparables come from live sale listings in the same area and type. Rentals and
                price-on-application listings are excluded automatically.
              </p>
            </div>
            <div>
              <label htmlFor="vd-area" className="label-luxe">
                Area
              </label>
              <select
                id="vd-area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
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
              <label htmlFor="vd-type" className="label-luxe">
                Property type
              </label>
              <select
                id="vd-type"
                value={type}
                onChange={(e) => setType(e.target.value as ValuationType)}
                className="input-luxe"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            {type === 'land' ? (
              <div>
                <label htmlFor="vd-acres" className="label-luxe">
                  Acreage (acres — required for land)
                </label>
                <input
                  id="vd-acres"
                  type="number"
                  min={0}
                  step={0.25}
                  value={acres}
                  onChange={(e) => setAcres(numVal(e.target.value))}
                  className="input-luxe"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="vd-beds" className="label-luxe">
                    Bedrooms (0 = skip)
                  </label>
                  <input
                    id="vd-beds"
                    type="number"
                    min={0}
                    max={10}
                    value={beds}
                    onChange={(e) => setBeds(numVal(e.target.value))}
                    className="input-luxe"
                  />
                </div>
                <div>
                  <label htmlFor="vd-size" className="label-luxe">
                    Size (sqm)
                  </label>
                  <input
                    id="vd-size"
                    type="number"
                    min={0}
                    max={100000}
                    value={size}
                    onChange={(e) => setSize(numVal(e.target.value))}
                    className="input-luxe"
                  />
                </div>
              </div>
            )}
            <div>
              <span className="label-luxe">Condition (ESTIMATE assumption)</span>
              <div className="grid grid-cols-3 gap-2">
                {CONDITIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={condition === c.value}
                    onClick={() => setCondition(c.value)}
                    className={`min-h-[56px] rounded-xl border p-2 text-center transition ${
                      condition === c.value
                        ? 'border-gold-400 bg-gold-50'
                        : 'border-gold-100 bg-white hover:border-gold-300'
                    }`}
                  >
                    <p className="text-[11px] font-bold leading-tight text-ink">{c.label}</p>
                    <p className="mt-0.5 text-[10px] font-semibold text-gold-700">{c.hint}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* results */}
          <div className="space-y-6" aria-live="polite">
            {needsAcreage ? (
              <div className="card-luxe flex items-start gap-3 p-6">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
                <p className="text-sm leading-relaxed text-ink-soft">
                  Land is valued on a <b>price-per-acre</b> basis — enter the acreage of your plot
                  to get an indicative band.
                </p>
              </div>
            ) : null}

            {!needsAcreage && !result && (
              <div className="card-luxe p-6">
                <h3 className="font-display text-lg font-bold text-ink">
                  Not enough comparables in this area yet
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  No sale listings match <span className="capitalize">{type}</span> in {area} right
                  now. Rather than invent a number, we&rsquo;ll say it straight: this estimate needs
                  a human.
                </p>
                <a
                  href={handoffHref}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    track({
                      event: 'human_handoff',
                      channel: 'whatsapp',
                      context: 'valuation-desk',
                    })
                  }
                  className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                >
                  <MessageCircle className="h-4 w-4" /> Request a human valuation on WhatsApp
                </a>
              </div>
            )}

            {result ? (
              <m.div {...fadeUp} className="card-luxe p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-bold text-ink">Indicative value</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="chip">ESTIMATE</span>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${CONFIDENCE_STYLES[result.confidence]}`}
                    >
                      {result.confidence} confidence
                    </span>
                  </div>
                </div>

                <p className="mt-4 font-display text-4xl font-bold text-ink sm:text-5xl">
                  {formatKES(result.medianKes)}
                </p>
                <p className="mt-2 text-sm font-semibold text-gold-700">
                  {formatKES(result.lowKes)} — {formatKES(result.highKes)}
                  <span className="ml-2 font-normal text-ink-muted">
                    ±{Math.round(result.bandPct * 100)}% band · {result.compCount} comps
                  </span>
                </p>

                {/* adjustment breakdown */}
                <div className="mt-6 rounded-2xl bg-cream p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                    How this estimate is built (all ESTIMATE assumptions)
                  </p>
                  <dl className="mt-3 space-y-2.5 text-sm">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-ink-muted">Comparables price median</dt>
                      <dd className="font-semibold text-ink">{formatKES(result.priceMedianKes)}</dd>
                    </div>
                    {result.psqmMedianKes !== undefined && inputs.sizeSqM !== undefined && (
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-ink-muted">
                          Per-sqm basis ({formatKES(result.psqmMedianKes)}/sqm × {inputs.sizeSqM}{' '}
                          sqm)
                        </dt>
                        <dd className="font-semibold text-ink">
                          {formatKES(result.psqmMedianKes * inputs.sizeSqM)}
                        </dd>
                      </div>
                    )}
                    {result.perAcreMedianKes !== undefined && inputs.acres !== undefined && (
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-ink-muted">
                          Per-acre basis ({formatKES(result.perAcreMedianKes)}/acre × {inputs.acres}{' '}
                          acres)
                        </dt>
                        <dd className="font-semibold text-ink">
                          {formatKES(result.unadjustedKes)}
                        </dd>
                      </div>
                    )}
                    {result.basis === 'blend' && (
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-ink-muted">Blended base (60% price / 40% per-sqm)</dt>
                        <dd className="font-semibold text-ink">
                          {formatKES(result.unadjustedKes)}
                        </dd>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-ink-muted">
                        Condition adjustment ({result.conditionAdjustmentPct > 0 ? '+' : ''}
                        {result.conditionAdjustmentPct}% · {condition})
                      </dt>
                      <dd
                        className={`font-semibold ${
                          result.conditionDeltaKes > 0
                            ? 'text-emerald-700'
                            : result.conditionDeltaKes < 0
                              ? 'text-red-600'
                              : 'text-ink'
                        }`}
                      >
                        {result.conditionDeltaKes > 0 ? '+' : ''}
                        {formatKES(Math.abs(result.conditionDeltaKes))}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4 border-t border-gold-200/60 pt-2.5">
                      <dt className="font-semibold text-ink">Indicative median (ESTIMATE)</dt>
                      <dd className="font-display text-base font-bold text-gold-700">
                        {formatKES(result.medianKes)}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-ink-muted">
                        Band width (from {result.compCount} comparables)
                      </dt>
                      <dd className="font-semibold text-ink">
                        ±{Math.round(result.bandPct * 100)}% → {formatKES(result.lowKes)} –{' '}
                        {formatKES(result.highKes)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-5 flex flex-wrap gap-3 print:hidden">
                  <button onClick={saveValuation} className="btn-gold !px-5 !py-2.5 text-xs">
                    Save valuation
                  </button>
                  <a
                    href={handoffHref}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() =>
                      track({
                        event: 'human_handoff',
                        channel: 'whatsapp',
                        context: 'valuation-desk',
                      })
                    }
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-xs font-semibold text-gold-200 transition hover:bg-ink-soft"
                  >
                    <MessageCircle className="h-4 w-4" /> Request formal valuation
                  </a>
                  <button
                    onClick={() => window.print()}
                    className="btn-outline !px-5 !py-2.5 text-xs"
                  >
                    <Printer className="h-4 w-4" /> Print
                  </button>
                </div>

                <p className="mt-4 border-t border-gold-100 pt-3 text-[11px] leading-relaxed text-ink-faint">
                  Indicative estimate from live inventory comparables — not a licensed valuation.
                  Based on asking prices, not transacted prices. Keja AI escalates formal valuations
                  to humans by design.
                </p>
              </m.div>
            ) : null}

            {/* comps used */}
            {compsShown.length > 0 && (
              <div>
                <h3 className="font-display text-lg font-bold text-ink">
                  Comparables used{' '}
                  <span className="text-sm font-normal text-ink-faint">
                    (top {compsShown.length} of {result?.compCount ?? 0} by trust)
                  </span>
                </h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {compsShown.map((p) => (
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
          </div>
        </div>

        {/* saved valuations + compare */}
        {saved.length > 0 && (
          <section className="mt-10 print:hidden" aria-label="Saved valuations">
            <h2 className="font-display text-xl font-bold text-ink">
              Saved estimates ({saved.length})
            </h2>
            <p className="mt-1 text-xs text-ink-faint">
              Select two to compare side-by-side · all figures are ESTIMATES
            </p>
            <div className="mt-4 space-y-2.5">
              {saved.map((s) => {
                const checked = compareIds.includes(s.id);
                const blocked = !checked && compareIds.length >= 2;
                return (
                  <div
                    key={s.id}
                    className={`card-luxe flex flex-wrap items-center gap-3 p-3.5 ${
                      checked ? 'ring-2 ring-gold-300' : ''
                    }`}
                  >
                    <label className="flex min-w-[200px] flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={blocked}
                        onChange={() => toggleCompare(s.id)}
                        aria-label={`Compare ${savedLabel(s)}`}
                        className="h-5 w-5 accent-gold-600 disabled:opacity-40"
                      />
                      <span>
                        <span className="block text-sm font-bold capitalize text-ink">
                          {savedLabel(s)}
                        </span>
                        <span className="block text-xs text-ink-faint">
                          {timeAgo(s.createdAt)} · {s.compCount} comps · {s.confidence} confidence
                        </span>
                      </span>
                    </label>
                    <p className="font-display text-base font-bold text-gold-700">
                      {formatKES(s.medianKes)}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {formatKES(s.lowKes)} – {formatKES(s.highKes)}
                    </p>
                    <button
                      onClick={() => deleteSaved(s.id)}
                      aria-label={`Delete saved valuation ${savedLabel(s)}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gold-100 text-ink-muted transition hover:border-red-200 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {compare.length === 2 && (
              <m.div {...fadeUp} className="card-luxe mt-6 p-6">
                <h3 className="font-display text-lg font-bold text-ink">Side-by-side comparison</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {compare.map((s, i) => (
                    <div
                      key={s.id}
                      className={`rounded-2xl p-4 ${
                        i === 0 ? 'bg-gold-50 ring-1 ring-gold-200' : 'bg-cream'
                      }`}
                    >
                      <p className="text-sm font-bold capitalize text-ink">{savedLabel(s)}</p>
                      <p className="mt-2 font-display text-2xl font-bold text-gold-700">
                        {formatKES(s.medianKes)}
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {formatKES(s.lowKes)} – {formatKES(s.highKes)}
                      </p>
                      <p className="mt-2 text-xs text-ink-soft">
                        {s.compCount} comps · {s.confidence} confidence · condition:{' '}
                        {s.inputs.condition} · saved {timeAgo(s.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
                {(() => {
                  const [a, b] = compare;
                  const diff = a.medianKes - b.medianKes;
                  const pct = (Math.abs(diff) / Math.min(a.medianKes, b.medianKes || 1)) * 100 || 0;
                  return (
                    <p className="mt-4 rounded-xl bg-cream p-3 text-xs leading-relaxed text-ink-soft">
                      Median difference: <b>{formatKES(Math.abs(diff))}</b> ({pct.toFixed(1)}%) —{' '}
                      {Math.abs(diff) < Math.max(a.highKes - a.lowKes, b.highKes - b.lowKes)
                        ? 'within the overlap of the two ESTIMATE bands — treat them as the same signal'
                        : 'outside the overlap of the two ESTIMATE bands — the difference is probably real, but verify with a human'}
                      .
                    </p>
                  );
                })()}
              </m.div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
