'use client';
/**
 * KEJA INSTITUTIONAL (proposal §10) — the portal for banks, pension funds,
 * insurance companies, developers, REITs, SACCOs, investment funds, family
 * offices, government institutions and property managers, each with the
 * sector-specific service that matters to them.
 *
 * Wave 18: this is a gated workspace (PortalGate, institution lane) —
 * "Banks & Lenders" is one of the eight stakeholder cards, and it now
 * behaves like the others: guests get the sign-in/registration gate, the
 * wrong-lane accounts get the one-click switch, institutions get the desk.
 * The enquiry form is no longer a dead-end toast: it files a real partner
 * application (type 'institution') into the admin console's Partners tab
 * where the desk adjudicates it, prefilled from the signed-in account.
 */
import { useMemo, useState } from 'react';
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
  TrendingUp,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { PortalGate } from '@/components/common/PortalGate';
import { usePartners, logAudit, type PartnerApplication } from '@/lib/adminStore';
import { useAllProperties } from '@/lib/inventory';
import { useAuth } from '@/lib/auth';
import { formatKES } from '@/lib/format';
import { navigate } from '@/lib/router';
import { newId } from '@/lib/uuid';
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

/* ------------------------------------------------------------------ */
/* Workspace interior                                                   */
/* ------------------------------------------------------------------ */

/** Live market snapshot — the intelligence the desk actually sells,
 *  computed from the real inventory (not a hardcoded slide). */
function MarketSnapshot() {
  const all = useAllProperties();
  const stats = useMemo(() => {
    const priced = all.filter((p) => !p.priceOnApplication);
    const med = [...priced].sort((a, b) => a.price - b.price)[Math.floor(priced.length / 2)];
    const avgTrust = all.reduce((s, p) => s + p.trustScore, 0) / (all.length || 1);
    const byArea = new Map<string, number>();
    for (const p of all) byArea.set(p.area, (byArea.get(p.area) ?? 0) + 1);
    const topAreas = [...byArea.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    return { count: all.length, median: med?.price ?? 0, avgTrust, topAreas };
  }, [all]);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[
        { l: 'Live verified listings', v: stats.count.toLocaleString(), s: 'on the marketplace today' },
        { l: 'Median list price', v: formatKES(stats.median), s: 'across all areas' },
        { l: 'Average Trust Score', v: stats.avgTrust.toFixed(0), s: 'evidence-weighted, audited' },
        { l: 'Coverage', v: `${stats.topAreas.length}+ areas`, s: stats.topAreas.map(([a]) => a).slice(0, 3).join(' · ') },
      ].map((m) => (
        <div key={m.l} className="card-lift rounded-2xl border bg-card p-4 sm:p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{m.l}</p>
          <p className="mt-2 text-xl font-black tabular-nums sm:text-2xl">{m.v}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{m.s}</p>
        </div>
      ))}
    </div>
  );
}

