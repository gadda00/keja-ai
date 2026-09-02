/**
 * Keja Tokenize — token purchase flow:
 * order → confirm → staged blockchain broadcast → ownership certificate.
 */
import { AnimatePresence, m } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  Coins,
  Copy,
  Link2,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { tokensAvailable } from '@/data/tokenize';
import type { BuyResult } from '@/lib/tokenizeStore';
import { useTokenize } from '@/lib/tokenizeStore';

import { fmtNum, fmtUsd, img, Modal, useToast } from './shared';

const PROCESS_STAGES = [
  'Building transaction…',
  'Signing with your wallet…',
  'Broadcasting to Keja Ledger…',
  'Awaiting block confirmation…',
];

export function InvestModal() {
  const { investPropertyId, closeInvest, investor, setView, properties, buyTokens } = useTokenize();
  const { toast } = useToast();

  const p = useMemo(
    () => properties.find((x) => x.id === investPropertyId) ?? null,
    [properties, investPropertyId]
  );

  const [step, setStep] = useState<'order' | 'confirm' | 'processing' | 'success'>('order');
  const [tokens, setTokens] = useState<number | null>(null);
  const [ack, setAck] = useState(false);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<BuyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (investPropertyId) {
      setStep('order');
      setTokens(null);
      setAck(false);
      setStage(0);
      setResult(null);
      setError(null);
    }
  }, [investPropertyId]);

  const maxBuy = p ? Math.max(p.minTokens, Math.min(tokensAvailable(p), 2000)) : 0;
  // Sold-out LIVE offerings previously still let a user configure an order
  // (maxBuy was floored at minTokens even with 0 available) that only failed
  // at execute. Disable the CTA instead — the secondary market is the venue.
  const soldOut = p ? tokensAvailable(p) <= 0 : false;
  const amount = p
    ? Math.min(Math.max(tokens ?? Math.min(p.minTokens * 5, maxBuy), p.minTokens), maxBuy)
    : 0;
  const cost = amount * (p?.tokenPriceUsd ?? 0);
  const incomePerToken = p && p.totalTokens > 0 ? p.annualNetIncomeUsd / p.totalTokens : 0;
  const annualIncome = amount * incomePerToken;

  const stageTimerRef = useRef<number | null>(null);
  const broadcastRef = useRef<number | null>(null);
  // Safety net: if the modal unmounts mid-broadcast, stop timers and drop
  // pending state updates (the old code leaked the interval and set state on
  // an unmounted component).
  useEffect(
    () => () => {
      if (stageTimerRef.current) window.clearInterval(stageTimerRef.current);
      if (broadcastRef.current) window.clearTimeout(broadcastRef.current);
    },
    []
  );

  function execute() {
    if (!p) return;
    setStep('processing');
    setStage(0);
    const stageTimer = window.setInterval(
      () => setStage((s) => Math.min(s + 1, PROCESS_STAGES.length - 1)),
      900
    );
    stageTimerRef.current = stageTimer;
    broadcastRef.current = window.setTimeout(() => {
      try {
        const r = buyTokens(p.id, amount);
        setResult(r);
        setStep('success');
        toast({
          title: `${fmtNum(amount)} ${p.tokenSymbol} tokens acquired`,
          description: `Confirmed on Keja Ledger · block ${r.blockNumber.toLocaleString()}`,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Purchase failed');
        setStep('order');
      } finally {
        window.clearInterval(stageTimer);
        stageTimerRef.current = null;
        broadcastRef.current = null;
      }
    }, 3200);
  }

  return (
    <Modal
      open={!!investPropertyId}
      onClose={() => {
        if (step !== 'processing') closeInvest();
      }}
      title={p ? `Buy ${p.tokenSymbol} — Keja Tokenize` : 'Buy tokens'}
      subtitle={
        p
          ? `${p.title} · $${p.tokenPriceUsd} per token · ${p.distributionFreq === 'MONTHLY' ? 'monthly' : 'quarterly'} distributions`
          : undefined
      }
      icon={<Coins className="h-5 w-5" />}
    >
      <AnimatePresence mode="wait">
        {/* ─── order ─── */}
        {step === 'order' && p ? (
          <m.div
            key="order"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
          >
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-semibold text-ink">{fmtNum(amount)} tokens</span>
              <span className="text-ink-muted">
                min {fmtNum(p.minTokens)} · {fmtNum(tokensAvailable(p))} available
              </span>
            </div>
            <input
              type="range"
              min={p.minTokens}
              max={Math.max(maxBuy, p.minTokens + 1)}
              step={Math.max(1, Math.round(p.minTokens / 2))}
              value={amount}
              onChange={(e) => setTokens(parseInt(e.target.value, 10))}
              aria-label="Number of tokens"
              className="mt-3 w-full accent-gold-600"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {[p.minTokens, 100, 500, 1000].map((t) => {
                const val = Math.max(p.minTokens, Math.min(t, maxBuy));
                return (
                  <button
                    key={t}
                    onClick={() => setTokens(val)}
                    className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                      amount === val
                        ? 'border-gold-600 bg-gold-50 text-gold-700'
                        : 'border-gold-100 text-ink-muted hover:border-gold-300'
                    }`}
                  >
                    {fmtNum(val)} · {fmtUsd(val * p.tokenPriceUsd)}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 space-y-2.5 rounded-xl bg-cream p-4 text-[13px]">
              <div className="flex justify-between">
                <span className="text-ink-muted">
                  {fmtNum(amount)} × ${p.tokenPriceUsd}
                </span>
                <span className="font-semibold text-ink">{fmtUsd(cost)}</span>
              </div>
              <div className="flex justify-between text-[12px] text-gold-700">
                <span>Platform fee — pilot</span>
                <span className="font-semibold">Waived ($0)</span>
              </div>
              <div className="flex justify-between border-t border-gold-200 pt-2.5">
                <span className="font-bold text-ink">Total</span>
                <span className="font-bold text-ink">{fmtUsd(cost)}</span>
              </div>
              <div className="flex justify-between text-[12.5px]">
                <span className="text-ink-muted">Projected income</span>
                <span className="font-semibold text-emerald-700">
                  {fmtUsd(annualIncome, 2)}/yr ·{' '}
                  {((p.annualNetIncomeUsd / p.totalValueUsd) * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <button className="btn-gold mt-5 !h-11 w-full" onClick={() => setStep('confirm')}>
              Review order <ArrowRight className="h-4 w-4" />
            </button>
          </m.div>
        ) : null}

        {/* ─── confirm ─── */}
        {step === 'confirm' && p ? (
          <m.div
            key="confirm"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
          >
            <div className="rounded-xl border border-gold-100 p-4">
              <div className="flex items-center gap-3">
                <img
                  src={img(p.imageUrl)}
                  alt={p.title}
                  className="h-14 w-20 rounded-lg object-cover"
                />
                <div>
                  <p className="text-[14px] font-semibold text-ink">{p.title}</p>
                  <p className="text-[12px] text-ink-muted">
                    {p.tokenSymbol} · {p.location}, {p.city}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2.5 text-[13px]">
                <div className="rounded-lg bg-cream p-2.5">
                  <p className="text-[10px] font-bold uppercase text-gold-700">Tokens</p>
                  <p className="font-bold text-ink">{fmtNum(amount)}</p>
                </div>
                <div className="rounded-lg bg-cream p-2.5">
                  <p className="text-[10px] font-bold uppercase text-gold-700">Total cost</p>
                  <p className="font-bold text-ink">{fmtUsd(cost)}</p>
                </div>
                <div className="rounded-lg bg-cream p-2.5">
                  <p className="text-[10px] font-bold uppercase text-gold-700">Est. income</p>
                  <p className="font-bold text-emerald-700">{fmtUsd(annualIncome, 2)}/yr</p>
                </div>
                <div className="rounded-lg bg-cream p-2.5">
                  <p className="text-[10px] font-bold uppercase text-gold-700">Buyer</p>
                  <p className="truncate font-bold text-ink">
                    {investor?.fullName ?? 'Demo investor'}
                  </p>
                </div>
              </div>
            </div>

            {error ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[12.5px] text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            ) : null}

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-gold-100 p-3.5">
              <input
                type="checkbox"
                className="mt-0.5 accent-gold-600"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              <span className="text-[12.5px] leading-relaxed text-ink-muted">
                I understand this is a <strong>demonstration purchase</strong> on the Keja Ledger
                simulation; real-world tokens would be illiquid, subject to offering documents, and
                income projections are not guaranteed.
              </span>
            </label>

            <div className="mt-4 flex gap-2">
              <button className="btn-outline flex-1" onClick={() => setStep('order')}>
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button className="btn-gold flex-[2]" disabled={!ack || soldOut} onClick={execute}>
                <BadgeDollarSign className="h-4 w-4" />
                {soldOut
                  ? 'Fully funded — trade on the secondary market'
                  : `Confirm ${fmtUsd(cost)} purchase`}
              </button>
            </div>
          </m.div>
        ) : null}

        {/* ─── processing ─── */}
        {step === 'processing' && (
          <m.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="relative">
                <Loader2 className="h-14 w-14 animate-spin text-gold-600" />
                <Link2 className="absolute inset-0 m-auto h-6 w-6 text-gold-700" />
              </div>
              <div className="w-full max-w-xs space-y-2">
                {PROCESS_STAGES.map((s, i) => (
                  <div
                    key={s}
                    className={`flex items-center gap-2 text-[13px] ${
                      i < stage
                        ? 'text-emerald-700'
                        : i === stage
                          ? 'font-semibold text-ink'
                          : 'text-ink-faint'
                    }`}
                  >
                    {i < stage ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : i === stage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-gold-300" />
                    )}
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </m.div>
        )}

        {/* ─── success ─── */}
        {step === 'success' && result && p ? (
          <m.div
            key="success"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-emerald-100 p-3">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <h3 className="mt-4 font-display text-2xl font-bold text-ink">Ownership confirmed</h3>
              <p className="mt-1 text-[13px] text-ink-muted">
                {fmtNum(result.tokens)} {result.symbol} tokens are now in your portfolio.
              </p>
            </div>

            {/* certificate */}
            <div className="mt-5 overflow-hidden rounded-xl border-2 border-gold-200">
              <div className="flex items-center justify-between bg-gold-gradient px-4 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wide2 text-white">
                  Certificate of token ownership
                </span>
                <ShieldCheck className="h-4 w-4 text-white/80" />
              </div>
              <div className="bg-cream p-4 text-left">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[12px]">
                  <div>
                    <p className="font-semibold text-gold-700">Asset</p>
                    <p className="font-bold text-ink">{result.symbol}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gold-700">Tokens</p>
                    <p className="font-bold text-ink">{fmtNum(result.tokens)}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gold-700">Amount</p>
                    <p className="font-bold text-ink">{fmtUsd(result.totalCostUsd, 2)}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gold-700">Block</p>
                    <p className="font-bold text-ink">{result.blockNumber.toLocaleString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(result.txHash).catch(() => {});
                    toast({ title: 'Transaction hash copied' });
                  }}
                  className="mt-3 flex w-full items-center justify-between rounded-lg border border-gold-300 bg-white px-3 py-2"
                >
                  <span className="truncate font-mono text-[11px] text-gold-700">
                    {result.txHash}
                  </span>
                  <Copy className="ml-2 h-3.5 w-3.5 shrink-0 text-gold-700" />
                </button>
                <p className="mt-2 text-[11.5px] text-ink-muted">{result.firstDistributionHint}</p>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button className="btn-outline flex-1" onClick={closeInvest}>
                Keep browsing
              </button>
              <button
                className="btn-gold flex-[2]"
                onClick={() => {
                  closeInvest();
                  setView('portfolio');
                }}
              >
                View my portfolio <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </Modal>
  );
}
