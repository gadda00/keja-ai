/**
 * Keja Tokenize — portfolio dashboard: holdings, income history,
 * the Keja Ledger explorer, and demo login.
 */
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Banknote,
  Coins,
  Copy,
  Link2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  Wallet,
} from 'lucide-react';

import type {
  Investment,
  Investor,
  LedgerTx,
  ReceivedDistribution,
  TokenizedProperty,
} from '@/data/tokenize';
import { yieldPct } from '@/data/tokenize';
import { useTokenize } from '@/lib/tokenizeStore';

import {
  fmtDate,
  fmtNum,
  fmtUsd,
  img,
  propertyTypeLabel,
  SectionTitle,
  TypeIcon,
  useToast,
} from './shared';

interface Holding {
  property: TokenizedProperty;
  tokens: number;
  costBasisUsd: number;
  currentValueUsd: number;
  annualIncomeUsd: number;
  ownershipPct: number;
}

function computeHoldings(properties: TokenizedProperty[], investments: Investment[]): Holding[] {
  const byId = new Map(properties.map((p) => [p.id, p]));
  const merged = new Map<string, { tokens: number; cost: number }>();
  for (const inv of investments) {
    const cur = merged.get(inv.propertyId) ?? { tokens: 0, cost: 0 };
    cur.tokens += inv.tokenAmount;
    cur.cost += inv.totalCostUsd;
    merged.set(inv.propertyId, cur);
  }
  const holdings: Holding[] = [];
  for (const [propertyId, h] of merged) {
    const property = byId.get(propertyId);
    if (!property || h.tokens <= 0) continue;
    const incomePerToken =
      property.totalTokens > 0 ? property.annualNetIncomeUsd / property.totalTokens : 0;
    holdings.push({
      property,
      tokens: h.tokens,
      costBasisUsd: h.cost,
      currentValueUsd: h.tokens * property.tokenPriceUsd,
      annualIncomeUsd: h.tokens * incomePerToken,
      ownershipPct:
        property.totalTokens > 0 ? +((h.tokens / property.totalTokens) * 100).toFixed(4) : 0,
    });
  }
  return holdings.sort((a, b) => b.currentValueUsd - a.currentValueUsd);
}

/* ------------------------------- demo login -------------------------------- */

function DemoLogin() {
  const { openKyc, loadDemoPortfolio } = useTokenize();
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="mx-auto w-fit rounded-2xl bg-gold-50 p-4">
        <UserRound className="h-10 w-10 text-gold-600" />
      </div>
      <h1 className="mt-6 font-display text-3xl font-bold text-ink">
        Your token portfolio lives here
      </h1>
      <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-ink-muted">
        Complete KYC to start your own portfolio — or load the demo investor profile to explore a
        live dashboard with holdings, income history and the on-chain ledger.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button className="btn-gold !h-12 !px-8 !text-[14px]" onClick={() => openKyc('portfolio')}>
          Complete KYC <ArrowRight className="h-4 w-4" />
        </button>
        <button className="btn-outline !h-12 !px-8 !text-[14px]" onClick={loadDemoPortfolio}>
          <Sparkles className="h-4 w-4" /> Load demo portfolio
        </button>
      </div>
    </div>
  );
}

/* ------------------------------- stat card --------------------------------- */

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  delay,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`rounded-2xl border p-5 ${accent ? 'border-transparent bg-ink text-white shadow-gold-lg' : 'border-gold-100 bg-white'}`}
    >
      <div className="flex items-center gap-2 text-gold-600">
        <Icon className="h-4 w-4" />
        <span
          className={`text-[10.5px] font-bold uppercase tracking-[0.14em] ${accent ? 'text-gold-300' : 'text-gold-700'}`}
        >
          {label}
        </span>
      </div>
      <p className={`mt-2 text-2xl font-bold ${accent ? 'text-white' : 'text-ink'}`}>{value}</p>
      {sub ? (
        <p className={`mt-1 text-[12px] ${accent ? 'text-white/60' : 'text-ink-muted'}`}>{sub}</p>
      ) : null}
    </motion.div>
  );
}

/* ------------------------------ main portfolio ------------------------------ */