function InstitutionWorkspace() {
  const { user } = useAuth();
  const [partners, setPartners] = usePartners();
  const [form, setForm] = useState(() => ({
    org: user?.company ?? '',
    sector: 'Banks',
    name: user?.name ?? '',
    email: user?.email ?? '',
    need: '',
  }));

  const myEnquiries = useMemo(
    () =>
      partners.filter(
        (p) => p.type === 'institution' && p.email.toLowerCase() === (user?.email ?? '').toLowerCase(),
      ),
    [partners, user],
  );

  const submit = () => {
    if (!form.org || !form.email) return;
    const application: PartnerApplication = {
      id: newId('ptn'),
      orgName: form.org,
      contactName: form.name || user?.name || 'Institutional contact',
      email: form.email,
      phone: user?.phone,
      type: 'institution',
      market: form.sector,
      listingsCount: 0,
      message: form.need || 'Institutional workspace enquiry',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setPartners([application, ...partners]);
    logAudit({
      actor: user?.name ?? 'Institutional contact',
      actorEmail: user?.email ?? form.email,
      action: 'institution.enquiry',
      target: form.org,
      detail: `${form.sector} enquiry filed to the partnerships desk (${application.id})`,
      severity: 'info',
    });
    toast({
      title: 'Enquiry filed',
      description: `${form.org} is on the partnerships desk queue — status is visible below and in your account.`,
    });
    setForm((f) => ({ ...f, need: '' }));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
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
        <div className="rounded-2xl border bg-card px-4 py-3">
          <p className="text-xs font-black">{user?.company || user?.name}</p>
          <p className="text-[10px] text-muted-foreground">{user?.email} · institution account</p>
        </div>
      </div>

      {/* live intelligence snapshot */}
      <h2 className="mt-8 flex items-center gap-2 text-sm font-black uppercase tracking-wider">
        <TrendingUp className="h-4 w-4 text-gold" aria-hidden /> Market intelligence — live snapshot
      </h2>
      <div className="mt-4">
        <MarketSnapshot />
      </div>
      <div className="mt-3">
        <Button variant="outline" size="sm" className="font-bold" onClick={() => navigate('/data')}>
          Open the full market data desk <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
        </Button>
      </div>

      {/* sector grid */}
      <h2 className="mt-10 text-xl font-black tracking-tight">Sectors we serve</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTORS.map((s) => (
          <div key={s.sector} className="card-lift flex flex-col rounded-2xl border bg-card p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <s.icon className={cn('h-5 w-5', s.color)} aria-hidden />
            </div>
            <h3 className="mt-3.5 text-base font-bold">{s.sector}</h3>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-primary">{s.service}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.detail}</p>
          </div>
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
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border bg-card p-5 sm:p-6">
            <h2 className="text-lg font-black tracking-tight">Institutional enquiry</h2>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Tell us your mandate — the partnerships desk responds within two business days, and
              the enquiry status tracks right here.
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
              <Button className="font-black" disabled={!form.org || !form.email} onClick={submit}>
                Submit institutional enquiry
              </Button>
            </div>
          </div>

          {myEnquiries.length > 0 && (
            <div className="rounded-3xl border bg-card p-5">
              <h3 className="text-sm font-black uppercase tracking-wider">Your enquiries</h3>
              <div className="mt-3 space-y-2">
                {myEnquiries.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl border bg-background/50 px-3.5 py-2.5 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold">{e.orgName} · {e.market}</p>
                      <p className="mt-0.5 text-muted-foreground">
                        {new Date(e.createdAt).toLocaleDateString('en-KE')} · {e.id}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'shrink-0 text-[10px] font-bold capitalize',
                        e.status === 'pending' ? 'border-gold/50 text-gold-foreground' : 'border-primary/40 text-primary',
                      )}
                    >
                      {e.status}
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
                Filed to the partnerships desk (admin console → Partners) — status updates land
                here and in your account notifications on the live product.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ the gate ----------------------------------- */

/** The institutional workspace — one of the eight stakeholder workspaces
 *  (wave 18 portal reality). */
export default function InstitutionalPortalView() {
  return (
    <PortalGate
      badge="Keja Institutional"
      title="The institutional desk"
      blurb="Sign in for the intelligence layer — live market snapshot, qualified financing leads and portfolio analytics, with your enquiries tracked to the partnerships desk."
      lane="institution"
      laneLabel="an institution"
      laneTitle="Bank / Lender / Institution"
      intent="the institutional workspace"
      features={[
        {
          icon: Landmark,
          title: 'Live intelligence',
          text: 'Verified inventory, median pricing and trust coverage computed from the real marketplace — not a static slide.',
        },
        {
          icon: Banknote,
          title: 'Qualified leads',
          text: 'Financing leads arrive screened — identity-consistent, affordability-tested — with verified collateral files behind them.',
        },
        {
          icon: FileBarChart,
          title: 'Portfolio analytics',
          text: 'Composition, occupancy and yield drift on property portfolios, plus data feeds under data-sharing agreements.',
        },
      ]}
      footnote={
        <>
          Individual professional? The{' '}
          <button className="font-semibold text-primary hover:underline" onClick={() => navigate('/pro')}>
            Pro workspace
          </button>{' '}
          covers agents and valuers; institutional mandates live here.
        </>
      }
    >
      <InstitutionWorkspace />
    </PortalGate>
  );
}
