'use client';
/**
 * KEJA PARTNERSHIP PORTAL (proposal §17) — "Partner with Keja" across banking,
 * finance, insurance, legal, valuation, development, property management,
 * technology, investment, government and institutional investment — with the
 * partnership-deck request path.
 */
import { useState } from 'react';
import {
  ArrowRight,
  Banknote,
  Briefcase,
  Building,
  Cpu,
  FileText,
  Gavel,
  Handshake,
  HeartHandshake,
  Landmark,
  LineChart,
  ScrollText,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { navigate } from '@/lib/router';
import { whatsappLink } from '@/config';

const TRACKS = [
  { icon: Landmark, title: 'Banking', text: 'Mortgage partnerships: verified leads, collateral intelligence, co-branded journeys.' },
  { icon: Banknote, title: 'Finance', text: 'Development and SME property lenders — deal flow with diligence attached.' },
  { icon: ShieldCheck, title: 'Insurance', text: 'Property risk data for underwriting; embedded cover at transaction.' },
  { icon: Gavel, title: 'Legal', text: 'Conveyancing panel — referred, rated and standards-bound.' },
  { icon: FileText, title: 'Valuation', text: 'Valuer network behind the Deal Analyst referrals and portfolio marks.' },
  { icon: Building, title: 'Property development', text: 'Launch intelligence, buyer matching and the Development Score.' },
  { icon: Wrench, title: 'Property management', text: 'Operators powering Keja Manage portfolios with SLA-backed service.' },
  { icon: Cpu, title: 'Technology', text: 'Data, verification and infrastructure partners building on the trust layer.' },
  { icon: LineChart, title: 'Investment', text: 'Funds and family offices sourcing verified, income-producing assets.' },
  { icon: Briefcase, title: 'Government', text: 'Land-registry integrations, housing programs and open-data collaborations.' },
];

export default function PartnersView() {
  const [email, setEmail] = useState('');
  const [org, setOrg] = useState('');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <section className="relative overflow-hidden rounded-3xl border bg-card p-6 sm:p-10">
        <div className="bg-hero-mesh absolute inset-0" aria-hidden />
        <div className="relative max-w-2xl">
          <Badge className="border-0 bg-gold text-[10px] font-black uppercase tracking-widest text-gold-foreground">
            <Handshake className="mr-1 h-3 w-3" aria-hidden /> Partner with Keja
          </Badge>
          <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            The trust layer wants partners, not vendors
          </h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Keja sits at the centre of the real-estate lifecycle — discovery, verification,
            analysis, financing, transaction and management. Partners plug into that flow with a
            shared standard: verified inputs, transparent labels, honest claims.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-black tracking-tight">Partnership tracks</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {TRACKS.map((t) => (
            <div key={t.title} className="card-lift rounded-2xl border bg-card p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                <t.icon className="h-4.5 w-4.5 text-primary" aria-hidden />
              </div>
              <h3 className="mt-3 text-sm font-bold">{t.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* deck request */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border-2 border-gold/40 bg-gold-soft p-6">
          <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-gold-foreground">
            <ScrollText className="h-5 w-5" aria-hidden /> Request the Keja partnership deck
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gold-foreground/85">
            The deck covers the ecosystem map, the verification methodology, the partnership
            models per track and the commercial structure. It goes to serious partners — tell us
            who you are.
          </p>
          <div className="mt-5 grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="pt-org" className="text-gold-foreground">Organisation</Label>
              <Input id="pt-org" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="e.g. Maji Insurance Group" className="border-gold/40 bg-card" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pt-email" className="text-gold-foreground">Work email</Label>
              <Input id="pt-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@organisation.com" className="border-gold/40 bg-card" />
            </div>
            <Button
              className="bg-gold font-black text-gold-foreground hover:bg-gold/90"
              disabled={!org || !email}
              onClick={() =>
                toast({
                  title: 'Deck requested',
                  description: `The Keja partnership deck will be sent to ${email}. The partnerships desk follows up within two business days.`,
                })
              }
            >
              Request Keja partnership deck
            </Button>
            <p className="text-[10px] leading-relaxed text-gold-foreground/60">
              Trial platform — the request is acknowledged on-device here and routes to the desk on
              the live product.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border bg-card p-6">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
              <HeartHandshake className="h-4 w-4 text-gold" aria-hidden /> The partner standard
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-muted-foreground">
              {[
                'Verified inputs only — partners inherit the claims-register discipline.',
                'No pay-to-play trust: scores and badges can never be bought.',
                'Service-level transparency on referrals, ratings and complaints.',
                'Data protection by design — Kenya DPA-compliant sharing agreements.',
              ].map((li) => (
                <li key={li} className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /> {li}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border bg-card p-6">
            <h3 className="text-sm font-black uppercase tracking-wider">Prefer to talk?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              The partnerships desk is human-first. Reach the team on WhatsApp or explore the
              institutional portal for mandate-shaped engagement.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={whatsappLink('Hello Keja — partnership enquiry.')} target="_blank" rel="noopener noreferrer">
                <Button className="font-bold">WhatsApp the desk</Button>
              </a>
              <Button variant="outline" className="font-bold" onClick={() => navigate('/institutional')}>
                Institutional portal <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
