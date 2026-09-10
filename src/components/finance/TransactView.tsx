'use client';
/**
 * KEJA TRANSACT (proposal §2/§6) — digital transaction support and
 * professional-service integration: the lawyer, valuer, inspector and
 * conveyancing marketplace that closes the loop from offer to keys, with
 * escrow-style milestones and a transparent fee display.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  FileSignature,
  Gavel,
  KeyRound,
  ListChecks,
  Scale,
  Search,
  ShieldCheck,
  Stamp,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { navigate } from '@/lib/router';
import { cn } from '@/lib/utils';

const PROFESSIONALS = [
  { category: 'Conveyancing lawyers', icon: Gavel, count: 8, from: 'KES 120k', note: 'Title searches, sale agreements, transfer registration. Panel-vetted, fixed-fee options.', rating: 4.9 },
  { category: 'Valuers', icon: Scale, count: 6, from: 'KES 35k', note: 'Licensed IBK-registered valuations accepted by partner banks for mortgage collateral.', rating: 4.8 },
  { category: 'Property inspectors', icon: Search, count: 5, from: 'KES 25k', note: 'Pre-handover snag lists, structural and systems inspections with photographic reports.', rating: 4.7 },
  { category: 'Notaries & commissioners', icon: Stamp, count: 4, from: 'KES 5k', note: 'Oaths, attestations and diaspora document notarisation with e-signature support.', rating: 4.9 },
];

const MILESTONES = [
  { icon: FileSignature, title: 'Offer & sale agreement', detail: 'Lawyer drafts, both parties sign, deposit paid into the stakeholder account — not the seller.' },
  { icon: Search, title: 'Due diligence window', detail: 'Title search, rates clearance, encumbrance check and the independent valuation run in parallel.' },
  { icon: Stamp, title: 'Transfer & stamping', detail: 'Stamp duty assessed and paid, transfer executed, Ardhisasa registry updated.' },
  { icon: KeyRound, title: 'Completion & keys', detail: 'Balance released from escrow, keys and vacant possession handed over, utilities transferred.' },
];

export default function TransactView() {
  const [engaged, setEngaged] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="max-w-2xl">
        <Badge variant="outline" className="border-primary/40 font-bold text-primary">Keja Transact</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          From offer to keys, with professionals on tap
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Transactions fail on process, not price. Keja Transact structures the closing journey —
          milestone-based payments held in stakeholder accounts, licensed professionals at fixed
          fees, and every document tracked against the checklist.
        </p>
      </div>

      {/* milestones */}
      <section className="mt-8">
        <h2 className="text-xl font-black tracking-tight">The closing journey</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MILESTONES.map((m, i) => (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="relative rounded-2xl border bg-card p-5"
            >
              <span className="absolute right-4 top-4 font-mono text-[10px] font-black text-muted-foreground">
                STEP {i + 1}
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                <m.icon className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <h3 className="mt-3.5 text-[15px] font-bold">{m.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{m.detail}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* professionals */}
      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-tight">The professional panel</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Vetted, rated and standards-bound — trial profiles in this build.
            </p>
          </div>
          <Badge variant="secondary" className="font-bold">Stakeholder-account payments</Badge>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {PROFESSIONALS.map((p) => (
            <div key={p.category} className="card-lift flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent">
                <p.icon className="h-6 w-6 text-primary" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[15px] font-bold">{p.category}</h3>
                  <Badge variant="outline" className="text-[9px] font-bold">
                    <BadgeCheck className="mr-1 h-3 w-3 text-primary" aria-hidden /> {p.count} on panel
                  </Badge>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.note}</p>
                <p className="mt-1.5 text-xs font-bold text-muted-foreground">from {p.from} · ★ {p.rating} panel rating</p>
              </div>
              <Button
                size="sm"
                className={cn('shrink-0 font-bold', engaged === p.category && 'opacity-80')}
                onClick={() => {
                  setEngaged(p.category);
                  toast({
                    title: `${p.category} engaged`,
                    description: 'In the live product, three panel quotes arrive within 24 hours. Trial acknowledgement only.',
                  });
                }}
              >
                {engaged === p.category ? 'Requested' : 'Request quotes'}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* escrow explainer */}
      <section className="mt-10 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-3xl border bg-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-black tracking-tight">
            <Wallet className="h-5 w-5 text-gold" aria-hidden /> How stakeholder payments work
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your deposit and balance sit in a regulated stakeholder account — held by the lawyer&rsquo;s
            practice under LSK rules, never by the platform. Funds release only against completed
            milestones: signed agreement, clean title search, stamped transfer, vacant possession.
            If a condition fails, the money comes back.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ['Held', 'Deposit sits in the stakeholder account'],
              ['Verified', 'Milestones clear against document checks'],
              ['Released', 'Funds move only on completion'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-accent/50 p-3.5">
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{k}</p>
                <p className="mt-0.5 text-sm font-bold">{v}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border bg-gradient-to-b from-accent/60 to-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-black tracking-tight">
            <ListChecks className="h-5 w-5 text-gold" aria-hidden /> Start a transaction
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Found the property? Run it through the Deal Analyst first, then open the transaction
            workspace with your lawyer and valuer already attached.
          </p>
          <div className="mt-4 grid gap-2">
            <Button className="font-bold" onClick={() => navigate('/deal-analyst')}>
              Pre-screen with the Deal Analyst <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
            </Button>
            <Button variant="outline" className="font-bold" onClick={() => navigate('/properties')}>
              Browse verified properties
            </Button>
          </div>
          <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            Keja facilitates and documents; regulated professionals execute. The platform never
            holds client money.
          </p>
        </div>
      </section>
    </div>
  );
}
