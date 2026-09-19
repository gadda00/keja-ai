'use client';
/**
 * KEJA DIASPORA (proposal §8) — "Invest in Kenya from anywhere in the world."
 * Verified properties, AI advisor, virtual viewing, lawyer/PM connections,
 * rental collection, currency conversion, remittance comparison, WhatsApp support.
 *
 * Wave 18: the page keeps its public marketing layer (hero, services,
 * remittance tools — genuinely useful, SEO-worthy), but the personal desk is
 * account-gated now: viewing slots with cross-timezone conversion, the
 * Power-of-Attorney checklist and the eight-step remote-purchase journey
 * all lived in the store with no UI — a workspace with no doors. Guests see
 * a sign-in card where the desk sits; every signed-in account gets the desk
 * (diaspora is a segment, not a role — RegistrationHint nudges the lane).
 */
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  FileSignature,
  Globe2,
  Landmark,
  LogIn,
  MessageCircle,
  Plane,
  Plus,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Video,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllProperties } from '@/lib/inventory';
import {
  activeJourneyStep,
  compareRemitChannels,
  convertSlot,
  diasporaTimezones,
  JOURNEY_STEPS,
  journeyProgressPct,
  nextJourneyStatus,
  POA_TASKS,
  poaProgressPct,
  useDiaspora,
  type JourneyStepStatus,
  type RemitCorridor,
  type ViewingSlot,
} from '@/lib/diasporaStore';
import { useAuth } from '@/lib/auth';
import { RegistrationHint } from '@/components/common/PortalGate';
import { formatKES } from '@/lib/format';
import { FX_KES_PER_USD } from '@/lib/finance';
import { PropertyCard } from '@/components/property/PropertyCard';
import { navigate } from '@/lib/router';
import { whatsappLink } from '@/config';
import { newId } from '@/lib/uuid';
import { cn } from '@/lib/utils';

const SERVICES = [
  { icon: ShieldCheck, title: 'Verified properties only', text: 'Every listing carries title screens, the Trust Score and a Property Passport — the fraud filter before you fly.' },
  { icon: Video, title: 'Virtual viewings', text: 'Live walkthroughs in your timezone, recorded for your records, with an independent Keja verifier on the line.' },
  { icon: FileSignature, title: 'Lawyer & conveyancing', text: 'Vetted Kenyan counsel handles the sale agreement, title transfer and registration — with escrow options.' },
  { icon: Landmark, title: 'Financing referrals', text: 'Diaspora mortgage desks at partner banks, in USD or KES, with remote onboarding.' },
  { icon: Receipt, title: 'Rental collection', text: 'Keja Manage collects rent, chases arrears and wires net income to your overseas account.' },
  { icon: MessageCircle, title: 'WhatsApp support', text: 'One thread, real humans, business hours in Nairobi and New York.' },
];

const SLOT_STATUS: Record<ViewingSlot['status'], string> = {
  requested: 'border-gold/50 text-gold-foreground',
  confirmed: 'border-primary/40 text-primary',
  done: 'border-border text-muted-foreground',
};

const SLOT_NEXT: Record<ViewingSlot['status'], { label: string; tone: 'default' | 'outline' } | null> = {
  requested: { label: 'Confirm slot', tone: 'default' },
  confirmed: { label: 'Mark done', tone: 'outline' },
  done: null,
};

/* ------------------------------------------------------------------ */
/* The diaspora desk (account-gated)                                    */
/* ------------------------------------------------------------------ */

