'use client';
/**
 * AI Deal Analyst (proposal §5) — upload documents, describe the deal, and
 * receive an honest, labelled pre-screening: Investment Score, risk level,
 * market value vs asking, yields, red flags and a recommendation.
 * Documents are processed on-device and never leave the browser.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  FileUp,
  FlaskConical,
  RotateCcw,
  ShieldAlert,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { analyzeDeal, DOC_OPTIONS, SAMPLE_DEAL, type DealAnalysis, type DealInput, type DocEntry, type DocKind } from '@/lib/dealAnalyst';
import { areaInsights } from '@/data/properties';
import { formatKES } from '@/lib/format';
import { cn } from '@/lib/utils';

const AREAS = Object.keys(areaInsights).sort();

const RISK_CLASS: Record<DealAnalysis['riskLevel'], string> = {
  Low: 'bg-primary/10 text-primary',
  Medium: 'bg-gold/15 text-gold-foreground',
  High: 'bg-destructive/10 text-destructive',
};

const RECO_CLASS: Record<DealAnalysis['recommendation'], string> = {
  Proceed: 'bg-primary text-primary-foreground',
  Negotiate: 'bg-gold text-gold-foreground',
  'Investigate Further': 'bg-gold/80 text-gold-foreground',
  'High Risk': 'bg-destructive text-destructive-foreground',
};

export default function DealAnalystView() {
  const [input, setInput] = useState<DealInput>({
    title: '',
    area: 'Kilimani',
    propertyType: 'apartment',
    sizeSqm: 120,
    askingPrice: 12_000_000,
    monthlyRentEstimate: 90_000,
    docs: [],
  });
  const [analysis, setAnalysis] = useState<DealAnalysis | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const readFile = useCallback(async (file: File): Promise<DocEntry> => {
    const kindFromName = (name: string): DocKind => {
      const n = name.toLowerCase();
      if (/(title|deed|green ?card)/.test(n)) return 'title';
      if (/(sale|agreement|offer|contract)/.test(n)) return 'sale-agreement';
      if (/(valu)/.test(n)) return 'valuation';
      if (/(lease|tenan)/.test(n)) return 'lease';
      if (/(proposal|plan)/.test(n)) return 'development-proposal';
      if (/(brochure|marketing)/.test(n)) return 'brochure';
      if (/(financ|p&l|income|statement)/.test(n)) return 'financials';
      if (/(rental|schedule)/.test(n)) return 'rental-schedule';
      if (/(budget|boq|cost)/.test(n)) return 'budget';
      return 'other';
    };
    const entry: DocEntry = {
      kind: kindFromName(file.name),
      fileName: file.name,
      sizeKb: Math.round(file.size / 1024),
    };
    // text-readable files are scanned for clause signals
    if (/\.(txt|md|csv|json)$/i.test(file.name) || file.type.startsWith('text/')) {
      entry.text = (await file.text()).slice(0, 40_000);
    }
    return entry;
  }, []);

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const entries = await Promise.all([...files].map(readFile));
      setInput((prev) => ({ ...prev, docs: [...prev.docs, ...entries].slice(0, 12) }));
    },
    [readFile],
  );

  const toggleDeclaredDoc = (kind: DocKind) =>
    setInput((prev) => ({
      ...prev,
      docs: prev.docs.some((d) => d.kind === kind && !d.fileName)
        ? prev.docs.filter((d) => !(d.kind === kind && !d.fileName))
        : [...prev.docs, { kind }],
    }));

  const run = () => setAnalysis(analyzeDeal(input));

  const docKindsPresent = useMemo(() => new Set(input.docs.map((d) => d.kind)), [input.docs]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="max-w-2xl">
        <Badge variant="outline" className="border-gold/50 text-gold font-bold">Keja AI · Deal Analyst</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          Upload the deal. Get the pre-screening.
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Attach title documents, sale agreements, valuations, leases, budgets — anything you have.
          Describe the price and the rent, and the analyst returns an investment score, a market-value
          comparison, yields, red flags and a recommendation. <strong>Files are analysed on this device
          and never uploaded.</strong>
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* ------------------------------ intake ------------------------------ */}
        <div className="space-y-5 rounded-3xl border bg-card p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="deal-title">Deal name</Label>
              <Input
                id="deal-title"
                value={input.title}
                onChange={(e) => setInput({ ...input, title: e.target.value })}
                placeholder="e.g. 3BR Kilimani apartment"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="deal-area">Area</Label>
              <Select value={input.area} onValueChange={(v) => setInput({ ...input, area: v })}>
                <SelectTrigger id="deal-area"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {AREAS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="deal-type">Property type</Label>
              <Select
                value={input.propertyType}
                onValueChange={(v) => setInput({ ...input, propertyType: v as DealInput['propertyType'] })}
              >
                <SelectTrigger id="deal-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['apartment', 'villa', 'townhouse', 'bungalow', 'land', 'commercial'].map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="deal-size">Size (m²)</Label>
              <Input
                id="deal-size"
                type="number"
                min={1}
                value={input.sizeSqm || ''}
                onChange={(e) => setInput({ ...input, sizeSqm: Number(e.target.value) })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="deal-price">Asking price (KES)</Label>
              <Input
                id="deal-price"
                type="number"
                min={0}
                step={100_000}
                value={input.askingPrice || ''}
                onChange={(e) => setInput({ ...input, askingPrice: Number(e.target.value) })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="deal-rent">Monthly rent estimate (KES)</Label>
              <Input
                id="deal-rent"
                type="number"
                min={0}
                step={5_000}
                value={input.monthlyRentEstimate || ''}
                onChange={(e) => setInput({ ...input, monthlyRentEstimate: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* upload zone */}
          <div>
            <Label>Documents</Label>
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload documents"
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void onFiles(e.dataTransfer.files);
              }}
              className={cn(
                'mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors',
                dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
              )}
            >
              <UploadCloud className="h-7 w-7 text-muted-foreground" aria-hidden />
              <p className="text-sm font-bold">Drop files here or click to browse</p>
              <p className="max-w-sm text-[11px] leading-relaxed text-muted-foreground">
                Title deeds, agreements, valuations, leases, budgets… Text files are scanned for
                clause signals; PDFs are logged by type (text extraction coming soon).
              </p>
              <input
                ref={fileRef}
                type="file"
                multiple
                className="sr-only"
                onChange={(e) => void onFiles(e.target.files)}
                aria-hidden
              />
            </div>

            {input.docs.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {input.docs.map((d, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {d.fileName ?? DOC_OPTIONS.find((o) => o.kind === d.kind)?.label}
                    </span>
                    {d.text && (
                      <Badge variant="secondary" className="text-[9px] font-bold">scanned</Badge>
                    )}
                    {d.sizeKb ? <span className="text-muted-foreground">{d.sizeKb} KB</span> : null}
                    <button
                      aria-label="Remove document"
                      onClick={() => setInput({ ...input, docs: input.docs.filter((_, j) => j !== i) })}
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex flex-wrap gap-1.5">
              {DOC_OPTIONS.map((o) => (
                <button
                  key={o.kind}
                  onClick={() => toggleDeclaredDoc(o.kind)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors',
                    docKindsPresent.has(o.kind)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:border-primary/50',
                  )}
                >
                  {o.critical && <span className="mr-0.5 text-gold" aria-hidden>•</span>}
                  {o.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              No files? Declare what you hold with the chips — the analyst treats declared-but-missing
              documents honestly in its red flags.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className="flex-1 font-black" onClick={run} disabled={!input.askingPrice}>
              <FlaskConical className="mr-1.5 h-4 w-4" aria-hidden /> Analyse this deal
            </Button>
            <Button
              variant="outline"
              className="font-bold"
              onClick={() => {
                setInput(SAMPLE_DEAL);
                setAnalysis(analyzeDeal(SAMPLE_DEAL));
              }}
            >
              Load sample deal
            </Button>
          </div>
        </div>

        {/* ----------------------------- report ------------------------------ */}
        <div>
          {!analysis ? (
            <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed bg-card/50 p-8 text-center">
              <FileUp className="h-10 w-10 text-muted-foreground/40" aria-hidden />
              <h2 className="text-lg font-bold">The report appears here</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                Fill the intake (or load the sample) and run the analysis — investment score, value
                comparison, yields, red flags and a recommendation, all evidence-labelled.
              </p>
            </div>
          ) : (
            <motion.div
              key={JSON.stringify(analysis.investmentScore) + analysis.redFlags.length}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              {/* headline card — mirrors proposal §5 mock */}
              <div className="overflow-hidden rounded-3xl border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-emerald-deep px-5 py-4 text-white">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">AI Deal Analysis</p>
                    <p className="text-lg font-black">{input.title || 'Untitled deal'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Investment Score</p>
                    <p className="text-3xl font-black tabular-nums text-gold">
                      {analysis.investmentScore.toFixed(1)}
                      <span className="text-sm text-white/70">/10</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
                  {[
                    { l: 'Risk level', v: analysis.riskLevel, chip: true },
                    { l: 'Estimated market value', v: formatKES(analysis.estimatedMarketValue) },
                    { l: 'Indicative asking price', v: formatKES(input.askingPrice) },
                    {
                      l: 'Price difference',
                      v: `${analysis.priceDifferencePct >= 0 ? '+' : ''}${analysis.priceDifferencePct.toFixed(1)}%`,
                    },
                    { l: 'Estimated gross yield', v: `${analysis.grossYieldPct.toFixed(1)}%` },
                    { l: 'Estimated net yield', v: `${analysis.netYieldPct.toFixed(1)}%` },
                  ].map((s) => (
                    <div key={s.l} className="rounded-xl bg-accent/50 p-3">
                      <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{s.l}</p>
                      {s.chip ? (
                        <span className={cn('mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-black', RISK_CLASS[analysis.riskLevel])}>
                          {s.v}
                        </span>
                      ) : (
                        <p className="mt-0.5 text-sm font-black tabular-nums">{s.v}</p>
                      )}
                    </div>
                  ))}
                </div>

                {analysis.scoreFactors.map((f) => (
                  <div key={f.label} className="border-t px-5 py-3">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-bold">
                        {f.label}
                        <span className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[8px] font-black uppercase tracking-wider text-muted-foreground">
                          {f.basis}
                        </span>
                      </span>
                      <span className="font-black tabular-nums">{f.score.toFixed(1)}</span>
                    </div>
                    <Progress value={f.score * 10} className="mt-1.5 h-1.5" aria-label={`${f.label} ${f.score} of 10`} />
                    <p className="mt-1 text-[11px] text-muted-foreground">{f.note}</p>
                  </div>
                ))}
              </div>

              {/* red flags */}
              <div className="rounded-3xl border bg-card p-5">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                  <ShieldAlert className="h-4 w-4 text-gold" aria-hidden /> Potential red flags
                </h3>
                {analysis.redFlags.length === 0 ? (
                  <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary">
                    <CheckCircle2 className="h-4 w-4" aria-hidden /> No red flags detected in this pre-screening.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {analysis.redFlags.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed">
                        <span
                          className={cn(
                            'mt-0.5 h-2 w-2 shrink-0 rounded-full',
                            f.severity === 'high' ? 'bg-destructive' : f.severity === 'medium' ? 'bg-gold' : 'bg-muted-foreground',
                          )}
                          aria-hidden
                        />
                        <span>
                          <strong className={cn('mr-1 uppercase', f.severity === 'high' && 'text-destructive')}>
                            {f.severity}:
                          </strong>
                          {f.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* document coverage */}
                <h4 className="mt-5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Document coverage
                </h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {analysis.documentCoverage.map((d) => {
                    const opt = DOC_OPTIONS.find((o) => o.kind === d.kind)!;
                    return (
                      <span
                        key={d.kind}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold',
                          d.present
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : d.critical
                              ? 'border-destructive/40 text-destructive'
                              : 'border-border text-muted-foreground',
                        )}
                      >
                        {d.present ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : <AlertTriangle className="h-3 w-3" aria-hidden />}
                        {opt.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* recommendation */}
              <div className="rounded-3xl border-2 border-gold/40 bg-gold-soft p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold-foreground">
                  AI Recommendation
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className={cn('rounded-full px-4 py-1.5 text-lg font-black', RECO_CLASS[analysis.recommendation])}>
                    {analysis.recommendation}
                  </span>
                  <button
                    onClick={() => setAnalysis(null)}
                    className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden /> New analysis
                  </button>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gold-foreground/90">{analysis.recommendationNote}</p>
                <p className="mt-4 border-t border-gold/30 pt-3 text-[11px] leading-relaxed text-gold-foreground/70">
                  <strong>Important:</strong> this AI analysis is a preliminary screen and does not replace
                  legal, valuation, financial or regulatory professional advice. Engage qualified
                  professionals before committing capital — Keja Transact can connect you.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