export function PortfolioView() {
  const {
    investor,
    properties,
    investments,
    ledger,
    receivedDistributions,
    signOut,
    openProperty,
  } = useTokenize();
  const { toast } = useToast();

  if (!investor) return <DemoLogin />;

  return (
    <PortfolioInner
      investor={investor}
      properties={properties}
      investments={investments}
      ledger={ledger}
      distributions={receivedDistributions}
      signOut={signOut}
      openProperty={openProperty}
      toast={toast}
    />
  );
}

function PortfolioInner({
  investor,
  properties,
  investments,
  ledger,
  distributions,
  signOut,
  openProperty,
  toast,
}: {
  investor: Investor;
  properties: TokenizedProperty[];
  investments: Investment[];
  ledger: LedgerTx[];
  distributions: ReceivedDistribution[];
  signOut: () => void;
  openProperty: (id: string) => void;
  toast: (t: { title: string; description?: string }) => void;
}) {
  const holdings = computeHoldings(properties, investments);
  const portfolioValue = holdings.reduce((s, h) => s + h.currentValueUsd, 0);
  const costBasis = holdings.reduce((s, h) => s + h.costBasisUsd, 0);
  const annualIncome = holdings.reduce((s, h) => s + h.annualIncomeUsd, 0);
  const lifetimeDistributions = distributions.reduce((s, d) => s + d.amountUsd, 0);
  const totalTokens = holdings.reduce((s, h) => s + h.tokens, 0);
  const blendedYield = costBasis > 0 ? ((annualIncome / costBasis) * 100).toFixed(1) : '0.0';
  const initials = investor.fullName
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('');

  return (
    <div className="min-h-screen bg-cream">
      <div className="container-luxe py-10">
        {/* investor header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-gradient text-lg font-bold text-white shadow-gold-md">
              {initials}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                {investor.fullName}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px]">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-700">
                  <ShieldCheck className="h-3 w-3" /> KYC VERIFIED
                </span>
                <button
                  className="inline-flex items-center gap-1 font-mono text-gold-700 hover:text-ink"
                  onClick={() => {
                    navigator.clipboard?.writeText(investor.walletAddress).catch(() => {});
                    toast({ title: 'Wallet address copied' });
                  }}
                >
                  {investor.walletAddress.slice(0, 14)}…{investor.walletAddress.slice(-6)}{' '}
                  <Copy className="h-3 w-3" />
                </button>
                {investor.demo ? (
                  <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-[11px] font-bold text-gold-700">
                    DEMO PROFILE
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <button
            className="text-[12px] font-semibold text-gold-700 hover:text-ink"
            onClick={signOut}
          >
            Sign out of demo session
          </button>
        </div>

        {/* stats */}
        <div className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Wallet}
            label="Portfolio value"
            value={fmtUsd(portfolioValue)}
            sub={`${fmtNum(totalTokens)} tokens held`}
            accent
            delay={0}
          />
          <StatCard
            icon={TrendingUp}
            label="Projected annual income"
            value={fmtUsd(annualIncome, 2)}
            sub={`Blended yield ${blendedYield}%`}
            delay={0.08}
          />
          <StatCard
            icon={Banknote}
            label="Distributions received"
            value={fmtUsd(lifetimeDistributions, 2)}
            sub={`${distributions.length} payouts to date`}
            delay={0.16}
          />
          <StatCard
            icon={Coins}
            label="Cost basis"
            value={fmtUsd(costBasis)}
            sub={`${holdings.length} assets · USD denominated`}
            delay={0.24}
          />
        </div>

        {/* holdings */}
        <div className="mt-12">
          <SectionTitle eyebrow="Holdings" title="Your tokenized assets" />
          <div className="mt-6 space-y-4">
            {holdings.length === 0 && (
              <div className="rounded-2xl border border-gold-100 bg-white p-8 text-center text-[13px] text-ink-muted">
                No holdings yet — acquire your first tokens from the marketplace.
              </div>
            )}
            {holdings.map((h, i) => (
              <motion.div
                key={h.property.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className="flex cursor-pointer flex-col gap-4 rounded-2xl border border-gold-100 bg-white p-4 transition hover:border-gold-200 hover:shadow-card sm:flex-row sm:items-center"
                onClick={() => openProperty(h.property.id)}
              >
                <img
                  src={img(h.property.imageUrl)}
                  alt={h.property.title}
                  loading="lazy"
                  className="h-24 w-full rounded-xl object-cover sm:h-20 sm:w-32"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-gold-600">
                    <TypeIcon type={h.property.propertyType} className="h-3.5 w-3.5" />
                    {propertyTypeLabel(h.property.propertyType)} · {h.property.tokenSymbol}
                  </div>
                  <h3 className="mt-1 text-[15px] font-bold text-ink">{h.property.title}</h3>
                  <p className="text-[12.5px] text-ink-muted">{h.property.city}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-muted">
                    <span>
                      <strong className="text-ink">{fmtNum(h.tokens)}</strong> tokens
                    </span>
                    <span>
                      <strong className="text-ink">{h.ownershipPct}%</strong> of the SPV
                    </span>
                    <span>
                      Net yield{' '}
                      <strong className="text-ink">{yieldPct(h.property).toFixed(1)}%</strong>
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:w-72">
                  <div className="text-center sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gold-700">
                      Value
                    </p>
                    <p className="text-[14px] font-bold text-ink">{fmtUsd(h.currentValueUsd)}</p>
                  </div>
                  <div className="text-center sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gold-700">
                      Income/yr
                    </p>
                    <p className="text-[14px] font-bold text-emerald-700">
                      {fmtUsd(h.annualIncomeUsd, 2)}
                    </p>
                  </div>
                  <div className="text-center sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gold-700">
                      Status
                    </p>
                    <p className="text-[13px] font-bold text-ink">
                      {h.property.status === 'LIVE'
                        ? 'Income-paying'
                        : h.property.status === 'FUNDING'
                          ? 'Funding'
                          : 'Pre-launch'}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* distributions + ledger */}
        <div className="mt-12 grid gap-8 grid-cols-1 lg:grid-cols-2">
          <div>
            <SectionTitle eyebrow="Income" title="Distribution history" />
            <div className="mt-6 overflow-hidden rounded-2xl border border-gold-100 bg-white">
              {distributions.length === 0 ? (
                <p className="p-6 text-center text-[13px] text-ink-muted">
                  No distributions yet — your first payout will appear here.
                </p>
              ) : (
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-gold-100 bg-cream text-left text-[10.5px] font-bold uppercase tracking-wider text-gold-700">
                      <th className="px-4 py-2.5">Period</th>
                      <th className="px-4 py-2.5">Asset</th>
                      <th className="px-4 py-2.5 text-right">Per token</th>
                      <th className="px-4 py-2.5 text-right">You received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributions.map((d) => (
                      <tr key={d.id} className="border-b border-gold-50 last:border-0">
                        <td className="px-4 py-3 font-semibold text-ink">{d.period}</td>
                        <td className="px-4 py-3 text-ink-muted">{d.symbol}</td>
                        <td className="px-4 py-3 text-right font-mono text-[12px] text-ink-muted">
                          ${d.perTokenUsd.toFixed(4)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">
                          {fmtUsd(d.amountUsd, 2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div>
            <SectionTitle eyebrow="On-chain record" title="Keja Ledger activity" />
            <div className="mt-6 overflow-hidden rounded-2xl border border-ink/15 bg-ink">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-300">
                  <Link2 className="h-3.5 w-3.5" /> Keja Ledger — Regulated Simulation
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/70">
                  {ledger.length} TX
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {ledger.length === 0 && (
                  <p className="p-6 text-center text-[12px] text-white/50">No transactions yet.</p>
                )}
                {ledger.map((tx, i) => (
                  <div
                    key={tx.txHash}
                    className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? 'border-t border-white/5' : ''}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[11px] text-gold-300">{tx.txHash}</p>
                      <p className="mt-0.5 text-[11px] text-white/50">
                        Block {tx.blockNumber.toLocaleString()} · {fmtDate(tx.timestamp)} ·{' '}
                        {fmtNum(tx.tokens)} {tx.symbol}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                      {tx.type === 'ISSUANCE' ? 'ISSUED' : 'CONFIRMED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-muted">
              <Coins className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-600" />
              In production, tokens are issued as regulated security tokens (ERC-3643-class) on a
              public chain with transfer restrictions, whitelisting and auditor access. This demo
              runs the same flows on a private simulation ledger.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