function ViewingsPanel() {
  const [diaspora, setDiaspora] = useDiaspora();
  const [date, setDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 86_400_000);
    return d.toISOString().slice(0, 10);
  });
  const [timeEAT, setTimeEAT] = useState('18:00');
  const [areas, setAreas] = useState('Kilimani, Westlands');
  const [tz, setTz] = useState('America/New_York');

  const request = () => {
    const slot: ViewingSlot = {
      id: newId('vs'),
      date,
      timeEAT,
      areas: areas.split(',').map((a) => a.trim()).filter(Boolean).slice(0, 4),
      inspectorName: 'Keja verification desk',
      status: 'requested',
    };
    setDiaspora((prev) => ({ ...prev, slots: [slot, ...prev.slots].slice(0, 12) }));
  };

  const advance = (id: string) => {
    setDiaspora((prev) => ({
      ...prev,
      slots: prev.slots.map((s) =>
        s.id === id
          ? { ...s, status: s.status === 'requested' ? 'confirmed' : 'done' }
          : s,
      ),
    }));
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border bg-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
          <Video className="h-4 w-4 text-gold" aria-hidden /> Book a virtual viewing
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Nairobi time in, your local time out — an independent Keja verifier walks the property
          live on video and the recording lands in your records.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="vs-date">Date (Nairobi calendar)</Label>
            <Input id="vs-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="vs-time">Time (EAT — Nairobi)</Label>
            <Input id="vs-time" type="time" value={timeEAT} onChange={(e) => setTimeEAT(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="vs-areas">Areas to view</Label>
            <Input id="vs-areas" value={areas} onChange={(e) => setAreas(e.target.value)} placeholder="e.g. Kilimani, Westlands" />
          </div>
          <div className="grid gap-1.5">
            <Label>Your timezone</Label>
            <Select value={tz} onValueChange={setTz}>
              <SelectTrigger aria-label="Your timezone"><SelectValue /></SelectTrigger>
              <SelectContent>
                {diasporaTimezones.filter((t) => t.iana !== 'Africa/Nairobi').map((t) => (
                  <SelectItem key={t.iana} value={t.iana}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="mt-3 rounded-xl bg-accent/60 px-3.5 py-2.5 text-xs">
          <span className="font-bold">{timeEAT} Nairobi</span> ={' '}
          <span className="font-black text-primary">{convertSlot(date, timeEAT, tz)}</span> in your
          timezone — cross-day slots are flagged so you never book the wrong calendar day.
        </p>
        <Button className="mt-4 font-bold" onClick={request}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Request viewing
        </Button>
      </div>

      <div className="space-y-2.5">
        {diaspora.slots.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                {new Date(`${s.date}T00:00:00Z`).toLocaleDateString('en-KE', { dateStyle: 'medium' })} ·{' '}
                {s.timeEAT} EAT
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {s.areas.join(' · ')} · {s.inspectorName} · your time:{' '}
                <span className="font-bold text-foreground">{convertSlot(s.date, s.timeEAT, tz)}</span>
              </p>
            </div>
            <Badge variant="outline" className={cn('text-[10px] font-bold capitalize', SLOT_STATUS[s.status])}>
              {s.status}
            </Badge>
            {SLOT_NEXT[s.status] && (
              <Button
                size="sm"
                variant={SLOT_NEXT[s.status]!.tone}
                className="h-8 text-xs font-bold"
                onClick={() => advance(s.id)}
              >
                {SLOT_NEXT[s.status]!.label}
              </Button>
            )}
          </div>
        ))}
        {diaspora.slots.length === 0 && (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No viewings booked yet — shortlist verified homes and walk them from your sofa.
          </p>
        )}
      </div>
    </div>
  );
}

function PoaPanel() {
  const [diaspora, setDiaspora] = useDiaspora();
  const done = POA_TASKS.filter((t) => diaspora.poa.taskIds.includes(t.id)).length;
  const pct = poaProgressPct(diaspora.poa.taskIds);

  const toggle = (id: string) => {
    setDiaspora((prev) => ({
      ...prev,
      poa: {
        taskIds: prev.poa.taskIds.includes(id)
          ? prev.poa.taskIds.filter((t) => t !== id)
          : [...prev.poa.taskIds, id],
      },
    }));
  };

  return (
    <div className="rounded-3xl border bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
          <ClipboardCheck className="h-4 w-4 text-gold" aria-hidden /> Power of Attorney — embassy to registry
        </h3>
        <span className="text-xs font-black tabular-nums text-primary">{done}/{POA_TASKS.length}</span>
      </div>
      <Progress value={pct} className="mt-2 h-2" aria-label="PoA checklist progress" />
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {POA_TASKS.map((t) => {
          const isDone = diaspora.poa.taskIds.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors',
                isDone ? 'border-primary/40 bg-primary/5' : 'hover:border-primary/30',
              )}
              aria-pressed={isDone}
            >
              <CheckCircle2 className={cn('mt-0.5 h-5 w-5 shrink-0', isDone ? 'text-primary' : 'text-muted-foreground/40')} aria-hidden />
              <div>
                <p className={cn('text-sm font-bold', isDone && 'text-primary')}>{t.label}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{t.hint}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function JourneyPanel() {
  const [diaspora, setDiaspora] = useDiaspora();
  const pct = journeyProgressPct(diaspora.journey);
  const active = activeJourneyStep(diaspora.journey);

  const cycle = (id: string) => {
    setDiaspora((prev) => ({
      ...prev,
      journey: { ...prev.journey, [id]: nextJourneyStatus((prev.journey[id] ?? 'untouched') as JourneyStepStatus) },
    }));
  };

  return (
    <div className="rounded-3xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
          <Plane className="h-4 w-4 text-gold" aria-hidden /> The remote purchase journey
        </h3>
        <span className="text-xs font-black tabular-nums text-primary">{pct}% complete</span>
      </div>
      <Progress value={pct} className="mt-2 h-2" aria-label="Purchase journey progress" />
      {active && (
        <p className="mt-4 rounded-xl border border-gold/40 bg-gold-soft px-3.5 py-2.5 text-xs leading-relaxed text-gold-foreground">
          <strong>Next up: {active.label}.</strong> {active.hint}
          {active.to && (
            <button className="ml-1 font-bold underline" onClick={() => navigate(active.to!)}>
              Open it →
            </button>
          )}
        </p>
      )}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {JOURNEY_STEPS.map((s, i) => {
          const status = (diaspora.journey[s.id] ?? 'untouched') as JourneyStepStatus;
          return (
            <button
              key={s.id}
              onClick={() => cycle(s.id)}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors',
                status === 'done' && 'border-primary/40 bg-primary/5',
                status === 'next' && 'border-gold/50 bg-gold-soft/60',
                status === 'untouched' && 'hover:border-primary/30',
              )}
              aria-pressed={status === 'done'}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black',
                  status === 'done' ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground',
                )}
                aria-hidden
              >
                {status === 'done' ? '✓' : i + 1}
              </span>
              <div className="min-w-0">
                <p className={cn('text-sm font-bold', status === 'done' && 'text-primary')}>{s.label}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{s.hint}</p>
                {s.to && (
                  <button
                    className="mt-1 text-[11px] font-bold text-primary hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(s.to!);
                    }}
                  >
                    Open surface →
                  </button>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
        Tap a step to cycle its status (untouched → doing → done). Statuses persist on this device
        with the rest of your desk.
      </p>
    </div>
  );
}

function DiasporaDesk() {
  const { user } = useAuth();

  return (
    <section className="mt-10" aria-label="Your diaspora desk">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            Your diaspora desk{user ? `, ${user.name.split(' ')[0]}` : ''}
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            The account side of the portal — viewings in your timezone, the PoA checklist and the
            remote purchase journey, all on your device.
          </p>
        </div>
      </div>
      <div className="mt-5">
        <RegistrationHint />
      </div>
      <Tabs defaultValue="journey" className="mt-3">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="journey" className="gap-1.5 font-bold"><Plane className="h-4 w-4" aria-hidden /> Purchase journey</TabsTrigger>
          <TabsTrigger value="viewings" className="gap-1.5 font-bold"><Video className="h-4 w-4" aria-hidden /> Viewings</TabsTrigger>
          <TabsTrigger value="poa" className="gap-1.5 font-bold"><ClipboardCheck className="h-4 w-4" aria-hidden /> Power of Attorney</TabsTrigger>
        </TabsList>
        <TabsContent value="journey" className="mt-6">
          <JourneyPanel />
        </TabsContent>
        <TabsContent value="viewings" className="mt-6">
          <ViewingsPanel />
        </TabsContent>
        <TabsContent value="poa" className="mt-6">
          <PoaPanel />
        </TabsContent>
      </Tabs>
    </section>
  );
}

/** The guest-facing stand-in for the desk — a sign-in card, not a dead end. */
function DeskSignInCard() {
  const { requireAuth } = useAuth();
  return (
    <section className="mt-10" aria-label="Open your diaspora desk">
      <div className="grid gap-6 rounded-3xl border bg-card p-6 sm:p-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <Badge variant="outline" className="border-primary/40 font-bold text-primary">Your diaspora desk</Badge>
          <h2 className="mt-3 text-2xl font-black tracking-tight">The desk behind the brochure</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            Sign in to track the remote purchase journey step by step, book virtual viewings in
            your own timezone, and work the embassy-to-registry Power of Attorney checklist —
            the working tools of buying Kenya property from abroad.
          </p>
          <ul className="mt-4 grid gap-2 text-sm">
            {[
              'Viewing slots with exact cross-timezone conversion',
              'The 8-step purchase journey with the platform surfaces linked',
              'PoA checklist: 9 steps, embassy appointment to lands registry',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className="leading-snug">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col justify-center gap-3 rounded-2xl border border-dashed bg-background/60 p-6">
          <Button className="font-black" onClick={() => requireAuth('the diaspora desk', () => undefined)}>
            <LogIn className="mr-1.5 h-4 w-4" aria-hidden /> Open your diaspora desk
          </Button>
          <Button variant="outline" className="font-bold" onClick={() => navigate('/properties')}>
            Browse verified properties first <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
          </Button>
          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            One Google sign-in, and every account works here — diaspora is a journey, not a role.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The view                                                             */
/* ------------------------------------------------------------------ */

export default function DiasporaHubView() {
  const all = useAllProperties();
  const { isLoggedIn } = useAuth();
  const [usd, setUsd] = useState(5_000);
  const [corridor, setCorridor] = useState<RemitCorridor>('US');

  const quotes = useMemo(() => compareRemitChannels(usd, corridor), [usd, corridor]);
  const best = quotes[0];

  const diasporaPicks = useMemo(
    () =>
      [...all]
        .filter((p) => p.trustScore >= 85 && !p.purpose.includes('rent') && p.availability !== 'sold')
        .sort((a, b) => b.trustScore - a.trustScore)
        .slice(0, 4),
    [all],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* hero */}
      <section className="relative overflow-hidden rounded-3xl border bg-emerald-deep p-6 text-white sm:p-10">
        <div className="bg-dots absolute inset-0 opacity-20" aria-hidden />
        <div className="relative max-w-2xl">
          <Badge className="border-0 bg-gold text-[10px] font-black uppercase tracking-widest text-gold-foreground">
            <Plane className="mr-1 h-3 w-3" aria-hidden /> Keja Diaspora
          </Badge>
          <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            Invest in Kenya from anywhere in the world.
          </h1>
          <p className="mt-3 leading-relaxed text-white/80">
            Distance is not risk. The diaspora portal pairs verified properties with virtual
            viewings, vetted lawyers, property management and rental collection — so your money
            works at home while you live abroad.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" className="bg-gold font-black text-gold-foreground hover:bg-gold/90" onClick={() => navigate('/properties')}>
              Browse verified properties
            </Button>
            <a href={whatsappLink("Hello Keja — I'm abroad and want to invest in Kenya.")} target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="border-white/30 font-bold text-white hover:bg-white/10 hover:text-white">
                <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden /> I&rsquo;m abroad — help me invest
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* the account-gated desk (or its sign-in card for guests) */}
      {isLoggedIn ? <DiasporaDesk /> : <DeskSignInCard />}

      {/* services grid */}
      <section className="mt-10">
        <h2 className="text-2xl font-black tracking-tight">The full diaspora stack</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <div key={s.title} className="card-lift rounded-2xl border bg-card p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                <s.icon className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <h3 className="mt-3.5 text-[15px] font-bold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* remittance comparison */}
      <section className="mt-10 rounded-3xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-black tracking-tight">
            <Coins className="h-5 w-5 text-gold" aria-hidden /> Remittance cost comparison
          </h2>
          <Badge variant="secondary" className="text-[10px] font-bold">Indicative mid-market {FX_KES_PER_USD} KES/USD</Badge>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Every shilling saved on transfer is yield you keep. Compare channels before you move capital.
        </p>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="rem-usd">Amount to send (USD)</Label>
              <Input id="rem-usd" type="number" min={100} step={100} value={usd || ''} onChange={(e) => setUsd(Math.max(0, Number(e.target.value)))} />
            </div>
            <div className="grid gap-2">
              <Label>Corridor</Label>
              <Select value={corridor} onValueChange={(v) => setCorridor(v as RemitCorridor)}>
                <SelectTrigger aria-label="Remittance corridor"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="UK">United Kingdom</SelectItem>
                  <SelectItem value="UAE">UAE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {best && (
              <div className="rounded-2xl bg-accent/60 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Best channel — {best.channel.label}</span>
                  <span className="text-lg font-black tabular-nums">{formatKES(Math.round(best.netKes))}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Fee ${best.feeUsd.toFixed(2)} · rate {best.fxKesPerUsd} KES/USD</span>
                  <span className="font-bold text-primary">ranked best-net-first</span>
                </div>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2.5">Channel</th>
                  <th className="pb-2.5 text-right">Fee</th>
                  <th className="pb-2.5 text-right">Rate (KES/USD)</th>
                  <th className="pb-2.5 text-right">Recipient gets</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.channel.id} className={cn('border-b last:border-0', q === best && 'bg-accent/40')}>
                    <td className="py-2.5 font-bold">{q.channel.label}</td>
                    <td className="py-2.5 text-right tabular-nums">${q.feeUsd.toFixed(2)}</td>
                    <td className="py-2.5 text-right tabular-nums">{q.fxKesPerUsd}</td>
                    <td className="py-2.5 text-right font-black tabular-nums">{formatKES(Math.round(q.netKes))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Channel models are indicative (ESTIMATE class) — confirm live rates with your provider at transfer time.
            </p>
          </div>
        </div>
      </section>

      {/* verified picks */}
      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Highest-trust picks for diaspora buyers</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Trust Score ≥ 85, titles screened — the shortlist before a viewing trip.
            </p>
          </div>
          <Button variant="outline" className="font-bold" onClick={() => navigate('/properties')}>
            View all <TrendingUp className="ml-1.5 h-4 w-4" aria-hidden />
          </Button>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {diasporaPicks.map((p, i) => (
            <PropertyCard key={p.id} property={p} index={i} />
          ))}
        </div>
      </section>

      {/* timezone strip */}
      <section className="mt-10 rounded-3xl border bg-card p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
          <Globe2 className="h-4 w-4 text-gold" aria-hidden /> We work in your timezone
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {diasporaTimezones.map((tz) => (
            <div key={tz.iana} className="rounded-xl bg-accent/50 p-3 text-center">
              <p className="text-xs font-black">{tz.label}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{tz.iana}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          Virtual viewings are scheduled in your local time; documents are signed with e-signature and notarised locally where required.
        </div>
      </section>
    </div>
  );
}
