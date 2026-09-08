/**
 * Keja Tenant Hub — the renter's side of the platform.
 *
 * Lease tracker with renewal countdown, a multi-step rental application
 * builder (shareable with any Keja partner agency), maintenance requests that
 * demo-route into the Landlord Studio pipeline, and a persisted moving
 * checklist. Everything lives in localStorage ('keja:tenant'); computed
 * affordability/competitiveness reads carry ESTIMATE labels per the honesty
 * policy.
 *
 * Deep links: /tenant?tab=rental|applications|maintenance|moving
 */
import { m } from 'framer-motion';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  ClipboardList,
  Droplets,
  FileText,
  FlaskConical,
  Home,
  Landmark,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Wrench,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { AREAS } from '@/data/properties';
import { calculateAffordability, MORTGAGE_MARKET } from '@/lib/finance';
import { formatKES, timeAgo } from '@/lib/format';
import { usePageMeta } from '@/lib/seo';
import type {
  ApplicationDraftInput,
  Competitiveness,
  MaintenanceRequest,
  RentalApplication,
  RequestCategory,
} from '@/lib/tenantStore';
import {
  applicationSummary,
  competitiveness,
  daysToRenewal,
  daysUntilRentDue,
  isValidKejaPhone,
  MOVING_CHECKLIST,
  nextRequestStatus,
  PREFERRED_TIMES,
  rentDueDay,
  REQUEST_CATEGORIES,
  useTenantStore,
} from '@/lib/tenantStore';

type Tab = 'rental' | 'applications' | 'maintenance' | 'moving';

const TABS: { v: Tab; label: string; icon: typeof Home }[] = [
  { v: 'rental', label: 'My rental', icon: Home },
  { v: 'applications', label: 'Applications', icon: FileText },
  { v: 'maintenance', label: 'Maintenance', icon: Wrench },
  { v: 'moving', label: 'Moving checklist', icon: ClipboardList },
];
const VALID_TABS: Tab[] = ['rental', 'applications', 'maintenance', 'moving'];

type Store = ReturnType<typeof useTenantStore>;

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const ordinal = (day: number) => {
  if (day % 10 === 1 && day !== 11) return `${day}st`;
  if (day % 10 === 2 && day !== 12) return `${day}nd`;
  if (day % 10 === 3 && day !== 13) return `${day}rd`;
  return `${day}th`;
};

/* -------------------------------- My rental ------------------------------- */

function LeaseForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: {
    propertyTitle: string;
    landlordName: string;
    start: string;
    end: string;
    monthlyRentKes: string;
    depositKes: string;
  };
  onSubmit: (lease: {
    propertyTitle: string;
    landlordName: string;
    start: string;
    end: string;
    monthlyRentKes: number;
    depositKes: number;
  }) => void;
  onCancel?: () => void;
}) {
  const [f, setF] = useState(initial);
  const [error, setError] = useState('');
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const submit = () => {
    if (f.propertyTitle.trim().length < 3) {
      setError('Property name is required (at least 3 characters).');
      return;
    }
    if (f.landlordName.trim().length < 2) {
      setError('Landlord / agency name is required.');
      return;
    }
    if (!DATE_RE.test(f.start) || !DATE_RE.test(f.end) || f.start >= f.end) {
      setError('Lease dates must be valid, with the end after the start.');
      return;
    }
    if (!(Number(f.monthlyRentKes) > 0)) {
      setError('Monthly rent must be greater than zero.');
      return;
    }
    if (!(Number(f.depositKes) >= 0)) {
      setError('Deposit cannot be negative.');
      return;
    }
    setError('');
    onSubmit({
      propertyTitle: f.propertyTitle.trim(),
      landlordName: f.landlordName.trim(),
      start: f.start,
      end: f.end,
      monthlyRentKes: Math.round(Number(f.monthlyRentKes)),
      depositKes: Math.round(Number(f.depositKes) || 0),
    });
  };

  return (
    <div className="card-luxe p-6">
      <h3 className="font-display text-lg font-bold text-ink">Add my lease</h3>
      <p className="mt-1 text-sm text-ink-muted">
        From your lease agreement — stays on this device (demo data).
      </p>
      <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="lease-title" className="label-luxe">
            Property
          </label>
          <input
            id="lease-title"
            type="text"
            value={f.propertyTitle}
            onChange={(e) => set('propertyTitle', e.target.value)}
            placeholder="e.g. Furnished 1BR — Kileleshwa"
            className="input-luxe"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="lease-landlord" className="label-luxe">
            Landlord / agency
          </label>
          <input
            id="lease-landlord"
            type="text"
            value={f.landlordName}
            onChange={(e) => set('landlordName', e.target.value)}
            placeholder="e.g. Nairobi Habitat Realtors"
            className="input-luxe"
          />
        </div>
        <div>
          <label htmlFor="lease-start" className="label-luxe">
            Lease start
          </label>
          <input
            id="lease-start"
            type="date"
            value={f.start}
            onChange={(e) => set('start', e.target.value)}
            className="input-luxe"
          />
        </div>
        <div>
          <label htmlFor="lease-end" className="label-luxe">
            Lease end
          </label>
          <input
            id="lease-end"
            type="date"
            value={f.end}
            onChange={(e) => set('end', e.target.value)}
            className="input-luxe"
          />
        </div>
        <div>
          <label htmlFor="lease-rent" className="label-luxe">
            Monthly rent (KES)
          </label>
          <input
            id="lease-rent"
            type="number"
            min={1}
            step={1000}
            value={f.monthlyRentKes}
            onChange={(e) => set('monthlyRentKes', e.target.value)}
            className="input-luxe"
            inputMode="numeric"
          />
        </div>
        <div>
          <label htmlFor="lease-deposit" className="label-luxe">
            Deposit held (KES)
          </label>
          <input
            id="lease-deposit"
            type="number"
            min={0}
            step={1000}
            value={f.depositKes}
            onChange={(e) => set('depositKes', e.target.value)}
            className="input-luxe"
            inputMode="numeric"
          />
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={submit} className="btn-gold">
          <CheckCircle2 className="h-4 w-4" aria-hidden /> Save lease
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className="btn-outline">
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}

function RentalTab({ store }: { store: Store }) {
  const { data, setLease, clearLease } = store;
  const [editing, setEditing] = useState(false);
  const [incomeStr, setIncomeStr] = useState(() =>
    String(data.applications[0]?.monthlyIncomeKes ?? (data.lease?.monthlyRentKes ?? 65000) * 3)
  );
  const { lease } = data;

  // rent-vs-income read — reuses the shared affordability engine (DTI ceiling)
  const afford = useMemo(
    () =>
      calculateAffordability({
        netMonthlyIncome: Math.max(0, Number(incomeStr) || 0),
        otherMonthlyObligations: 0,
        annualRatePct: MORTGAGE_MARKET.typicalRate,
        termYears: MORTGAGE_MARKET.typicalTerm,
        depositPct: MORTGAGE_MARKET.typicalDepositPct,
      }),
    [incomeStr]
  );

  if (!lease) {
    return (
      <div className="space-y-6">
        <m.div {...fadeUp}>
          <LeaseForm
            initial={{
              propertyTitle: '',
              landlordName: '',
              start: '',
              end: '',
              monthlyRentKes: '',
              depositKes: '',
            }}
            onSubmit={(l) => setLease(l)}
          />
        </m.div>
        <p className="text-center text-xs text-ink-faint">
          No lease on file yet — add yours to unlock the renewal countdown, rent reminders and the
          affordability read.
        </p>
      </div>
    );
  }

  const renewalDays = daysToRenewal(lease.end);
  const dueDay = rentDueDay(lease.start);
  const dueIn = daysUntilRentDue(lease.start);
  const income = Number(incomeStr) || 0;
  const rentShare = income > 0 ? (lease.monthlyRentKes / income) * 100 : 0;
  const withinGuidance = lease.monthlyRentKes <= afford.maxInstalment;
  // bar scale: 0–50% of income, with the 33% DTI ceiling drawn on it
  const barPct = Math.max(0, Math.min(100, (rentShare / 50) * 100));
  const dtiPct = (afford.dtiPct / 50) * 100;

  return (
    <div className="space-y-6">
      <m.div {...fadeUp} className="card-luxe p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Lease tracker</p>
            <h2 className="heading-display mt-2 text-xl sm:text-2xl">{lease.propertyTitle}</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {lease.landlordName} · {lease.start} → {lease.end}
              {lease.propertyId ? (
                <>
                  {' · '}
                  <Link
                    to={`/properties/${lease.propertyId}`}
                    className="font-semibold text-gold-700 hover:underline"
                  >
                    view listing
                  </Link>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-gold-500/60 px-3.5 py-2 text-xs font-semibold text-gold-700 transition-colors hover:bg-gold-50"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
            </button>
            <button
              type="button"
              onClick={clearLease}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-rose-200 px-3.5 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-cream p-4 text-center">
            <p className="font-display text-3xl font-bold text-ink">
              {renewalDays >= 0 ? renewalDays : 0}
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              days to renewal
            </p>
            <p className="mt-1 text-xs text-ink-muted">{lease.end}</p>
          </div>
          <div className="rounded-xl bg-cream p-4 text-center">
            <p className="font-display text-2xl font-bold text-ink">
              {formatKES(lease.monthlyRentKes, { monthly: true })}
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              monthly rent
            </p>
            <p className="mt-1 flex items-center justify-center gap-1 text-xs text-ink-muted">
              <CalendarClock className="h-3.5 w-3.5 text-gold-600" aria-hidden />
              due the {ordinal(dueDay)} · in {dueIn} day{dueIn === 1 ? '' : 's'}
            </p>
          </div>
          <div className="rounded-xl bg-cream p-4 text-center">
            <p className="font-display text-2xl font-bold text-ink">
              {formatKES(lease.depositKes)}
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              deposit held
            </p>
            <p className="mt-1 flex items-center justify-center gap-1 text-xs text-ink-muted">
              <Landmark className="h-3.5 w-3.5 text-gold-600" aria-hidden />
              refundable subject to inspection
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-2">
            {renewalDays < 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Lease ended — regularise now
              </span>
            ) : renewalDays < 60 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Renewal window open — start
                talks
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Lease healthy — {renewalDays}{' '}
                days left
              </span>
            )}
          </div>
        </div>
      </m.div>

      {editing ? (
        <m.div {...fadeUp}>
          <LeaseForm
            initial={{
              propertyTitle: lease.propertyTitle,
              landlordName: lease.landlordName,
              start: lease.start,
              end: lease.end,
              monthlyRentKes: String(lease.monthlyRentKes),
              depositKes: String(lease.depositKes),
            }}
            onSubmit={(l) => {
              setLease(l);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </m.div>
      ) : null}

      <m.div {...fadeUp} className="card-luxe p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <TrendingUp className="h-5 w-5 text-gold-600" aria-hidden /> Rent vs income
          </h3>
          <span className="chip">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden /> ESTIMATE — guidance only
          </span>
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          <div>
            <label htmlFor="income-input" className="label-luxe">
              Your net monthly income (KES)
            </label>
            <input
              id="income-input"
              type="number"
              min={1}
              step={5000}
              value={incomeStr}
              onChange={(e) => setIncomeStr(e.target.value)}
              className="input-luxe"
              inputMode="numeric"
            />
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Reuses Keja&rsquo;s affordability engine: a CBK-style {afford.dtiPct}% DTI ceiling
              supports an instalment of about {formatKES(afford.maxInstalment, { monthly: true })}{' '}
              at {MORTGAGE_MARKET.typicalRate}% over {MORTGAGE_MARKET.typicalTerm} years.
            </p>
          </div>
          <div className="lg:col-span-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-ink-muted">Rent share of income</span>
              <span className="font-display text-xl font-bold text-ink">
                {income > 0 ? `${Math.round(rentShare * 10) / 10}%` : '—'}
              </span>
            </div>
            <div
              className="relative mt-3 h-4 rounded-full bg-cream-deep"
              role="img"
              aria-label={`Rent takes ${Math.round(rentShare)} percent of declared income; the 33 percent DTI guidance line is marked`}
            >
              <div
                className={`absolute inset-y-0 left-0 rounded-full ${
                  withinGuidance ? 'bg-gold-gradient' : 'bg-rose-400'
                }`}
                style={{ width: `${income > 0 ? barPct : 0}%` }}
              />
              <div
                className="absolute inset-y-[-4px] w-0.5 bg-ink/50"
                style={{ left: `${dtiPct}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-ink-faint">
              <span>0%</span>
              <span>DTI ceiling {afford.dtiPct}%</span>
              <span>50% of income</span>
            </div>
            <p
              className={`mt-3 rounded-xl p-3 text-sm leading-relaxed ${
                withinGuidance ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
              }`}
            >
              {income <= 0
                ? 'Enter your income to see the verdict.'
                : withinGuidance
                  ? 'ESTIMATE verdict: comfortable — rent sits inside the 33% DTI-style guidance lenders would apply to a mortgage instalment.'
                  : 'ESTIMATE verdict: above guidance — rent exceeds the 33% DTI-style ceiling. Consider a lower band or negotiate.'}
            </p>
          </div>
        </div>
      </m.div>
    </div>
  );
}

/* ------------------------------ Applications ------------------------------ */

interface FormState {
  fullName: string;
  phone: string;
  email: string;
  employment: RentalApplication['employment'];
  monthlyIncomeKes: string;
  employerName: string;
  areas: string[];
  maxRentKes: string;
  beds: string;
  moveInBy: string;
  refName: string;
  refPhone: string;
  note: string;
}

const EMPTY_FORM: FormState = {
  fullName: '',
  phone: '',
  email: '',
  employment: 'employed',
  monthlyIncomeKes: '',
  employerName: '',
  areas: [],
  maxRentKes: '',
  beds: '1',
  moveInBy: '',
  refName: '',
  refPhone: '',
  note: '',
};

const STEPS = ['Profile', 'Budget & areas', 'Employment & refs', 'Review'] as const;

function buildDraft(f: FormState): ApplicationDraftInput {
  return {
    fullName: f.fullName.trim(),
    phone: f.phone.trim(),
    email: f.email.trim() || undefined,
    employment: f.employment,
    monthlyIncomeKes: Math.round(Number(f.monthlyIncomeKes) || 0),
    employerName: f.employerName.trim() || undefined,
    areas: [...f.areas],
    maxRentKes: Math.round(Number(f.maxRentKes) || 0),
    beds: Math.max(0, Math.floor(Number(f.beds) || 0)),
    moveInBy: f.moveInBy,
    refName: f.refName.trim(),
    refPhone: f.refPhone.trim(),
    note: f.note.trim() || undefined,
  };
}

function stepErrors(step: number, f: FormState): string[] {
  const errors: string[] = [];
  if (step === 1) {
    if (f.fullName.trim().length < 3) errors.push('Full name is required.');
    if (!isValidKejaPhone(f.phone)) errors.push('A valid Kenyan phone number is required.');
    if (f.email && !EMAIL_RE.test(f.email)) errors.push('Email looks invalid.');
  }
  if (step === 2) {
    if (!(Number(f.maxRentKes) > 0)) errors.push('Maximum rent must be greater than zero.');
    if (f.areas.length === 0) errors.push('Pick at least one preferred area.');
    if (!DATE_RE.test(f.moveInBy)) errors.push('Move-in date is required.');
  }
  if (step === 3) {
    if (!(Number(f.monthlyIncomeKes) > 0)) errors.push('Monthly income must be greater than zero.');
    if (f.refName.trim().length < 3) errors.push('Referee name is required.');
    if (!isValidKejaPhone(f.refPhone)) errors.push('A valid referee phone is required.');
  }
  return errors;
}

function CompChip({ read }: { read: Competitiveness }) {
  const style =
    read.verdict === 'strong'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : read.verdict === 'moderate'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-rose-200 bg-rose-50 text-rose-700';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${style}`}
    >
      {read.label} — {Math.round(read.ratio * 100)}% of income
      <span className="text-[9px] font-bold uppercase tracking-wide2 opacity-60">ESTIMATE</span>
    </span>
  );
}

function CopyButton({ text, id }: { text: string; id: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-gold-500/60 px-3.5 py-2 text-xs font-semibold text-gold-700 transition-colors hover:bg-gold-50"
    >
      {copied ? (
        <>
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Copied
        </>
      ) : (
        <>
          <ClipboardCopy className="h-3.5 w-3.5" aria-hidden /> Copy summary
        </>
      )}
      <span className="sr-only">application {id}</span>
    </button>
  );
}

function ApplicationCard({ app }: { app: RentalApplication }) {
  const read = competitiveness(app.monthlyIncomeKes, app.maxRentKes);
  return (
    <m.div {...fadeUp} className="card-luxe card-luxe-hover p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-base font-bold text-ink">{app.fullName}</p>
        <span className="inline-flex items-center rounded-full border border-gold-200 bg-gold-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide2 text-gold-700">
          {app.status}
        </span>
      </div>
      <div className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        <p>
          <span className="text-ink-faint">Phone:</span> <b className="text-ink">{app.phone}</b>
        </p>
        {app.email ? (
          <p>
            <span className="text-ink-faint">Email:</span> <b className="text-ink">{app.email}</b>
          </p>
        ) : null}
        <p>
          <span className="text-ink-faint">Max rent:</span>{' '}
          <b className="text-ink">{formatKES(app.maxRentKes, { monthly: true })}</b>
        </p>
        <p>
          <span className="text-ink-faint">Beds:</span> <b className="text-ink">{app.beds}</b>
        </p>
        <p>
          <span className="text-ink-faint">Areas:</span>{' '}
          <b className="text-ink">{app.areas.join(', ')}</b>
        </p>
        <p>
          <span className="text-ink-faint">Move-in by:</span>{' '}
          <b className="text-ink">{app.moveInBy}</b>
        </p>
        <p>
          <span className="text-ink-faint">Income:</span>{' '}
          <b className="text-ink">{formatKES(app.monthlyIncomeKes, { monthly: true })}</b>
        </p>
        <p>
          <span className="text-ink-faint">Employment:</span>{' '}
          <b className="text-ink">
            {app.employment}
            {app.employerName ? ` — ${app.employerName}` : ''}
          </b>
        </p>
      </div>
      {app.note ? <p className="mt-2 text-sm italic text-ink-muted">“{app.note}”</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <CompChip read={read} />
        <CopyButton text={applicationSummary(app)} id={app.id} />
      </div>
      <p className="mt-3 text-xs text-ink-faint">
        Submitted {timeAgo(app.createdAt)} · ready to share with any Keja partner agency
      </p>
    </m.div>
  );
}

function Builder({ store, onSubmitted }: { store: Store; onSubmitted: () => void }) {
  const { data, saveDraft, submitApplication } = store;
  const [step, setStep] = useState(1);
  const [f, setF] = useState<FormState>(() => {
    const d = data.draft;
    if (!d) return EMPTY_FORM;
    return {
      fullName: d.fullName,
      phone: d.phone,
      email: d.email ?? '',
      employment: d.employment,
      monthlyIncomeKes: String(d.monthlyIncomeKes || ''),
      employerName: d.employerName ?? '',
      areas: [...d.areas],
      maxRentKes: String(d.maxRentKes || ''),
      beds: String(d.beds ?? 1),
      moveInBy: d.moveInBy,
      refName: d.refName,
      refPhone: d.refPhone,
      note: d.note ?? '',
    };
  });
  const [errors, setErrors] = useState<string[]>([]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const toggleArea = (area: string) =>
    setF((prev) => ({
      ...prev,
      areas: prev.areas.includes(area)
        ? prev.areas.filter((a) => a !== area)
        : [...prev.areas, area],
    }));

  const draft = buildDraft(f);
  const read = competitiveness(draft.monthlyIncomeKes, draft.maxRentKes);

  const next = () => {
    const errs = stepErrors(step, f);
    setErrors(errs);
    if (errs.length > 0) return;
    saveDraft(buildDraft(f));
    setStep((s) => Math.min(4, s + 1));
  };

  const back = () => {
    setErrors([]);
    setStep((s) => Math.max(1, s - 1));
  };

  const submit = () => {
    const result = submitApplication(draft);
    if (result.ok) {
      setF(EMPTY_FORM);
      setStep(1);
      setErrors([]);
      onSubmitted();
    } else {
      setErrors(result.errors);
    }
  };

  return (
    <m.div {...fadeUp} className="card-luxe p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold text-ink">Application builder</h3>
        {data.draft ? (
          <span className="chip">Draft saved — resumes automatically</span>
        ) : (
          <span className="text-xs text-ink-faint">4 steps · saved as you go</span>
        )}
      </div>

      {/* step indicator */}
      <ol className="mt-5 flex items-center gap-1" aria-label="Application steps">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const state = n === step ? 'current' : n < step ? 'done' : 'todo';
          return (
            <li key={label} className="flex flex-1 items-center gap-1">
              <span
                aria-current={state === 'current' ? 'step' : undefined}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  state === 'current'
                    ? 'bg-gold-gradient text-white shadow-gold-sm'
                    : state === 'done'
                      ? 'bg-gold-100 text-gold-700'
                      : 'bg-cream-deep text-ink-faint'
                }`}
              >
                {n}
              </span>
              <span
                className={`hidden text-xs font-semibold sm:inline ${
                  state === 'current' ? 'text-ink' : 'text-ink-faint'
                }`}
              >
                {label}
              </span>
              {n < STEPS.length ? <span className="h-px flex-1 bg-gold-100" aria-hidden /> : null}
            </li>
          );
        })}
      </ol>

      <div className="mt-6 space-y-4">
        {step === 1 ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <label htmlFor="app-name" className="label-luxe">
                Full name
              </label>
              <input
                id="app-name"
                type="text"
                value={f.fullName}
                onChange={(e) => set('fullName', e.target.value)}
                placeholder="As on your ID"
                className="input-luxe"
              />
            </div>
            <div>
              <label htmlFor="app-phone" className="label-luxe">
                Phone
              </label>
              <input
                id="app-phone"
                type="tel"
                value={f.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+254 7… or 07…"
                className="input-luxe"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="app-email" className="label-luxe">
                Email (optional)
              </label>
              <input
                id="app-email"
                type="email"
                value={f.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="you@example.com"
                className="input-luxe"
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <label htmlFor="app-rent" className="label-luxe">
                Max monthly rent (KES)
              </label>
              <input
                id="app-rent"
                type="number"
                min={1}
                step={1000}
                value={f.maxRentKes}
                onChange={(e) => set('maxRentKes', e.target.value)}
                className="input-luxe"
                inputMode="numeric"
              />
            </div>
            <div>
              <label htmlFor="app-beds" className="label-luxe">
                Bedrooms
              </label>
              <select
                id="app-beds"
                value={f.beds}
                onChange={(e) => set('beds', e.target.value)}
                className="input-luxe"
              >
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? 'Studio' : `${n}+ bed`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="app-movein" className="label-luxe">
                Move-in by
              </label>
              <input
                id="app-movein"
                type="date"
                value={f.moveInBy}
                onChange={(e) => set('moveInBy', e.target.value)}
                className="input-luxe"
              />
            </div>
            <div className="sm:col-span-2">
              <p className="label-luxe">Preferred areas</p>
              <div
                role="group"
                aria-label="Preferred areas"
                className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-xl border border-gold-100 bg-cream/40 p-3"
              >
                {AREAS.map((area) => {
                  const active = f.areas.includes(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleArea(area)}
                      aria-pressed={active}
                      className={`inline-flex min-h-[36px] items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? 'border-gold-600 bg-gold-gradient text-white shadow-gold-sm'
                          : 'border-gold-200 bg-white text-ink-soft hover:border-gold-400 hover:text-gold-700'
                      }`}
                    >
                      {area}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-ink-faint">
                {f.areas.length} selected — landlords filter on these first.
              </p>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <label htmlFor="app-employment" className="label-luxe">
                Employment
              </label>
              <select
                id="app-employment"
                value={f.employment}
                onChange={(e) =>
                  set('employment', e.target.value as RentalApplication['employment'])
                }
                className="input-luxe"
              >
                <option value="employed">Employed</option>
                <option value="self">Self-employed</option>
                <option value="business">Business owner</option>
                <option value="remote">Remote / diaspora earner</option>
              </select>
            </div>
            <div>
              <label htmlFor="app-income" className="label-luxe">
                Net monthly income (KES)
              </label>
              <input
                id="app-income"
                type="number"
                min={1}
                step={5000}
                value={f.monthlyIncomeKes}
                onChange={(e) => set('monthlyIncomeKes', e.target.value)}
                className="input-luxe"
                inputMode="numeric"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="app-employer" className="label-luxe">
                Employer / business name (optional)
              </label>
              <input
                id="app-employer"
                type="text"
                value={f.employerName}
                onChange={(e) => set('employerName', e.target.value)}
                className="input-luxe"
              />
            </div>
            <div>
              <label htmlFor="app-refname" className="label-luxe">
                Referee name
              </label>
              <input
                id="app-refname"
                type="text"
                value={f.refName}
                onChange={(e) => set('refName', e.target.value)}
                className="input-luxe"
              />
            </div>
            <div>
              <label htmlFor="app-refphone" className="label-luxe">
                Referee phone
              </label>
              <input
                id="app-refphone"
                type="tel"
                value={f.refPhone}
                onChange={(e) => set('refPhone', e.target.value)}
                placeholder="+254 7… or 07…"
                className="input-luxe"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="app-note" className="label-luxe">
                Anything else (optional)
              </label>
              <textarea
                id="app-note"
                rows={2}
                value={f.note}
                onChange={(e) => set('note', e.target.value)}
                placeholder="Parking, furnishing, pets, timelines…"
                className="input-luxe"
              />
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div>
            <div className="rounded-xl bg-cream p-4">
              <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-ink-faint">Name:</span>{' '}
                  <b className="text-ink">{draft.fullName || '—'}</b>
                </p>
                <p>
                  <span className="text-ink-faint">Phone:</span>{' '}
                  <b className="text-ink">{draft.phone || '—'}</b>
                </p>
                <p>
                  <span className="text-ink-faint">Max rent:</span>{' '}
                  <b className="text-ink">
                    {draft.maxRentKes > 0 ? formatKES(draft.maxRentKes, { monthly: true }) : '—'}
                  </b>
                </p>
                <p>
                  <span className="text-ink-faint">Beds:</span>{' '}
                  <b className="text-ink">{draft.beds === 0 ? 'Studio' : `${draft.beds}+`}</b>
                </p>
                <p>
                  <span className="text-ink-faint">Areas:</span>{' '}
                  <b className="text-ink">
                    {draft.areas.length > 0 ? draft.areas.join(', ') : '—'}
                  </b>
                </p>
                <p>
                  <span className="text-ink-faint">Move-in by:</span>{' '}
                  <b className="text-ink">{draft.moveInBy || '—'}</b>
                </p>
                <p>
                  <span className="text-ink-faint">Income:</span>{' '}
                  <b className="text-ink">
                    {draft.monthlyIncomeKes > 0
                      ? formatKES(draft.monthlyIncomeKes, { monthly: true })
                      : '—'}
                  </b>
                </p>
                <p>
                  <span className="text-ink-faint">Referee:</span>{' '}
                  <b className="text-ink">
                    {draft.refName || '—'} · {draft.refPhone || '—'}
                  </b>
                </p>
              </div>
              <div className="mt-3">
                <CompChip read={read} />
              </div>
            </div>
            <p className="mt-3 text-sm text-ink-muted">
              Submitting stores this on your device and marks it{' '}
              <b className="text-ink">ready to share with any Keja partner agency</b> — copy the
              summary from your applications list. Figures stay self-declared (ESTIMATE) until an
              agency verifies them.
            </p>
          </div>
        ) : null}

        {errors.length > 0 ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-bold text-red-700">Fix these before continuing:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-red-700">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          disabled={step === 1}
          className="btn-outline disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden /> Back
        </button>
        {step < 4 ? (
          <button type="button" onClick={next} className="btn-gold">
            Next <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <button type="button" onClick={submit} className="btn-gold">
            <Send className="h-4 w-4" aria-hidden /> Submit application
          </button>
        )}
      </div>
    </m.div>
  );
}

function ApplicationsTab({ store }: { store: Store }) {
  const [justSubmitted, setJustSubmitted] = useState(false);
  return (
    <div className="space-y-6">
      {justSubmitted ? (
        <m.div {...fadeUp} className="rounded-2xl bg-ink p-6 shadow-card">
          <CheckCircle2 className="h-6 w-6 text-gold-400" aria-hidden />
          <p className="mt-2 font-display text-lg font-bold text-white">
            Application ready to share with any Keja partner agency
          </p>
          <p className="mt-1 text-sm text-white/60">
            Copy the summary from your applications list below — it travels as plain text on
            WhatsApp, email or print.
          </p>
        </m.div>
      ) : null}
      <Builder store={store} onSubmitted={() => setJustSubmitted(true)} />
      <div>
        <h3 className="font-display text-xl font-bold text-ink">Your applications</h3>
        <p className="mt-1 text-sm text-ink-muted">
          {store.data.applications.length} on this device — submitted + seeded demo example.
        </p>
        <div className="mt-4 space-y-6">
          {store.data.applications.map((app) => (
            <ApplicationCard key={app.id} app={app} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Maintenance ------------------------------ */

const CATEGORY_ICON: Record<RequestCategory, typeof Wrench> = {
  plumbing: Droplets,
  electrical: Zap,
  appliance: Wrench,
  security: ShieldCheck,
  other: Send,
};

const TIMELINE: { v: MaintenanceRequest['status']; label: string }[] = [
  { v: 'submitted', label: 'Submitted' },
  { v: 'acknowledged', label: 'Acknowledged' },
  { v: 'scheduled', label: 'Scheduled' },
];

function RequestTimeline({ status }: { status: MaintenanceRequest['status'] }) {
  const currentIdx = TIMELINE.findIndex((s) => s.v === status);
  return (
    <ol className="flex items-center gap-1" aria-label="Request status timeline">
      {TIMELINE.map((s, i) => (
        <li key={s.v} className="flex items-center gap-1">
          <span className="flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                i < currentIdx
                  ? 'bg-gold-300'
                  : i === currentIdx
                    ? 'bg-gold-600 ring-4 ring-gold-100'
                    : 'bg-cream-deep'
              }`}
              aria-hidden
            />
            <span
              className={`text-[11px] font-semibold ${
                i <= currentIdx ? 'text-ink-soft' : 'text-ink-faint'
              }`}
            >
              {s.label}
            </span>
          </span>
          {i < TIMELINE.length - 1 ? <span className="h-px w-3 bg-gold-100" aria-hidden /> : null}
        </li>
      ))}
    </ol>
  );
}

function MaintenanceTab({ store }: { store: Store }) {
  const { data, addRequest, advanceRequest } = store;
  const [category, setCategory] = useState<RequestCategory>('plumbing');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [preferredTime, setPreferredTime] = useState(PREFERRED_TIMES[0]);
  const [error, setError] = useState('');

  const submit = () => {
    if (title.trim().length < 4) {
      setError('Give the request a short title (at least 4 characters).');
      return;
    }
    if (detail.trim().length < 8) {
      setError('Add a little detail so the right contractor is sent.');
      return;
    }
    addRequest({ category, title: title.trim(), detail: detail.trim(), preferredTime });
    setTitle('');
    setDetail('');
    setError('');
  };

  return (
    <div className="space-y-6">
      <m.div {...fadeUp} className="card-luxe p-6">
        <h2 className="font-display text-xl font-bold text-ink">Report an issue</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Anything broken, leaking, tripping or unsafe — log it here.
        </p>
        <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div>
            <label htmlFor="req-category" className="label-luxe">
              Category
            </label>
            <select
              id="req-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as RequestCategory)}
              className="input-luxe"
            >
              {REQUEST_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="req-time" className="label-luxe">
              Preferred visit time
            </label>
            <select
              id="req-time"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              className="input-luxe"
            >
              {PREFERRED_TIMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="req-title" className="label-luxe">
              Title
            </label>
            <input
              id="req-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError('');
              }}
              placeholder="e.g. Kitchen tap dripping"
              className="input-luxe"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="req-detail" className="label-luxe">
              Detail
            </label>
            <textarea
              id="req-detail"
              rows={3}
              value={detail}
              onChange={(e) => {
                setDetail(e.target.value);
                setError('');
              }}
              placeholder="What exactly is wrong, where, and any access notes…"
              className="input-luxe"
            />
          </div>
        </div>
        {error ? (
          <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}
        <button type="button" onClick={submit} className="btn-gold mt-4">
          <Plus className="h-4 w-4" aria-hidden /> Submit request
        </button>
      </m.div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">
          <FlaskConical className="h-3.5 w-3.5" aria-hidden /> Requests demo-route into the Landlord
          Studio pipeline (demo)
        </span>
      </div>

      <div className="space-y-4">
        {data.requests.map((r) => {
          const Icon = CATEGORY_ICON[r.category];
          return (
            <m.div key={r.id} {...fadeUp} className="card-luxe card-luxe-hover p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-gradient shadow-gold-sm">
                  <Icon className="h-4 w-4 text-white" aria-hidden />
                </span>
                <p className="font-display text-base font-semibold text-ink">{r.title}</p>
                <span className="ml-auto text-xs text-ink-faint">
                  {timeAgo(r.submittedAt)} · {r.preferredTime}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{r.detail}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <RequestTimeline status={r.status} />
                {r.status !== 'scheduled' ? (
                  <button
                    type="button"
                    onClick={() => advanceRequest(r.id)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-gold-500/60 px-3.5 py-2 text-xs font-semibold text-gold-700 transition-colors hover:bg-gold-50"
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden /> Demo: simulate landlord response (
                    {nextRequestStatus(r.status)})
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Contractor visit scheduled
                  </span>
                )}
              </div>
            </m.div>
          );
        })}
        {data.requests.length === 0 ? (
          <p className="card-luxe p-6 text-center text-sm text-ink-muted">
            No requests yet — report the first issue above.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ----------------------------- Moving checklist --------------------------- */

function MovingTab({ store }: { store: Store }) {
  const { data, toggleChecklistItem } = store;
  const done = MOVING_CHECKLIST.filter((i) => data.checklist[i.id]).length;
  const progress = Math.round((done / MOVING_CHECKLIST.length) * 100);

  return (
    <div className="space-y-6">
      <m.div {...fadeUp} className="card-luxe p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Moving checklist</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Kenya-specific admin, in the order it usually bites.
            </p>
          </div>
          <p className="font-display text-2xl font-bold text-gold-700">
            {done}/{MOVING_CHECKLIST.length}
          </p>
        </div>
        <div
          className="mt-4 h-2.5 overflow-hidden rounded-full bg-cream-deep"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Moving checklist progress"
        >
          <div
            className="h-full rounded-full bg-gold-gradient transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </m.div>

      <ul className="space-y-3">
        {MOVING_CHECKLIST.map((item) => {
          const checked = Boolean(data.checklist[item.id]);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggleChecklistItem(item.id)}
                aria-pressed={checked}
                className={`card-luxe flex w-full items-start gap-3 p-4 text-left transition-shadow ${
                  checked ? 'card-luxe-hover opacity-70' : 'card-luxe-hover'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    checked
                      ? 'border-gold-600 bg-gold-gradient text-white'
                      : 'border-gold-300 bg-white text-transparent'
                  }`}
                  aria-hidden
                >
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <span>
                  <span
                    className={`block text-sm font-semibold ${
                      checked ? 'text-ink-faint line-through' : 'text-ink'
                    }`}
                  >
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-muted">{item.hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------------------------------- page ---------------------------------- */

export default function TenantHub() {
  usePageMeta(
    'Tenant Hub — Lease Tracker, Applications & Maintenance',
    'Renters track their lease and deposit, build a shareable rental application, log maintenance requests and run a Kenya-specific moving checklist.'
  );
  const store = useTenantStore();
  const [tab, setTab] = useState<Tab>('rental');
  const [searchParams, setSearchParams] = useSearchParams();

  // deep links: /tenant?tab=applications
  useEffect(() => {
    const q = searchParams.get('tab');
    if (q && VALID_TABS.includes(q as Tab)) {
      setTab(q as Tab);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-cream/60">
      <section className="bg-ink py-16 sm:py-20">
        <div className="container-luxe max-w-3xl text-center">
          <p className="eyebrow !text-gold-400">For renters</p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            Tenant <span className="gold-text">Hub</span>
          </h1>
          <p className="mt-6 leading-relaxed text-white/65">
            Your lease, your application, your repairs, your move — organised. Keja keeps the honest
            side of renting in one place, and hands you the paperwork landlords actually ask for.
          </p>
        </div>
      </section>

      {/* honest demo boundary */}
      <div role="note" className="border-b border-amber-200 bg-amber-50">
        <div className="container-luxe flex items-center justify-center gap-2.5 px-4 py-2.5 text-center text-xs text-amber-900">
          <FlaskConical className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <p>
            <strong>Demo data</strong> — everything stays in this browser. Production routes
            maintenance to your landlord and applications to partner agencies.
          </p>
        </div>
      </div>

      {/* tab bar */}
      <div className="sticky top-16 sticky-banner-shift z-30 border-b border-gold-100 bg-white/95 backdrop-blur-md">
        <div
          className="container-luxe no-scrollbar flex items-center gap-1 overflow-x-auto py-2.5"
          role="tablist"
          aria-label="Tenant Hub sections"
        >
          <span className="mr-2 hidden items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide2 text-gold-700 sm:flex">
            <Home className="h-4 w-4" aria-hidden /> Tenant Hub
          </span>
          {TABS.map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => setTab(t.v)}
              role="tab"
              aria-selected={tab === t.v}
              className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors ${
                tab === t.v
                  ? 'bg-gold-50 text-gold-700'
                  : 'text-ink-soft hover:bg-gold-50/60 hover:text-gold-700'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" aria-hidden />
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={store.resetDemo}
            className="ml-auto inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:bg-gold-50 hover:text-gold-700"
            title="Restore the seeded demo data"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Reset demo data</span>
            <span className="sm:hidden">Reset</span>
          </button>
        </div>
      </div>

      <div className="container-luxe py-10 sm:py-14">
        {tab === 'rental' ? <RentalTab store={store} /> : null}
        {tab === 'applications' ? <ApplicationsTab store={store} /> : null}
        {tab === 'maintenance' ? <MaintenanceTab store={store} /> : null}
        {tab === 'moving' ? <MovingTab store={store} /> : null}
      </div>
    </div>
  );
}
