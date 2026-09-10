'use client';
/**
 * KEJA INSTITUTIONAL (proposal §10) — the portal for banks, pension funds,
 * insurance companies, developers, REITs, SACCOs, investment funds, family
 * offices, government institutions and property managers, each with the
 * sector-specific service that matters to them.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Banknote,
  Building,
  Coins,
  Database,
  FileBarChart,
  Landmark,
  LineChart,
  Handshake,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { navigate } from '@/lib/router';
import { cn } from '@/lib/utils';

const SECTORS = [
  {
    icon: Landmark,
    sector: 'Banks',
    service: 'Property intelligence + qualified financing leads',
    detail: 'Every Keja financing lead arrives with a verified title, a screened price and a Trust Score — better collateral files, lower origination cost. Portfolio-level market intelligence feeds credit strategy.',
    color: 'text-primary',
  },
  {
    icon: Coins,
    sector: 'Pension funds & REITs',
    service: 'Verified income-producing assets',
    detail: 'Pre-diligenced, income-producing assets with independent valuation paths, tenancy schedules and SPV-ready structures for fund assembly.',
    color: 'text-gold',
  },
  {
    icon: ShieldCheck,
    sector: 'Insurance companies',
    service: 'Property risk intelligence',
    detail: 'Area-level risk context — flood exposure, infrastructure quality, occupancy dynamics — to sharpen underwriting and claims reserving on property lines.',
    color: 'text-primary',
  },
  {
    icon: Building,
    sector: 'Developers',
    service: 'Qualified buyers + market intelligence',
    detail: 'Demand-weighted launch intelligence, presale matching against verified buyers, and the Development Score framework for capital conversations.',
    color: 'text-gold',
  },
  {
    icon: LineChart,
    sector: 'Investment funds & family offices',
    service: 'Verified investment opportunities',
    detail: 'Deal flow with the analytics attached — yield modelling, comparable evidence and scenario projections, ready for investment committee.',
    color: 'text-primary',
  },
  {
    icon: Users,
    sector: 'SACCOs & institutions',
    service: 'Data and property analytics',
    detail: 'Member-driven property programs backed by area intelligence, affordability analytics and transparent reporting.',
    color: 'text-gold',
  },
];

const CAPABILITIES = [
  { icon: Database, title: 'Keja Data feeds', text: 'Market intelligence — price bands, yields, absorption — delivered as reports or API-shaped exports under data-sharing agreements.' },
  { icon: FileBarChart, title: 'Portfolio analytics', text: 'Composition, occupancy, yield drift and risk concentration analysis on property portfolios.' },
  { icon: Handshake, title: 'Co-branded propositions', text: 'Embed Keja verification inside your origination or wealth journey — trust as an infrastructure service.' },
  { icon: Banknote, title: 'Lead qualification', text: 'Financing and tenancy leads that arrive screened — identity-consistent, affordability-tested, intent-verified.' },
];

export default function InstitutionalPortalView() {
  const [form, setForm] = useState({ org: '', sector: 'Banks', name: '', email: '', need: '' });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="max-w-2xl">
        <Badge variant="outline" className="border-primary/40 font-bold text-primary">Keja Institutional</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          The real-estate intelligence layer for institutions
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Banks, pension funds, insurers, developers, REITs, SACCOs, investment funds, family
          offices and government institutions all touch the same asset class with different
          mandates. Keja Institutional serves each one with the intelligence and verified supply
          that matters to them.
        </p>
      </div>

      {/* sector grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTORS.map((s, i) => (
          <motion.div
            key={s.sector}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: Math.min(i * 0.05, 0.25) }}
            className="card-lift flex flex-col rounded-2xl border bg-card p-5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <s.icon className={cn('h-5 w-5', s.color)} aria-hidden />
            </div>
            <h3 className="mt-3.5 text-base font-bold">{s.sector}</h3>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-primary">{s.service}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.detail}</p>
          </motion.div>
        ))}
      </div>

      {/* capabilities + enquiry */}
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <h2 className="text-xl font-black tracking-tight">What institutions plug into</h2>
          {CAPABILITIES.map((c) => (
            <div key={c.title} className="flex gap-4 rounded-2xl border bg-card p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
                <c.icon className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <div>
                <h3 className="text-[15px] font-bold">{c.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
              </div>
            </div>
          ))}
          <Button variant="outline" className="font-bold" onClick={() => navigate('/data')}>
            Sample the intelligence on Keja Data <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
          </Button>
        </div>

        <div className="rounded-3xl border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-black tracking-tight">Institutional enquiry</h2>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Tell us your mandate — the partnerships desk responds within two business days.
          </p>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ins-org">Organisation</Label>
              <Input id="ins-org" value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} placeholder="e.g. Amani Pension Fund" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ins-sector">Sector</Label>
              <Select value={form.sector} onValueChange={(v) => setForm({ ...form, sector: v })}>
                <SelectTrigger id="ins-sector" aria-label="Sector"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SECTORS.map((s) => (
                    <SelectItem key={s.sector} value={s.sector}>{s.sector}</SelectItem>
                  ))}
                  <SelectItem value="Government">Government institution</SelectItem>
                  <SelectItem value="Property managers">Property management company</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ins-name">Your name</Label>
              <Input id="ins-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ins-email">Work email</Label>
              <Input id="ins-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ins-need">What do you need?</Label>
              <Textarea id="ins-need" rows={3} value={form.need} onChange={(e) => setForm({ ...form, need: e.target.value })} placeholder="Mandate size, asset focus, data needs…" />
            </div>
            <Button
              className="font-black"
              disabled={!form.org || !form.email}
              onClick={() =>
                toast({
                  title: 'Enquiry received',
                  description: `${form.org} — the Keja partnerships desk will reach out to ${form.email}.`,
                })
              }
            >
              Submit institutional enquiry
            </Button>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Trial platform — enquiries are acknowledged on-device in this build and route to the
              partnerships desk in the live product.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
