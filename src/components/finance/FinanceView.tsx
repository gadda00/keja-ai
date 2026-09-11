'use client';
/**
 * KEJA FINANCE (proposal §9) — mortgage calculator, eligibility assessment
 * (CBK 33% DTI), bank comparison and the financing-type explorer
 * (development · construction · land · diaspora · investment finance).
 */
import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, } from '@/components/charts/reexports';
import {
  BadgeCheck,
  Building,
  Coins,
  Hammer,
  Landmark,
  LandPlot,
  Plane,
  ReceiptText,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  BUYING_COSTS,
  MORTGAGE_MARKET,
  calculateAffordability,
  calculateMortgage,
} from '@/lib/finance';
import { formatKES } from '@/lib/format';
import { useRouter } from '@/lib/router';

function MortgageCalculator({ initialPrice }: { initialPrice: number }) {
  const [price, setPrice] = useState(initialPrice || 15_000_000);
  const [depositPct, setDepositPct] = useState(20);
  const [rate, setRate] = useState(MORTGAGE_MARKET.typicalRate);
  const [years, setYears] = useState(MORTGAGE_MARKET.typicalTerm);

  const result = useMemo(
    () => calculateMortgage({ propertyPrice: price, depositPct, annualRatePct: rate, termYears: years }),
    [price, depositPct, rate, years],
  );

  const costs = useMemo(
    () =>
      BUYING_COSTS.map((c) => ({ ...c, amount: Math.round((price * c.pct) / 100) })),
    [price],
  );
  const totalCosts = costs.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-6 rounded-3xl border bg-card p-5 sm:p-6">
        <div className="grid gap-2">
          <Label htmlFor="mc-price">Property price (KES)</Label>
          <Input
            id="mc-price"
            type="number"
            min={1_000_000}
            step={500_000}
            value={price || ''}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Deposit — {depositPct}%</Label>
            <span className="text-xs font-bold text-muted-foreground">{formatKES(result.deposit)}</span>
          </div>
          <Slider min={MORTGAGE_MARKET.minDepositPct} max={60} step={1} value={[depositPct]} onValueChange={([v]) => setDepositPct(v)} aria-label="Deposit percentage" />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Interest rate</Label>
            <span className="text-xs font-bold text-muted-foreground">{rate.toFixed(1)}% p.a.</span>
          </div>
          <Slider min={MORTGAGE_MARKET.rateRange[0]} max={MORTGAGE_MARKET.rateRange[1]} step={0.25} value={[rate]} onValueChange={([v]) => setRate(v)} aria-label="Interest rate" />
          <p className="text-[10px] text-muted-foreground">Market context: {MORTGAGE_MARKET.rateRange[0]}–{MORTGAGE_MARKET.rateRange[1]}% (2026 indicative)</p>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Term</Label>
            <span className="text-xs font-bold text-muted-foreground">{years} years</span>
          </div>
          <Slider min={5} max={MORTGAGE_MARKET.maxTerm} step={1} value={[years]} onValueChange={([v]) => setYears(v)} aria-label="Term in years" />
        </div>

        <div className="rounded-2xl bg-emerald-deep p-4 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gold">Monthly repayment</p>
          <p className="mt-1 text-3xl font-black tabular-nums">{formatKES(Math.round(result.monthlyRepayment))}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold text-white/80">
            <span>Principal: {formatKES(result.principal)}</span>
            <span>Total interest: {formatKES(Math.round(result.totalInterest))}</span>
            <span>Total repayable: {formatKES(Math.round(result.totalRepayment))}</span>
            <span>Cash needed day one: {formatKES(result.deposit + totalCosts)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-3xl border bg-card p-5">
          <h3 className="text-sm font-black uppercase tracking-wider">Balance over time</h3>
          <div className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={result.schedule}>
                <defs>
                  <linearGradient id="gBal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v: number) => `${Math.round(v / 1e6)}M`} />
                <Tooltip formatter={(v) => formatKES(Number(v ?? 0))} contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="balance" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#gBal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
            <ReceiptText className="h-4 w-4 text-gold" aria-hidden /> Buying cost stack
          </h3>
          <div className="mt-3 space-y-2">
            {costs.map((c) => (
              <div key={c.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  {c.statutory && <BadgeCheck className="h-3.5 w-3.5 text-primary" aria-hidden />}
                  {c.label}
                </span>
                <span className="font-bold tabular-nums">{formatKES(c.amount)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-2 text-sm font-black">
              <span>Total transaction costs</span>
              <span className="tabular-nums">{formatKES(totalCosts)}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full font-bold"
            onClick={() =>
              toast({
                title: 'Financing enquiry started',
                description: 'Keja will connect you with partner banks for current offers — indicative figures only until then.',
              })
            }
          >
            Talk to a financing partner
          </Button>
        </div>
      </div>
    </div>
  );
}

function EligibilityAssessment() {
  const [income, setIncome] = useState(250_000);
  const [obligations, setObligations] = useState(20_000);
  const [rate, setRate] = useState(MORTGAGE_MARKET.typicalRate);
  const [years, setYears] = useState(MORTGAGE_MARKET.typicalTerm);
  const [depositPct, setDepositPct] = useState(20);

  const r = useMemo(
    () => calculateAffordability({ netMonthlyIncome: income, otherMonthlyObligations: obligations, annualRatePct: rate, termYears: years, depositPct }),
    [income, obligations, rate, years, depositPct],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6 rounded-3xl border bg-card p-5 sm:p-6">
        <div className="grid gap-2">
          <Label htmlFor="el-income">Net monthly income (KES)</Label>
          <Input id="el-income" type="number" min={0} step={10_000} value={income || ''} onChange={(e) => setIncome(Number(e.target.value))} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="el-obligations">Other monthly obligations (KES)</Label>
          <Input id="el-obligations" type="number" min={0} step={5_000} value={obligations || ''} onChange={(e) => setObligations(Number(e.target.value))} />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Deposit</Label>
            <span className="text-xs font-bold text-muted-foreground">{depositPct}%</span>
          </div>
          <Slider min={10} max={60} step={1} value={[depositPct]} onValueChange={([v]) => setDepositPct(v)} aria-label="Deposit percentage" />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Rate</Label>
            <span className="text-xs font-bold text-muted-foreground">{rate.toFixed(1)}%</span>
          </div>
          <Slider min={MORTGAGE_MARKET.rateRange[0]} max={MORTGAGE_MARKET.rateRange[1]} step={0.25} value={[rate]} onValueChange={([v]) => setRate(v)} aria-label="Interest rate" />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Term</Label>
            <span className="text-xs font-bold text-muted-foreground">{years} years</span>
          </div>
          <Slider min={5} max={25} step={1} value={[years]} onValueChange={([v]) => setYears(v)} aria-label="Term in years" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl bg-gradient-to-b from-primary to-emerald-deep p-5 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gold">Indicative eligibility</p>
          <p className="mt-2 text-3xl font-black tabular-nums">{formatKES(Math.round(r.maxPropertyPrice))}</p>
          <p className="mt-1 text-xs font-semibold text-white/75">maximum supportable property price</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-semibold text-white/85">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-white/60">Max instalment</p>
              <p className="mt-0.5 text-sm font-black">{formatKES(Math.round(r.maxInstalment))}/mo</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-white/60">Required deposit</p>
              <p className="mt-0.5 text-sm font-black">{formatKES(Math.round(r.requiredDeposit))}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-white/60">Max principal</p>
              <p className="mt-0.5 text-sm font-black">{formatKES(Math.round(r.maxPrincipal))}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-white/60">Debt-service ratio</p>
              <p className="mt-0.5 text-sm font-black">{r.dtiPct}% (CBK guidance)</p>
            </div>
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Screening uses the CBK-consistent 33% debt-to-income ceiling and the inputs you provide.
          Final eligibility is always the lender&rsquo;s decision — this assessment simply positions you
          before you walk into the bank.
        </p>
      </div>
    </div>
  );
}

/** Indicative partner-bank comparison (ranges typical of the 2026 market). */
const BANK_PRODUCTS = [
  { bank: 'KCB', rate: '10.5–12.5%', maxTerm: 25, maxLtv: 90, diaspora: true, note: 'Wide branch network; strong existing-customer pricing.' },
  { bank: 'Stanbic', rate: '11.0–13.0%', maxTerm: 20, maxLtv: 80, diaspora: true, note: 'Dedicated diaspora mortgage desk; USD options.' },
  { bank: 'Absa', rate: '11.5–13.5%', maxTerm: 20, maxLtv: 80, diaspora: false, note: 'Fast pre-approval; green-home rate discount.' },
  { bank: 'NCBA', rate: '12.0–14.0%', maxTerm: 20, maxLtv: 85, diaspora: false, note: 'Flexible salary-plus-rent income structuring.' },
  { bank: 'I&M', rate: '11.0–13.0%', maxTerm: 20, maxLtv: 80, diaspora: true, note: 'Private-banking tiers; off-plan finance experience.' },
  { bank: 'Co-op Bank', rate: '11.5–13.5%', maxTerm: 20, maxLtv: 85, diaspora: true, note: 'SACCO-linked savings paths to the deposit.' },
  { bank: 'Standard Chartered', rate: '10.5–12.0%', maxTerm: 20, maxLtv: 70, diaspora: true, note: 'Priority banking; strong USD-earner packages.' },
];

function BankComparison() {
  return (
    <div>
      <div className="overflow-x-auto rounded-3xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-accent/40 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3.5">Institution</th>
              <th className="px-4 py-3.5">Indicative rate</th>
              <th className="px-4 py-3.5 text-right">Max term</th>
              <th className="px-4 py-3.5 text-right">Max LTV</th>
              <th className="px-4 py-3.5">Diaspora</th>
              <th className="px-4 py-3.5">Notes</th>
            </tr>
          </thead>
          <tbody>
            {BANK_PRODUCTS.map((b) => (
              <tr key={b.bank} className="border-b transition-colors last:border-0 hover:bg-accent/30">
                <td className="px-5 py-3.5 font-black">{b.bank}</td>
                <td className="px-4 py-3.5 font-bold tabular-nums text-primary">{b.rate}</td>
                <td className="px-4 py-3.5 text-right tabular-nums">{b.maxTerm} yrs</td>
                <td className="px-4 py-3.5 text-right tabular-nums">{b.maxLtv}%</td>
                <td className="px-4 py-3.5">
                  {b.diaspora ? <Badge className="border-0 bg-primary/10 text-[10px] font-bold text-primary">Available</Badge> : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3.5 text-xs text-muted-foreground">{b.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Rates are indicative 2026 market ranges for guidance only — not offers. Keja connects
        borrowers with partner institutions for binding quotes; partner terms always prevail.
      </p>
    </div>
  );
}

const FINANCE_TYPES = [
  { icon: Landmark, title: 'Mortgage finance', text: 'Owner-occupier and buy-to-let mortgages across the partner-bank panel, with eligibility pre-screening on-platform.' },
  { icon: Hammer, title: 'Construction finance', text: 'Stage-linked disbursement for build projects — progress valuations and drawdown schedules managed with the lender.' },
  { icon: LandPlot, title: 'Land finance', text: 'Land purchase loans with balloon and instalment structures, including agricultural-zoned parcels.' },
  { icon: Building, title: 'Development finance', text: 'Senior and mezzanine structures for developers, sized against presales and the Keja Development Score.' },
  { icon: Plane, title: 'Diaspora financing', text: 'USD and KES packages for Kenyans abroad — remote onboarding, escrowed disbursement and verified-title collateral.' },
  { icon: Coins, title: 'Investment financing', text: 'Portfolio-level facilities against rental income, plus fractional positions in the tokenization trial.' },
];

export default function FinanceView() {
  const { route } = useRouter();
  const initialPrice = parseInt(route.query.price ?? '0', 10) || 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="max-w-2xl">
        <Badge variant="outline" className="border-primary/40 font-bold text-primary">Keja Finance</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          From discovery to financing in one journey
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          The financing marketplace: work out the mortgage, test your eligibility before the bank
          does, compare institutions, and connect with the right lender — mortgages, development,
          construction, land, diaspora and investment finance.
        </p>
      </div>

      <Tabs defaultValue="mortgage" className="mt-8">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="mortgage" className="gap-1.5 font-bold"><Landmark className="h-4 w-4" aria-hidden /> Mortgage calculator</TabsTrigger>
          <TabsTrigger value="eligibility" className="gap-1.5 font-bold"><BadgeCheck className="h-4 w-4" aria-hidden /> Eligibility</TabsTrigger>
          <TabsTrigger value="banks" className="gap-1.5 font-bold"><Building className="h-4 w-4" aria-hidden /> Compare banks</TabsTrigger>
          <TabsTrigger value="types" className="gap-1.5 font-bold"><Coins className="h-4 w-4" aria-hidden /> Financing types</TabsTrigger>
        </TabsList>
        <TabsContent value="mortgage" className="mt-6"><MortgageCalculator initialPrice={initialPrice} /></TabsContent>
        <TabsContent value="eligibility" className="mt-6"><EligibilityAssessment /></TabsContent>
        <TabsContent value="banks" className="mt-6"><BankComparison /></TabsContent>
        <TabsContent value="types" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FINANCE_TYPES.map((t) => (
              <div key={t.title} className="card-lift rounded-2xl border bg-card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                  <t.icon className="h-5 w-5 text-primary" aria-hidden />
                </div>
                <h3 className="mt-3.5 text-[15px] font-bold">{t.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.text}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 px-0 font-bold text-primary"
                  onClick={() => toast({ title: `${t.title} enquiry noted`, description: 'A Keja financing specialist will follow up with partner options.' })}
                >
                  Enquire →
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-3xl border border-gold/40 bg-gold-soft p-5">
            <p className="flex items-center gap-2 text-sm font-black text-gold-foreground">
              <TrendingUp className="h-4 w-4" aria-hidden /> The long-term path
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-gold-foreground/85">
              Property discovery → AI analysis → financing → transaction. Every financing lead on
              Keja arrives pre-analysed: verified title, screened pricing and a Trust Score — a
              better loan book for the lender, a faster yes for the borrower.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
