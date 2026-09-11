'use client';
/**
 * KEJA TOKEN — fractional real-estate ownership in TRIAL MODE (proposal §13).
 *
 * Five fictional Nairobi assets, a $25,000 virtual wallet, KYC-gated
 * subscriptions, a simulated ledger with an order-matched secondary market,
 * distribution accrual on a fast-forwardable trial clock, an issuer console,
 * and the full issuance journey: Asset Selection → Legal Due Diligence →
 * Independent Valuation → SPV Structure → Regulatory Review → KYC/AML →
 * Token Issuance → Investment → Distribution & Reporting.
 *
 * No real securities are offered. Digital tokens are clearly distinguished
 * from legal ownership of underlying real estate.
 */
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Building2,
  Coins,
  FastForward,
  Factory,
  FileSearch,
  Gavel,
  Landmark,
  LineChart,
  PlusCircle,
  ScrollText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTokenize, type KycForm } from '@/lib/tokenizeStore';
import type { TokenizedProperty } from '@/data/tokenize';
import { useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';

const fmtUsd = (n: number, d = 0) => `$${n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d })}`;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

/* ------------------------------- shared bits ------------------------------ */

function StatusBadge({ status }: { status: TokenizedProperty['status'] }) {
  const cls =
    status === 'LIVE'
      ? 'bg-primary text-primary-foreground'
      : status === 'FUNDING'
        ? 'bg-gold text-gold-foreground'
        : status === 'FUNDED'
          ? 'bg-emerald-600 text-white'
          : 'bg-muted text-muted-foreground';
  return <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider', cls)}>{status}</span>;
}

function AssetCard({ p, onOpen }: { p: TokenizedProperty; onOpen: () => void }) {
  const funded = (p.tokensSold / p.totalTokens) * 100;
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      onClick={onOpen}
      className="card-lift group overflow-hidden rounded-2xl border bg-card text-left"
      aria-label={`Open ${p.title}`}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        <img src={p.imageUrl} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <StatusBadge status={p.status} />
          <span className="rounded-full bg-black/50 px-2 py-1 font-mono text-[10px] font-bold text-white backdrop-blur-sm">{p.tokenSymbol}</span>
        </div>
      </div>
      <div className="space-y-2.5 p-4">
        <div>
          <h3 className="line-clamp-1 text-[15px] font-bold">{p.title}</h3>
          <p className="text-xs text-muted-foreground">{p.location}, {p.city}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-accent/60 py-1.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Yield</p>
            <p className="text-xs font-black text-primary">{fmtPct(((p.annualNetIncomeUsd / p.totalValueUsd) * 100))}</p>
          </div>
          <div className="rounded-lg bg-accent/60 py-1.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Token</p>
            <p className="text-xs font-black">{fmtUsd(p.tokenPriceUsd)}</p>
          </div>
          <div className="rounded-lg bg-accent/60 py-1.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Investors</p>
            <p className="text-xs font-black">{p.investorCount}</p>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
            <span>{p.status === 'FUNDING' ? `Funding — ${fmtPct(funded)} subscribed` : `${fmtUsd(p.totalValueUsd / 1e6, 1)}M asset value`}</span>
            <span>{p.distributionFreq === 'MONTHLY' ? 'Monthly' : 'Quarterly'} distributions</span>
          </div>
          <Progress value={funded} className="mt-1 h-1.5" aria-label={`${funded}% funded`} />
        </div>
      </div>
    </motion.button>
  );
}

/* ------------------------------ asset detail ------------------------------ */

