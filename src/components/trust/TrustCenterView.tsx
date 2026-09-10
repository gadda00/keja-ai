'use client';
/**
 * TRUST & SECURITY CENTER (proposal §15) — data protection, KYC/AML, identity
 * verification, document security, cybersecurity, audit trails, AI limitations,
 * human verification, regulatory compliance, partner standards and complaints —
 * plus the public CLAIMS REGISTER that keeps the platform honest about what is
 * live, simulated, partner-dependent or planned, and the Trust Score
 * methodology (§4).
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BadgeCheck,
  Database,
  FileLock2,
  Fingerprint,
  Gavel,
  KeyRound,
  LifeBuoy,
  ScrollText,
  ServerCog,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CAPABILITY_CLAIMS, type ClaimStatus } from '@/data/claims';
import { trustScore, type TrustFactor } from '@/lib/trustScore';
import { useAllProperties } from '@/lib/inventory';
import { useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<ClaimStatus, string> = {
  live: 'bg-primary/10 text-primary',
  simulated: 'bg-gold/15 text-gold-foreground',
  'partner-dependent': 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
  planned: 'bg-muted text-muted-foreground',
};

const PILLARS = [
  { icon: Database, title: 'Data protection', text: 'Kenya Data Protection Act discipline: data minimisation, purpose limitation, local-first storage in this build, and lawful-basis documentation for every field collected.' },
  { icon: Fingerprint, title: 'Identity verification', text: 'KYC-grade identity checks for investors and agents — document + biometric steps through licensed providers as flows go live.' },
  { icon: KeyRound, title: 'KYC / AML', text: 'Source-of-funds screening, sanctions screening and record-keeping aligned to the Proceeds of Crime and Anti-Money Laundering Act obligations.' },
  { icon: FileLock2, title: 'Document security', text: 'Documents analysed on-device in the Deal Analyst; nothing uploaded without explicit intent. Signed documents carry tamper-evident hashes at go-live.' },
  { icon: ServerCog, title: 'Cybersecurity', text: 'Least-privilege access, encrypted transport and storage, dependency hygiene, and a rehearsed incident-response plan with notification paths.' },
  { icon: ScrollText, title: 'Audit trails', text: 'Verification decisions, score changes and admin actions append to an immutable log — reviewable, time-stamped, attributable.' },
  { icon: AlertTriangle, title: 'AI limitations', text: 'Keja AI is decision support. It labels FACT vs ESTIMATE vs ASSUMPTION, escalates legal, tax, valuation and suitability questions to humans, and never presents itself as professional advice.' },
  { icon: UserCheck, title: 'Human verification', text: 'Machines screen; humans adjudicate. The verification desk reviews anomalies, user reports and edge cases — with published turnaround standards.' },
  { icon: Gavel, title: 'Regulatory compliance', text: 'CMA sandbox engagement for tokenization, LSK-aligned conveyancing panel standards, and CBK-consistent affordability guidance.' },
  { icon: Users, title: 'Partner standards', text: 'Partners inherit the claims-register discipline: verified inputs only, no pay-to-play trust, SLA transparency and complaints accountability.' },
  { icon: LifeBuoy, title: 'Complaints procedure', text: 'Report an issue on any listing or answer; every report enters the adjudication queue with a response standard. Independent escalation path documented.' },
];

/** Trust Score methodology reference factors (§4) — weights from the engine. */
function MethodologyPanel() {
  const all = useAllProperties();
  const sample = all[0];
  const result = sample ? trustScore(sample) : null;
  const weights = useMemo(() => {
    if (!result) return [] as TrustFactor[];
    return [...result.factors].sort((a, b) => b.weight - a.weight);
  }, [result]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-black tracking-tight">The KEJA Trust Score™ — twelve factors, fully labelled</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Every listing carries a 0–100 composite computed from twelve weighted dimensions. Each
          factor declares its evidential basis — FACT (verified on-platform evidence), ESTIMATE
          (model-derived) or ASSUMPTION (default where no data exists). Scores are decision
          support, never guarantees.
        </p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {weights.map((f) => (
            <div key={f.key} className="flex items-center gap-3 rounded-xl border p-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold">{f.label}</p>
                <p className="text-[10px] text-muted-foreground">weight ×{Math.round(f.weight * 100)}% · basis {f.basis}</p>
              </div>
              <span className="text-sm font-black tabular-nums text-primary">{Math.round(f.score)}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-5">
          {[
            ['90–100', 'Exceptional', 'bg-primary text-primary-foreground'],
            ['80–89', 'Strong', 'bg-primary/85 text-primary-foreground'],
            ['70–79', 'Moderate', 'bg-gold text-gold-foreground'],
            ['60–69', 'High Risk', 'bg-gold/80 text-gold-foreground'],
            ['<60', 'Significant DD', 'bg-destructive text-destructive-foreground'],
          ].map(([range, label, cls]) => (
            <div key={range} className={cn('rounded-xl p-3 text-center', cls)}>
              <p className="text-xs font-black">{range}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide opacity-90">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-black tracking-tight">Evidence freshness model</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Every verification check carries a scope, a method, a check date and a 90-day validity
          window. Fresh checks earn a green state; recheck-due turns amber; expired evidence
          decays the listing&rsquo;s claims until refreshed. Evidence panels on every listing expose
          this state — nothing silently rots.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ['Fresh', 'Checked within 90 days', 92],
            ['Recheck due', 'Approaching the 90-day window', 55],
            ['Expired', 'Older than 90 days — claims decay', 12],
          ].map(([k, v, pct]) => (
            <div key={k as string} className="rounded-xl border p-4">
              <p className="text-xs font-black uppercase tracking-wider">{k}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{v}</p>
              <Progress value={pct as number} className="mt-2 h-1.5" aria-label={`${k} state`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClaimsRegister() {
  const [filter, setFilter] = useState<ClaimStatus | 'all'>('all');
  const filtered = useMemo(
    () => (filter === 'all' ? CAPABILITY_CLAIMS : CAPABILITY_CLAIMS.filter((c) => c.status === filter)),
    [filter],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: CAPABILITY_CLAIMS.length };
    for (const cl of CAPABILITY_CLAIMS) c[cl.status] = (c[cl.status] ?? 0) + 1;
    return c;
  }, []);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {(['all', 'live', 'simulated', 'partner-dependent', 'planned'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-bold capitalize transition-colors',
              filter === f ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/50',
            )}
          >
            {f === 'partner-dependent' ? 'partner-dependent' : f} ({counts[f] ?? 0})
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {filtered.map((c) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border bg-card p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="max-w-2xl text-sm font-bold leading-snug">{c.claim}</p>
              <Badge variant="outline" className={cn('shrink-0 text-[10px] font-black uppercase tracking-wider', STATUS_STYLE[c.status])}>
                {c.status}
              </Badge>
            </div>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{c.surface}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{c.evidence}</p>
            {c.pathToLive && (
              <p className="mt-2 rounded-lg bg-accent/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Path to live:</strong> {c.pathToLive}
              </p>
            )}
            <p className="mt-2 text-[10px] text-muted-foreground/70">Last reviewed {c.lastReviewed}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function TrustCenterView() {
  const { route } = useRouter();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="max-w-2xl">
        <Badge variant="outline" className="border-primary/40 font-bold text-primary">Keja Verify · Trust & Security Center</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          Trust is the product
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Fraud is the tax on African real estate. This center documents how Keja earns the
          opposite: the verification methodology, the security posture, the AI&rsquo;s limits — and
          a public claims register that separates what is live from what is simulated, on every
          capability the platform mentions.
        </p>
      </div>

      <Tabs defaultValue={route.query.tab === 'claims' ? 'claims' : 'pillars'} className="mt-8">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="pillars" className="gap-1.5 font-bold"><ShieldCheck className="h-4 w-4" aria-hidden /> Trust & security pillars</TabsTrigger>
          <TabsTrigger value="methodology" className="gap-1.5 font-bold"><BadgeCheck className="h-4 w-4" aria-hidden /> Score methodology</TabsTrigger>
          <TabsTrigger value="claims" className="gap-1.5 font-bold"><ScrollText className="h-4 w-4" aria-hidden /> Claims register</TabsTrigger>
        </TabsList>

        <TabsContent value="pillars" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className="card-lift rounded-2xl border bg-card p-5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                  <p.icon className="h-5 w-5 text-primary" aria-hidden />
                </div>
                <h3 className="mt-3.5 text-[15px] font-bold">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
              </motion.div>
            ))}
          </div>
          <p className="mt-6 rounded-2xl border border-gold/40 bg-gold-soft p-4 text-xs leading-relaxed text-gold-foreground/85">
            Security.txt: responsible-disclosure contact is published at{' '}
            <code className="font-mono font-bold">/.well-known/security.txt</code>. We thank
            researchers who give us 90 days before public disclosure.
          </p>
        </TabsContent>

        <TabsContent value="methodology" className="mt-6"><MethodologyPanel /></TabsContent>
        <TabsContent value="claims" className="mt-6">
          <div className="mb-4 rounded-2xl border bg-accent/40 p-4 text-sm leading-relaxed text-muted-foreground">
            The register renders verbatim from <code className="font-mono text-xs">src/data/claims.ts</code> —
            the site cannot claim what is not declared there. Statuses: <strong>live</strong> (works
            as described), <strong>simulated</strong> (demo-build simulation),{' '}
            <strong>partner-dependent</strong> (needs a partner integration),{' '}
            <strong>planned</strong> (roadmap).
          </div>
          <ClaimsRegister />
        </TabsContent>
      </Tabs>
    </div>
  );
}
