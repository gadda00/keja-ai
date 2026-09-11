'use client';
/**
 * KEJA DIASPORA (proposal §8) — "Invest in Kenya from anywhere in the world."
 * Verified properties, AI advisor, virtual viewing, lawyer/PM connections,
 * rental collection, currency conversion, remittance comparison, WhatsApp support.
 */
import { useMemo, useState } from 'react';
import {
  CalendarClock,
  Coins,
  FileSignature,
  Globe2,
  Landmark,
  MessageCircle,
  Plane,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Video,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllProperties } from '@/lib/inventory';
import {
  compareRemitChannels,
  diasporaTimezones,
  type RemitCorridor,
} from '@/lib/diasporaStore';
import { formatKES } from '@/lib/format';
import { FX_KES_PER_USD } from '@/lib/finance';
import { PropertyCard } from '@/components/property/PropertyCard';
import { navigate } from '@/lib/router';
import { whatsappLink } from '@/config';
import { cn } from '@/lib/utils';

const SERVICES = [
  { icon: ShieldCheck, title: 'Verified properties only', text: 'Every listing carries title screens, the Trust Score and a Property Passport — the fraud filter before you fly.' },
  { icon: Video, title: 'Virtual viewings', text: 'Live walkthroughs in your timezone, recorded for your records, with an independent Keja verifier on the line.' },
  { icon: FileSignature, title: 'Lawyer & conveyancing', text: 'Vetted Kenyan counsel handles the sale agreement, title transfer and registration — with escrow options.' },
  { icon: Landmark, title: 'Financing referrals', text: 'Diaspora mortgage desks at partner banks, in USD or KES, with remote onboarding.' },
  { icon: Receipt, title: 'Rental collection', text: 'Keja Manage collects rent, chases arrears and wires net income to your overseas account.' },
  { icon: MessageCircle, title: 'WhatsApp support', text: 'One thread, real humans, business hours in Nairobi and New York.' },
];

export default function DiasporaHubView() {
  const all = useAllProperties();
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