function AssetDetail({ p, onBack }: { p: TokenizedProperty; onBack: () => void }) {
  const tk = useTokenize();
  const [amount, setAmount] = useState(50);
  const [sellAmount, setSellAmount] = useState(0);
  const held = tk.investments.filter((i) => i.propertyId === p.id).reduce((s, i) => s + i.tokenAmount, 0);
  const price = tk.marketPrice(p.id);
  const cost = amount * price;
  // primary availability: LIVE offerings are fully subscribed — buys route
  // to the order-matched secondary market instead of minting new tokens.
  const primaryAvailable = Math.max(0, p.totalTokens - p.tokensSold);
  const fullySubscribed = primaryAvailable === 0;

  const doBuy = () => {
    if (!tk.investor) {
      tk.openKyc('invest');
      tk.openProperty(p.id);
      return;
    }
    if (fullySubscribed) {
      // secondary market: walk the ask side of the book
      tk.buySecondary(p.id, amount);
    } else {
      tk.buyTokens(p.id, Math.min(amount, primaryAvailable));
    }
    setSellAmount(0);
  };
  const doSell = () => {
    if (sellAmount > 0) tk.sellSecondary(p.id, sellAmount);
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All assets
      </button>

      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="relative aspect-[21/9] bg-muted">
          <img src={p.imageUrl} alt={p.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" aria-hidden />
          <div className="absolute bottom-0 left-0 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <StatusBadge status={p.status} />
              <span className="rounded-full bg-black/50 px-2 py-0.5 font-mono text-[10px] font-bold text-white">{p.tokenSymbol}</span>
            </div>
            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">{p.title}</h2>
            <p className="text-sm font-semibold text-white/80">{p.tagline}</p>
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Asset value', fmtUsd(p.totalValueUsd / 1e6, 1) + 'M'],
                ['Net yield', fmtPct((p.annualNetIncomeUsd / p.totalValueUsd) * 100)],
                ['Occupancy', `${p.occupancyPct}%`],
                ['Appreciation', `+${p.appreciationPct}%/yr`],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-accent/50 p-3">
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{l}</p>
                  <p className="mt-0.5 text-sm font-black">{v}</p>
                </div>
              ))}
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">{p.description}</p>

            <div>
              <h3 className="text-xs font-black uppercase tracking-wider">Asset highlights</h3>
              <ul className="mt-2 space-y-2">
                {p.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /> {h}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border p-4">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Legal structure</h4>
                <p className="mt-1 text-sm font-bold">{p.legalStructure}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Jurisdiction: {p.jurisdiction}</p>
              </div>
              <div className="rounded-xl border p-4">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Token contract (simulated)</h4>
                <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{p.contractAddress}</p>
              </div>
            </div>

            {p.distributions.length > 0 && (
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider">Distribution history</h3>
                <div className="mt-2 overflow-hidden rounded-xl border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-accent/40 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2">Period</th>
                        <th className="px-3 py-2">Paid</th>
                        <th className="px-3 py-2 text-right">Per token</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.distributions.map((d) => (
                        <tr key={d.id} className="border-t">
                          <td className="px-3 py-2 font-semibold">{d.periodLabel}</td>
                          <td className="px-3 py-2">{d.payDate}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-bold">${d.perTokenUsd.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* trade panel */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                  {fullySubscribed ? 'Buy on secondary' : 'Subscribe'}
                </p>
                <Badge variant="secondary" className="text-[9px] font-bold">
                  {fullySubscribed ? 'order-book fills' : `min ${p.minTokens} tokens`}
                </Badge>
              </div>
              <p className="mt-3 text-2xl font-black tabular-nums">
                {fmtUsd(tk.marketPrice(p.id))}
                <span className="text-sm font-bold text-muted-foreground"> / token</span>
              </p>
              <div className="mt-4 grid gap-2">
                <Label htmlFor="tk-amt">Token amount</Label>
                <Input id="tk-amt" type="number" min={p.minTokens} value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))} />
                <div className="flex gap-1.5">
                  {[50, 200, 500].map((v) => (
                    <button key={v} onClick={() => setAmount(v)} className="flex-1 rounded-lg border py-1.5 text-xs font-bold hover:border-primary">
                      {v}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-xl bg-accent/60 px-3 py-2.5 text-sm">
                  <span className="text-muted-foreground">Total cost</span>
                  <span className="font-black tabular-nums">{fmtUsd(cost, 2)}</span>
                </div>
                <Button className="font-black" disabled={amount < p.minTokens} onClick={doBuy}>
                  <Coins className="mr-1.5 h-4 w-4" aria-hidden />
                  {!tk.investor
                    ? 'Complete KYC to invest'
                    : fullySubscribed
                      ? `Buy ${amount} on secondary`
                      : 'Subscribe (trial wallet)'}
                </Button>
                {held > 0 && (
                  <div className="rounded-xl border border-gold/40 bg-gold-soft p-3">
                    <p className="text-[11px] font-bold text-gold-foreground">You hold {held.toLocaleString()} {p.tokenSymbol}</p>
                    <div className="mt-2 flex gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={held}
                        value={sellAmount || ''}
                        placeholder="Sell on secondary"
                        onChange={(e) => setSellAmount(Math.min(held, Math.max(0, Number(e.target.value))))}
                        className="h-8 text-xs"
                      />
                      <Button size="sm" variant="outline" className="h-8 shrink-0 font-bold" disabled={sellAmount <= 0} onClick={doSell}>
                        Sell
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              TRIAL MODE — fictional asset, simulated ledger, virtual wallet. Digital tokens here do
              not represent legal ownership of any underlying real estate. Live issuance awaits the
              full regulatory pathway shown in Learn.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- KYC modal ------------------------------- */

function KycModal() {
  const tk = useTokenize();
  const [form, setForm] = useState<KycForm>({
    fullName: '', email: '', phone: '', country: '',
    idType: 'NATIONAL_ID', idNumber: '', sourceOfFunds: '',
  });
  if (!tk.kycOpen) return null;
  /** Close and discard — KYC identifiers are NEVER persisted (audit F-02):
   *  nothing entered here reaches localStorage, the network, or the ledger. */
  const closeAndDiscard = () => {
    setForm({ fullName: '', email: '', phone: '', country: '', idType: 'NATIONAL_ID', idNumber: '', sourceOfFunds: '' });
    tk.closeKyc();
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Investor KYC">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border bg-card p-6 slim-scroll">
        <div className="flex items-center gap-2.5">
          <UserCheck className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-lg font-black">Investor KYC / AML</h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Trial-mode onboarding: the same KYC/AML steps a live issuance would require — identity,
          contact and source-of-funds screening. Any values work in this trial.
        </p>
        {/* Data-collection notice (audit F-02 / P0-2, Kenya DPA 2019 aligned) */}
        <div className="mt-3 rounded-xl border border-primary/25 bg-primary/5 p-3 text-[11px] leading-relaxed text-muted-foreground" role="note">
          <p className="font-bold text-foreground">Before you type anything real:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>This trial does <strong>not verify identities</strong> and no issuance is live.</li>
            <li>Your ID / passport number and source of funds are <strong>used in-memory only and discarded when this dialog closes</strong> — they are never saved to this device, never sent to any server, and never attached to your wallet.</li>
            <li>Only your name, contact details and country are kept (on this device) to label the trial wallet.</li>
          </ul>
          <p className="mt-1.5">
            Prefer not to share even that? Enter placeholder values — the trial works identically.
            See <a className="font-semibold underline" href="#/legal" onClick={closeAndDiscard}>privacy policy</a>.
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {([
            ['fullName', 'Full name'], ['email', 'Email'], ['phone', 'Phone'], ['country', 'Country of residence'],
            ['idNumber', 'ID / Passport number (any value — not saved)'], ['sourceOfFunds', 'Source of funds (any value — not saved)'],
          ] as const).map(([k, l]) => (
            <div key={k} className="grid gap-1">
              <Label htmlFor={`kyc-${k}`}>{l}</Label>
              <Input
                id={`kyc-${k}`}
                value={form[k]}
                autoComplete="off"
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1 font-bold" onClick={closeAndDiscard}>Cancel</Button>
          <Button
            className="flex-1 font-black"
            disabled={!form.fullName || !form.email || !form.idNumber}
            onClick={() => {
              // completeKyc persists only contact fields; the identifier
              // fields (idNumber, sourceOfFunds) are deliberately dropped.
              tk.completeKyc(form);
              closeAndDiscard();
            }}
          >
            Verify & open wallet
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------- learn: journey ---------------------------- */

const JOURNEY = [
  { icon: Building2, title: 'Asset Selection', text: 'Institutional-grade real estate is selected — income-producing, verified title, defensible location economics.' },
  { icon: FileSearch, title: 'Legal Due Diligence', text: 'Independent counsel reviews title, encumbrances, leases and structuring risk before anything is offered.' },
  { icon: LineChart, title: 'Independent Valuation', text: 'A licensed valuer sets market value — token pricing is anchored to it, never to hype.' },
  { icon: Landmark, title: 'SPV / Ownership Structure', text: 'A special-purpose vehicle holds the asset; tokens evidence beneficial interests inside a clean legal wrapper.' },
  { icon: Gavel, title: 'Regulatory & Compliance Review', text: 'CMA sandbox and licensing pathways, disclosure documents and investor protections — no live issuance before approval.' },
  { icon: UserCheck, title: 'Investor KYC / AML', text: 'Every subscriber is identity- and source-of-funds screened before allocation.' },
  { icon: Sparkles, title: 'Token Issuance', text: 'Tokens are issued against the SPV, with supply capped at the audited asset value.' },
  { icon: TrendingUp, title: 'Investment', text: 'Investors subscribe from minimum ticket sizes, on a transparent, order-matched secondary market.' },
  { icon: Coins, title: 'Distribution & Reporting', text: 'Rental income flows to token holders on schedule, with performance and audit reporting throughout the hold.' },
];

function Learn() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border bg-card p-6">
        <h2 className="text-xl font-black">The tokenization journey</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Real-estate tokenization done properly is a legal-and-compliance product with a technology
          interface — not the other way round. Every Keja offering walks this path before a single
          token reaches an investor.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {JOURNEY.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(i * 0.05, 0.3) }}
              className="relative rounded-2xl border bg-background/50 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                  <step.icon className="h-4.5 w-4.5 text-primary" aria-hidden />
                </div>
                <span className="font-mono text-[10px] font-black text-muted-foreground">STEP {String(i + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="mt-3 text-sm font-bold">{step.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.text}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-gold/50 bg-gold-soft p-6">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-gold-foreground">
            <ScrollText className="h-4 w-4" aria-hidden /> Tokens vs legal ownership
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-gold-foreground/85">
            The platform clearly distinguishes between <strong>digital tokens</strong> (the
            recorded instrument) and <strong>legal ownership of the underlying real estate</strong>
            (held by the SPV, governed by Kenyan law). Tokens are not land, and land is not a
            database row — the bridge between them is the legal structure, and it is never implied
            away.
          </p>
        </div>
        <div className="rounded-3xl border bg-card p-6">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> Regulatory readiness
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Chacadom has prepared a CMA Regulatory Sandbox application pack — a twelve-month testing
            plan with participation caps, segregated client money, phase gates and a rehearsed
            wind-down. Any live tokenization launches only inside the appropriate legal, regulatory
            and compliance structure.
          </p>
          <Button variant="outline" size="sm" className="mt-3 font-bold" onClick={() => window.open('/docs/Chacadom_CMA_Sandbox_Testing_Plan.pdf', '_blank')}>
            Read the testing plan (PDF)
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ issuer console ---------------------------- */

function IssuerConsole() {
  const tk = useTokenize();
  const [draft, setDraft] = useState({
    title: '', tagline: '', description: '', location: 'Nairobi', city: 'Nairobi',
    totalValueUsd: 2_000_000, tokenPriceUsd: 10, minTokens: 10,
    annualNetIncomeUsd: 150_000, appreciationPct: 5, occupancyPct: 90, managementFeePct: 8,
  });
  const tokens = Math.round(draft.totalValueUsd / draft.tokenPriceUsd);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-4 rounded-3xl border bg-card p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
          <Factory className="h-4 w-4 text-gold" aria-hidden /> Issue a fictional asset (trial)
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Walk the issuer side: structure an SPV-wrapped offering, set tokenomics and open it to the
          trial market. Everything is simulated.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 grid gap-1.5">
            <Label htmlFor="iss-title">Asset title</Label>
            <Input id="iss-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Riverside Medical Suites" />
          </div>
          <div className="col-span-2 grid gap-1.5">
            <Label htmlFor="iss-tagline">Tagline</Label>
            <Input id="iss-tagline" value={draft.tagline} onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} placeholder="One-line investment thesis" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="iss-value">Asset value (USD)</Label>
            <Input id="iss-value" type="number" value={draft.totalValueUsd || ''} onChange={(e) => setDraft({ ...draft, totalValueUsd: Number(e.target.value) })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="iss-price">Token price (USD)</Label>
            <Input id="iss-price" type="number" value={draft.tokenPriceUsd || ''} onChange={(e) => setDraft({ ...draft, tokenPriceUsd: Number(e.target.value) })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="iss-income">Annual net income (USD)</Label>
            <Input id="iss-income" type="number" value={draft.annualNetIncomeUsd || ''} onChange={(e) => setDraft({ ...draft, annualNetIncomeUsd: Number(e.target.value) })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="iss-min">Minimum tokens</Label>
            <Input id="iss-min" type="number" value={draft.minTokens || ''} onChange={(e) => setDraft({ ...draft, minTokens: Number(e.target.value) })} />
          </div>
        </div>
        <div className="rounded-xl bg-accent/60 p-3 text-xs font-semibold text-muted-foreground">
          {tokens.toLocaleString()} tokens will be minted · implied net yield{' '}
          <strong className="text-foreground">{fmtPct((draft.annualNetIncomeUsd / Math.max(draft.totalValueUsd, 1)) * 100)}</strong>
        </div>
        <Button
          className="w-full font-black"
          disabled={!draft.title || !draft.tagline || draft.totalValueUsd <= 0}
          onClick={() => {
            tk.issueProperty({
              ...draft,
              propertyType: 'MIXED_USE',
              distributionFreq: 'QUARTERLY',
              jurisdiction: 'Kenya',
              spvName: `Keja ${draft.title.split(' ')[0]} Holdings Ltd (Trial)`,
              description: draft.description || draft.tagline,
              highlights: ['Issuer-console asset (trial)', 'Simulated SPV structure', 'Order-book secondary trading'],
            });
          }}
        >
          <PlusCircle className="mr-1.5 h-4 w-4" aria-hidden /> Open the offering
        </Button>
      </div>

      <div className="rounded-3xl border bg-card p-5 sm:p-6">
        <h3 className="text-sm font-black uppercase tracking-wider">Post-issuance console</h3>
        <p className="mt-1.5 text-xs text-muted-foreground">Custom trial offerings and their funding status.</p>
        <div className="mt-4 space-y-3">
          {tk.properties.filter((p) => p.custom).length === 0 && (
            <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
              No custom offerings yet — structure one on the left and it appears here with funding controls.
            </p>
          )}
          {tk.properties.filter((p) => p.custom).map((p) => {
            const funded = (p.tokensSold / p.totalTokens) * 100;
            return (
              <div key={p.id} className="rounded-2xl border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{p.title}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{p.tokenSymbol} · {p.legalStructure}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <Progress value={funded} className="mt-3 h-1.5" aria-label={`${funded}% funded`} />
                <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                  <span>{fmtPct(funded)} funded · {p.tokensSold.toLocaleString()}/{p.totalTokens.toLocaleString()} tokens</span>
                  {p.status === 'FUNDED' && (
                    <Button size="sm" variant="outline" className="h-7 text-[11px] font-bold" onClick={() => tk.openTrading(p.id)}>
                      Open secondary trading
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- portfolio -------------------------------- */

function PortfolioPanel() {
  const tk = useTokenize();
  const positions = useMemo(
    () =>
      tk.investments.reduce<Record<string, number>>((acc, inv) => {
        acc[inv.propertyId] = (acc[inv.propertyId] ?? 0) + inv.tokenAmount;
        return acc;
      }, {}),
    [tk.investments],
  );
  const assetsById = useMemo(() => new Map(tk.properties.map((p) => [p.id, p])), [tk.properties]);
  const totalValue = Object.entries(positions).reduce(
    (s, [id, n]) => s + n * tk.marketPrice(id),
    0,
  );
  const totalCost = tk.investments.reduce((s, i) => s + i.totalCostUsd, 0);

  if (!tk.investor) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed bg-card/60 py-16 text-center">
        <UserCheck className="h-10 w-10 text-muted-foreground/40" aria-hidden />
        <h2 className="text-lg font-black">Complete KYC to open your trial portfolio</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          The same gate a live issuance would apply — identity, contact and source-of-funds —
          simulated on-device.
        </p>
        <Button className="font-black" onClick={() => tk.openKyc('portfolio')}>Start KYC</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ['Wallet balance', fmtUsd(tk.walletUsd)],
          ['Positions value', fmtUsd(totalValue)],
          ['Invested (cost)', fmtUsd(totalCost)],
          ['Distributions received', fmtUsd(tk.receivedDistributions.reduce((s, d) => s + d.amountUsd, 0))],
        ].map(([l, v]) => (
          <div key={l} className="rounded-2xl border bg-card p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{l}</p>
            <p className="mt-1.5 text-xl font-black tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border bg-card p-5">
          <h3 className="text-sm font-black uppercase tracking-wider">Holdings</h3>
          <div className="mt-3 space-y-2">
            {Object.entries(positions).map(([id, n]) => {
              const asset = assetsById.get(id);
              if (!asset) return null;
              return (
                <div key={id} className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
                  <div>
                    <p className="font-bold">{asset.title}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{asset.tokenSymbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black tabular-nums">{n.toLocaleString()} tokens</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{fmtUsd(n * tk.marketPrice(id))}</p>
                  </div>
                </div>
              );
            })}
            {Object.keys(positions).length === 0 && (
              <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                No positions yet — subscribe to an offering in the marketplace.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-5">
          <h3 className="text-sm font-black uppercase tracking-wider">Simulated ledger</h3>
          <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto slim-scroll pr-1">
            {[...tk.ledger].reverse().slice(0, 30).map((tx) => (
              <div key={tx.txHash} className="flex items-center justify-between rounded-lg bg-accent/40 px-3 py-2 text-[11px]">
                <div className="min-w-0">
                  <p className="truncate font-bold">{tx.type === 'PURCHASE' ? 'Bought' : tx.type === 'SALE' ? 'Sold' : 'Issued'} {tx.symbol}</p>
                  <p className="truncate font-mono text-[9px] text-muted-foreground">{tx.txHash.slice(0, 26)}…</p>
                </div>
                <div className="text-right">
                  <p className="font-black tabular-nums">{tx.tokens.toLocaleString()}</p>
                  <p className="text-[9px] text-muted-foreground tabular-nums">{fmtUsd(tx.totalCostUsd, 2)}</p>
                </div>
              </div>
            ))}
            {tk.ledger.length === 0 && (
              <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                Ledger entries appear here as you trade.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-black uppercase tracking-wider">Distributions received</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="font-bold" onClick={tk.advanceTrialCycle}>
              <FastForward className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Fast-forward one cycle
            </Button>
          </div>
        </div>
        <div className="mt-3 max-h-60 space-y-1.5 overflow-y-auto slim-scroll pr-1">
          {[...tk.receivedDistributions].reverse().map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2 text-[11px]">
              <div>
                <p className="font-bold">{d.symbol} · {d.period}</p>
                <p className="text-[9px] text-muted-foreground">paid {d.payDate}</p>
              </div>
              <p className="font-black tabular-nums text-primary">+{fmtUsd(d.amountUsd, 2)}</p>
            </div>
          ))}
          {tk.receivedDistributions.length === 0 && (
            <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
              Fast-forward the trial clock to accrue distributions on your holdings.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- shell ---------------------------------- */

export default function TokenizeView() {
  const tk = useTokenize();
  const { route } = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const asset = tk.properties.find((p) => p.id === selected) ?? null;
  const initialTab = route.query.tab ?? 'marketplace';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* trial wallet header */}
      <div className="overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-r from-emerald-deep via-emerald-deep to-emerald-deep/80 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-gold" aria-hidden />
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Keja Token</h1>
              <Badge className="border-0 bg-gold text-[10px] font-black uppercase tracking-widest text-gold-foreground">Trial Mode</Badge>
            </div>
            <p className="mt-1.5 max-w-xl text-sm text-white/75">
              Fractional ownership of fictional Nairobi assets — virtual wallet, simulated ledger,
              real mechanics. No real securities, no real money.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gold">
                <Wallet className="h-3.5 w-3.5" aria-hidden /> Trial wallet
              </p>
              <p className="mt-0.5 text-2xl font-black tabular-nums">{fmtUsd(tk.walletUsd)}</p>
            </div>
            <div className="grid gap-2">
              <Button size="sm" className="bg-gold font-black text-gold-foreground hover:bg-gold/90" onClick={tk.topUpTrial}>
                <PlusCircle className="mr-1 h-3.5 w-3.5" aria-hidden /> Top up $10k
              </Button>
              <Button size="sm" variant="outline" className="border-white/25 font-bold text-white hover:bg-white/10 hover:text-white" onClick={tk.resetTrial}>
                Reset trial
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue={initialTab} className="mt-7">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="marketplace" className="gap-1.5 font-bold"><Building2 className="h-4 w-4" aria-hidden /> Marketplace</TabsTrigger>
          <TabsTrigger value="portfolio" className="gap-1.5 font-bold"><TrendingUp className="h-4 w-4" aria-hidden /> Portfolio</TabsTrigger>
          <TabsTrigger value="issuer" className="gap-1.5 font-bold"><Factory className="h-4 w-4" aria-hidden /> Issuer console</TabsTrigger>
          <TabsTrigger value="learn" className="gap-1.5 font-bold"><BookOpen className="h-4 w-4" aria-hidden /> How it works</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="mt-6">
          <AnimatePresence mode="wait">
            {asset ? (
              <AssetDetail key={asset.id} p={asset} onBack={() => setSelected(null)} />
            ) : (
              <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {tk.properties.map((p) => (
                  <AssetCard key={p.id} p={p} onOpen={() => setSelected(p.id)} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>
        <TabsContent value="portfolio" className="mt-6"><PortfolioPanel /></TabsContent>
        <TabsContent value="issuer" className="mt-6"><IssuerConsole /></TabsContent>
        <TabsContent value="learn" className="mt-6"><Learn /></TabsContent>
      </Tabs>

      <KycModal />
    </div>
  );
}
