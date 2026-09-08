/**
 * Diaspora Hub (/diaspora) — for Kenyans abroad (UK / US / UAE corridors)
 * buying and managing property back home.
 *
 * Four tabs: Remote viewing (scheduling with live cross-timezone
 * conversion), Purchase journey (8-step remote-buy timeline with persisted
 * status), Money & FX (corridor demo rates anchored on FX_KES_PER_USD +
 * remittance channel comparison) and the PoA checklist. State persists
 * locally under 'keja:diaspora'.
 *
 * HONESTY: everything is demo tooling with visible labels — no legal, tax
 * or remittance advice; professionals handle the real thing.
 */
import { m } from 'framer-motion';
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock,
  Info,
  MapPin,
  PlayCircle,
  RotateCcw,
  Route,
  ShieldCheck,
  Trash2,
  Users,
  Video,
} from 'lucide-react';
import { useState } from 'react';

import {
  compareRemitChannels,
  convertSlot,
  CORRIDOR_FX_DEMO,
  diasporaTimezones,
  type JourneyStepStatus,
  nextJourneyStatus,
  POA_TASKS,
  poaProgressPct,
  type RemitCorridor,
  type RemitPlan,
  useDiaspora,
  type ViewingSlot,
} from '@/lib/diasporaStore';
import { formatKES, formatNumber, timeAgo } from '@/lib/format';
import { usePageMeta } from '@/lib/seo';

type TabKey = 'viewing' | 'journey' | 'money' | 'poa';

const TABS: { key: TabKey; label: string; icon: typeof Video }[] = [
  { key: 'viewing', label: 'Remote viewing', icon: Video },
  { key: 'journey', label: 'Purchase journey', icon: Route },
  { key: 'money', label: 'Money & FX', icon: Banknote },
  { key: 'poa', label: 'PoA checklist', icon: ClipboardCheck },
];

const VIEWING_AREAS = [
  'Kilimani',
  'Westlands',
  'Karen',
  'Lavington',
  'Syokimau',
  'Kitengela',
  'Ruaka',
  'Nyali',
  'Diani',
];

const JOURNEY_STEPS: { id: string; title: string; guidance: string }[] = [
  {
    id: 'jr-verify-call',
    title: 'Diaspora verification call',
    guidance:
      'A video call with the Keja desk verifies your identity, budget and intentions before anything moves. You get a written summary and a named contact, so every later step has a paper trail. This is the trust anchor for the whole remote purchase.',
  },
  {
    id: 'jr-reserve-escrow',
    title: 'Reservation + deposit via escrow-style partner account',
    guidance:
      'Your reservation deposit is held in a monitored partner account rather than sent straight to a seller, and released only against documented milestones. Your lawyer should confirm the actual account controls before any transfer — this demo describes the shape, not a specific product.',
  },
  {
    id: 'jr-poa-notary',
    title: 'PoA notarised at Kenyan embassy',
    guidance:
      'A Power of Attorney lets your Kenyan lawyer sign and act on your behalf. It is drafted by the lawyer, then signed and notarised at a Kenyan embassy or consulate near you. Keep the scope narrow — limit it to this one transaction.',
  },
  {
    id: 'jr-title-search',
    title: 'Title search on Ardhisasa',
    guidance:
      'Your lawyer runs an official search on the Ardhisasa land registry system and pulls the registry index map and green card. This confirms the registered owner, encumbrances and whether the parcel is flagged for public infrastructure. Never rely on a seller-supplied copy alone.',
  },
  {
    id: 'jr-valuation',
    title: 'Valuation + inspection (video)',
    guidance:
      'An independent valuer prices the property while a Keja inspector walks it on live video so you can ask questions in real time. You receive written valuation and inspection reports — including defects that should move the price — before you commit.',
  },
  {
    id: 'jr-offer',
    title: 'Offer & agreement',
    guidance:
      'Your lawyer negotiates and drafts the sale agreement around the valuation, deposit schedule and completion date; you review and sign remotely. The deposit and default terms in that agreement are what protect you if the seller walks away.',
  },
  {
    id: 'jr-stamp-registration',
    title: 'Stamp duty + registration',
    guidance:
      'Stamp duty is paid and the transfer is registered at the lands registry, moving legal ownership to you (urban rates are commonly quoted around 4% of price — REPORTED, confirm current rates). Your lawyer confirms registration and sends the registered transfer and title particulars.',
  },
  {
    id: 'jr-handover',
    title: 'Handover (keys + meter transfer)',
    guidance:
      'Keys, remotes and utility meter transfers are signed over on completion, and the property can move into Keja management if you want rents collected and remitted. A handover report with photos closes the file.',
  },
];

const panelMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

function SlotStatusChip({ status }: { status: ViewingSlot['status'] }) {
  const tones: Record<ViewingSlot['status'], string> = {
    requested: 'bg-gold-100 text-gold-700',
    confirmed: 'bg-emerald-100 text-emerald-800',
    done: 'bg-ink text-gold-200',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${tones[status]}`}
    >
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 1 — remote viewing                                              */
/* ------------------------------------------------------------------ */

function RemoteViewingTab({
  slots,
  onAdd,
  onAdvance,
  onRemove,
}: {
  slots: ViewingSlot[];
  onAdd: (slot: ViewingSlot) => void;
  onAdvance: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [timeEAT, setTimeEAT] = useState('18:00');
  const [zoneIana, setZoneIana] = useState('Europe/London');
  const [areas, setAreas] = useState<string[]>([]);
  const [inspector, setInspector] = useState('');
  const [callLink, setCallLink] = useState('');

  const zoneLabel = diasporaTimezones.find((z) => z.iana === zoneIana)?.label ?? zoneIana;
  const localTime = convertSlot(date, timeEAT, zoneIana);
  const canSubmit = date !== '' && timeEAT !== '' && areas.length > 0;

  const toggleArea = (a: string) =>
    setAreas((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const submit = () => {
    if (!canSubmit) return;
    onAdd({
      id: newId('slot'),
      date,
      timeEAT,
      areas,
      inspectorName: inspector.trim() || 'Keja field partner (demo)',
      videoCallLink: callLink.trim() || undefined,
      status: 'requested',
    });
    setAreas([]);
    setCallLink('');
  };

  return (
    <div className="space-y-6">
      <m.div {...panelMotion} className="card-luxe p-6 sm:p-8">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <Video className="h-5 w-5 text-gold-600" /> Book a video walk-through
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Your inspector walks the property live on a video call while you ask questions from
          London, New York or Dubai. Nairobi slots below convert into your local time automatically
          — cross-day shifts are flagged so you never book the wrong calendar day.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="vw-date" className="label-luxe">
              <CalendarDays className="mr-1 inline h-3.5 w-3.5 text-gold-600" /> Date
            </label>
            <input
              id="vw-date"
              type="date"
              className="input-luxe"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="vw-time" className="label-luxe">
              <Clock className="mr-1 inline h-3.5 w-3.5 text-gold-600" /> Time (Nairobi — EAT)
            </label>
            <input
              id="vw-time"
              type="time"
              className="input-luxe"
              value={timeEAT}
              onChange={(e) => setTimeEAT(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="vw-zone" className="label-luxe">
              Your time zone
            </label>
            <select
              id="vw-zone"
              className="input-luxe"
              value={zoneIana}
              onChange={(e) => setZoneIana(e.target.value)}
            >
              {diasporaTimezones.map((z) => (
                <option key={z.iana} value={z.iana}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="vw-inspector" className="label-luxe">
              <Users className="mr-1 inline h-3.5 w-3.5 text-gold-600" /> Inspector (optional)
            </label>
            <input
              id="vw-inspector"
              className="input-luxe"
              placeholder="Keja field partner (demo)"
              value={inspector}
              onChange={(e) => setInspector(e.target.value)}
            />
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="label-luxe">
            <MapPin className="mr-1 inline h-3.5 w-3.5 text-gold-600" /> Areas to view
          </legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {VIEWING_AREAS.map((a) => {
              const active = areas.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleArea(a)}
                  className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                    active
                      ? 'border-gold-600 bg-gold-50 text-gold-700'
                      : 'border-gold-200 bg-white text-ink-muted hover:border-gold-400'
                  }`}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-5">
          <label htmlFor="vw-link" className="label-luxe">
            Video call link (optional)
          </label>
          <input
            id="vw-link"
            className="input-luxe"
            placeholder="https://meet.example.com/keja-demo"
            value={callLink}
            onChange={(e) => setCallLink(e.target.value)}
          />
        </div>

        <div className="mt-6 rounded-xl bg-gold-50 p-4 text-sm leading-relaxed text-ink-soft">
          <b>{timeEAT} EAT</b> on {date || '—'} shows as{' '}
          <b className="text-gold-700">{localTime}</b> in {zoneLabel}.
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={submit} disabled={!canSubmit} className="btn-gold">
            Request video walk-through <ArrowRight className="h-4 w-4" />
          </button>
          {!canSubmit ? (
            <p className="text-xs text-ink-faint">Pick a date, a time and at least one area.</p>
          ) : null}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
          Demo scheduling — nothing is booked with a real inspector; slots are saved on this device
          only. Real bookings route through the Keja desk on WhatsApp.
        </p>
      </m.div>

      <div className="grid gap-4 sm:grid-cols-2">
        {slots.length === 0 ? (
          <m.p {...panelMotion} className="card-luxe p-6 text-sm text-ink-muted sm:col-span-2">
            No walk-throughs booked yet — schedule your first video viewing above.
          </m.p>
        ) : (
          slots.map((slot) => (
            <m.article key={slot.id} {...panelMotion} className="card-luxe p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-display text-base font-bold text-ink">
                    {slot.date} · {slot.timeEAT} EAT
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">with {slot.inspectorName}</p>
                </div>
                <SlotStatusChip status={slot.status} />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {diasporaTimezones.map((z) => (
                  <span key={z.iana} className="chip !text-[10px]">
                    {z.label}: {convertSlot(slot.date, slot.timeEAT, z.iana)}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {slot.areas.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-2.5 py-1 text-[10px] font-semibold text-ink-soft"
                  >
                    <MapPin className="h-3 w-3 text-gold-600" /> {a}
                  </span>
                ))}
              </div>

              {slot.videoCallLink ? (
                <p className="mt-3 flex items-center gap-1.5 truncate text-xs font-semibold text-gold-700">
                  <PlayCircle className="h-3.5 w-3.5 shrink-0" /> {slot.videoCallLink}
                </p>
              ) : null}

              <div className="mt-4 flex items-center gap-2">
                {slot.status !== 'done' ? (
                  <button
                    type="button"
                    onClick={() => onAdvance(slot.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gold-500/60 px-3.5 py-2 text-xs font-semibold text-gold-700 transition hover:bg-gold-50 focus-visible:ring-2 focus-visible:ring-gold-300"
                  >
                    {slot.status === 'requested' ? 'Confirm slot' : 'Mark walked'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onRemove(slot.id)}
                  aria-label={`Delete viewing on ${slot.date}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-gold-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </m.article>
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 2 — purchase journey                                            */
/* ------------------------------------------------------------------ */

function JourneyTab({
  journey,
  onToggle,
}: {
  journey: Record<string, JourneyStepStatus>;
  onToggle: (stepId: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(JOURNEY_STEPS[0]?.id ?? null);
  const doneCount = JOURNEY_STEPS.filter((s) => journey[s.id] === 'done').length;

  const statusChip = (status: JourneyStepStatus) => {
    if (status === 'done') return 'bg-emerald-100 text-emerald-800';
    if (status === 'next') return 'bg-gold-gradient text-white shadow-gold-sm';
    return 'bg-cream-deep text-ink-muted';
  };

  return (
    <m.div {...panelMotion} className="card-luxe p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <Route className="h-5 w-5 text-gold-600" /> The remote purchase journey
        </h2>
        <span className="chip">
          {doneCount}/{JOURNEY_STEPS.length} done — saved on this device
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Eight steps from first verification call to keys in hand. Tap a step to expand the guidance;
        the status button cycles untouched → next → done and is remembered.
      </p>

      <ol className="mt-6 space-y-4">
        {JOURNEY_STEPS.map((step, i) => {
          const status: JourneyStepStatus = journey[step.id] ?? 'untouched';
          const isOpen = expanded === step.id;
          return (
            <li key={step.id} className="relative flex gap-4">
              {i < JOURNEY_STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute left-[1.375rem] top-12 h-[calc(100%-1.5rem)] w-px bg-gold-200"
                />
              ) : null}
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ring-1 ${
                  status === 'done'
                    ? 'bg-emerald-600 text-white ring-emerald-600'
                    : status === 'next'
                      ? 'bg-gold-gradient text-white shadow-gold-sm ring-gold-500'
                      : 'bg-white text-ink-muted ring-gold-200'
                }`}
                aria-hidden
              >
                {status === 'done' ? <Check className="h-5 w-5" /> : i + 1}
              </span>
              <div className="card-luxe min-w-0 flex-1 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : step.id)}
                    aria-expanded={isOpen}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <h3 className="flex-1 font-display text-sm font-bold text-ink sm:text-base">
                      {step.title}
                    </h3>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-gold-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusChip(status)}`}
                  >
                    {status}
                  </span>
                </div>
                {isOpen ? (
                  <div className="mt-3 border-t border-gold-100 pt-3">
                    <p className="text-xs leading-relaxed text-ink-muted sm:text-sm">
                      {step.guidance}
                    </p>
                    <button
                      type="button"
                      onClick={() => onToggle(step.id)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gold-50 px-3.5 py-2 text-xs font-semibold text-gold-700 transition hover:bg-gold-100 focus-visible:ring-2 focus-visible:ring-gold-300"
                    >
                      Status: {status} — advance
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </m.div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 3 — money & FX                                                  */
/* ------------------------------------------------------------------ */

function MoneyTab({
  plans,
  onSavePlan,
  onRemovePlan,
}: {
  plans: RemitPlan[];
  onSavePlan: (plan: RemitPlan) => void;
  onRemovePlan: (id: string) => void;
}) {
  const [amountUsd, setAmountUsd] = useState(5_000);
  const [corridor, setCorridor] = useState<RemitCorridor>('UK');
  const [frequency, setFrequency] = useState<RemitPlan['frequency']>('once');

  const quotes = compareRemitChannels(amountUsd, corridor);
  const bestNet = quotes[0]?.netKes ?? 0;

  return (
    <div className="space-y-6">
      <m.div {...panelMotion} className="grid gap-4 sm:grid-cols-3">
        {CORRIDOR_FX_DEMO.map((c) => (
          <div key={c.corridor} className="card-luxe p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gold-700">
              {c.corridor} corridor
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-ink">
              1 {c.currency} ≈ {formatKES(c.kesPerUnit)}
            </p>
            <p className="mt-1 text-[11px] text-ink-faint">{c.basis}</p>
            <span className="chip mt-3 !text-[10px]">indicative — ESTIMATE</span>
          </div>
        ))}
      </m.div>

      <m.div {...panelMotion} className="card-luxe p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <Banknote className="h-5 w-5 text-gold-600" /> Remittance cost comparison
          </h2>
          <span className="chip">typical fee models — ESTIMATE</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Compare what lands in Kenya across three typical channels. The USD anchor is the app-wide
          FX rate; fee shapes are typical models — verify with your provider.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="remit-amount" className="label-luxe">
              Amount (USD)
            </label>
            <input
              id="remit-amount"
              type="number"
              min={0}
              step={100}
              className="input-luxe"
              value={amountUsd}
              onChange={(e) => setAmountUsd(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <div>
            <label htmlFor="remit-corridor" className="label-luxe">
              Corridor
            </label>
            <select
              id="remit-corridor"
              className="input-luxe"
              value={corridor}
              onChange={(e) => setCorridor(e.target.value as RemitCorridor)}
            >
              <option value="UK">UK</option>
              <option value="US">US</option>
              <option value="UAE">UAE</option>
            </select>
          </div>
          <div>
            <label htmlFor="remit-frequency" className="label-luxe">
              Frequency
            </label>
            <select
              id="remit-frequency"
              className="input-luxe"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as RemitPlan['frequency'])}
            >
              <option value="once">One-off</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        <ul className="mt-6 space-y-3">
          {quotes.map((q, rank) => {
            const barPct = bestNet > 0 ? Math.round((q.netKes / bestNet) * 100) : 0;
            return (
              <li key={q.channel.id} className="rounded-xl bg-cream/70 p-4 ring-1 ring-gold-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-bold text-ink">
                    {q.channel.label}
                    {rank === 0 ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Best net — ESTIMATE
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-ink-muted">
                    fee ${q.feeUsd.toFixed(2)} ({(q.channel.pctFee * 100).toFixed(1)}% + $
                    {q.channel.fixedFeeUsd})
                  </p>
                </div>
                <p className="mt-2 font-display text-lg font-bold text-gold-700">
                  {formatKES(Math.round(q.netKes))}
                  <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                    net to Kenya
                  </span>
                </p>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-gold-100"
                  role="presentation"
                >
                  <div
                    className={`h-full rounded-full ${rank === 0 ? 'bg-emerald-500' : 'bg-gold-400'}`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-[11px] leading-relaxed text-ink-muted">
          Typical fee models — ESTIMATE, verify with your provider. The FX anchor is indicative and
          moves with the market.
        </p>

        <div className="mt-5">
          <button
            type="button"
            onClick={() =>
              onSavePlan({
                id: newId('remit'),
                amountUsd,
                corridor,
                frequency,
                createdAt: new Date().toISOString(),
              })
            }
            disabled={amountUsd <= 0}
            className="btn-gold"
          >
            Save this remittance plan
          </button>
        </div>

        {plans.length > 0 ? (
          <ul className="mt-5 space-y-2">
            {plans.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-cream/70 p-3.5 ring-1 ring-gold-100"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">
                    ${formatNumber(p.amountUsd)} → Kenya · {p.corridor} corridor
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    {p.frequency === 'monthly' ? 'Monthly plan' : 'One-off'} · saved{' '}
                    {timeAgo(p.createdAt)} · DEMO
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemovePlan(p.id)}
                  aria-label={`Delete ${p.corridor} remittance plan`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-gold-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </m.div>

      <m.div {...panelMotion} className="card-luxe p-6">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <Info className="h-5 w-5 text-gold-600" /> Repatriating rents
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Rental income paid to a non-resident landlord has historically attracted withholding tax
          in Kenya — commonly reported at 10% or more (REPORTED/ESTIMATE). Rates and treaty
          positions change: <b>confirm current rates with a tax professional</b> before relying on
          any figure here. Keja does not give tax advice.
        </p>
      </m.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 4 — PoA checklist                                               */
/* ------------------------------------------------------------------ */

function PoaTab({
  taskIds,
  onToggle,
  onRestart,
}: {
  taskIds: string[];
  onToggle: (taskId: string) => void;
  onRestart: () => void;
}) {
  const done = POA_TASKS.filter((t) => taskIds.includes(t.id)).length;
  const pct = poaProgressPct(taskIds);

  return (
    <m.div {...panelMotion} className="card-luxe p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <ClipboardCheck className="h-5 w-5 text-gold-600" /> Power of Attorney checklist
        </h2>
        <span className="chip">DEMO — not legal advice</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        The nine steps from embassy appointment to registry registration. Your lawyer drafts the PoA
        and confirms the current requirements — this list keeps you oriented.
      </p>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
          <span>
            {done} of {POA_TASKS.length} complete
          </span>
          <span>{pct}%</span>
        </div>
        <div
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-gold-100"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="PoA checklist progress"
        >
          <div
            className="h-full rounded-full bg-gold-gradient transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="mt-6 space-y-2">
        {POA_TASKS.map((task) => {
          const isDone = taskIds.includes(task.id);
          return (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => onToggle(task.id)}
                aria-pressed={isDone}
                className="flex w-full items-start gap-3 rounded-xl bg-cream/70 p-4 text-left ring-1 ring-gold-100 transition hover:ring-gold-300 focus-visible:ring-2 focus-visible:ring-gold-300"
              >
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                    isDone
                      ? 'border-gold-600 bg-gold-gradient text-white'
                      : 'border-gold-300 bg-white'
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" /> : null}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-sm font-bold ${isDone ? 'text-ink-muted line-through' : 'text-ink'}`}
                  >
                    {task.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                    {task.hint}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button type="button" onClick={onRestart} className="btn-outline mt-6 !px-4 !py-2.5 !text-xs">
        <RotateCcw className="h-3.5 w-3.5" /> Restart checklist
      </button>
    </m.div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function DiasporaHub() {
  usePageMeta(
    'Diaspora Hub — Buy & Manage Property in Kenya from Abroad',
    'Remote video viewings, an escrow-style purchase journey, Power of Attorney checklist and FX/remittance comparison for Kenyans in the UK, US and UAE.'
  );
  const [tab, setTab] = useState<TabKey>('viewing');
  const [diaspora, setDiaspora] = useDiaspora();

  const slots = diaspora.slots ?? [];
  const poaTaskIds = diaspora.poa?.taskIds ?? [];
  const journey = diaspora.journey ?? {};
  const remitPlans = diaspora.remitPlans ?? [];

  const addSlot = (slot: ViewingSlot) =>
    setDiaspora((prev) => ({ ...prev, slots: [slot, ...(prev.slots ?? [])] }));
  const advanceSlot = (id: string) =>
    setDiaspora((prev) => ({
      ...prev,
      slots: (prev.slots ?? []).map((s) =>
        s.id === id ? { ...s, status: s.status === 'requested' ? 'confirmed' : 'done' } : { ...s }
      ),
    }));
  const removeSlot = (id: string) =>
    setDiaspora((prev) => ({ ...prev, slots: (prev.slots ?? []).filter((s) => s.id !== id) }));

  const toggleJourney = (stepId: string) =>
    setDiaspora((prev) => {
      const current = prev.journey?.[stepId] ?? 'untouched';
      return {
        ...prev,
        journey: { ...(prev.journey ?? {}), [stepId]: nextJourneyStatus(current) },
      };
    });

  const togglePoaTask = (taskId: string) =>
    setDiaspora((prev) => {
      const ids = prev.poa?.taskIds ?? [];
      return {
        ...prev,
        poa: {
          taskIds: ids.includes(taskId) ? ids.filter((t) => t !== taskId) : [...ids, taskId],
        },
      };
    });
  const restartPoa = () => setDiaspora((prev) => ({ ...prev, poa: { taskIds: [] } }));

  const saveRemitPlan = (plan: RemitPlan) =>
    setDiaspora((prev) => ({ ...prev, remitPlans: [plan, ...(prev.remitPlans ?? [])] }));
  const removeRemitPlan = (id: string) =>
    setDiaspora((prev) => ({
      ...prev,
      remitPlans: (prev.remitPlans ?? []).filter((p) => p.id !== id),
    }));

  return (
    <div>
      <section className="bg-ink py-16 sm:py-20">
        <div className="container-luxe max-w-3xl text-center">
          <p className="eyebrow !text-gold-400">For Kenyans abroad</p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            Diaspora <span className="gold-text">hub</span>
          </h1>
          <p className="mt-6 leading-relaxed text-white/65">
            UK · US · UAE — buy and manage property back home without flying in. Remote video
            viewings, an escrow-style purchase journey, Power of Attorney, FX and rent repatriation
            — with honest labels on everything.
          </p>
        </div>
      </section>

      <div className="border-b border-gold-100 bg-gold-50">
        <div className="container-luxe flex items-start gap-3 py-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
          <p className="text-xs leading-relaxed text-ink-soft">
            <b>Built for Kenyans abroad.</b> Demo tooling — no legal, tax or remittance advice;
            professionals handle the real thing (that boundary is by design).
          </p>
        </div>
      </div>

      <div className="sticky top-16 sticky-banner-shift z-30 border-b border-gold-100 bg-white/95 backdrop-blur-md">
        <div className="container-luxe no-scrollbar flex items-center gap-1 overflow-x-auto py-2.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
                tab === t.key
                  ? 'bg-gold-50 text-gold-700'
                  : 'text-ink-soft hover:bg-gold-50/60 hover:text-gold-700'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container-luxe bg-cream/60 py-8 sm:py-10">
        {tab === 'viewing' ? (
          <RemoteViewingTab
            slots={slots}
            onAdd={addSlot}
            onAdvance={advanceSlot}
            onRemove={removeSlot}
          />
        ) : null}
        {tab === 'journey' ? <JourneyTab journey={journey} onToggle={toggleJourney} /> : null}
        {tab === 'money' ? (
          <MoneyTab plans={remitPlans} onSavePlan={saveRemitPlan} onRemovePlan={removeRemitPlan} />
        ) : null}
        {tab === 'poa' ? (
          <PoaTab taskIds={poaTaskIds} onToggle={togglePoaTask} onRestart={restartPoa} />
        ) : null}
      </div>
    </div>
  );
}
