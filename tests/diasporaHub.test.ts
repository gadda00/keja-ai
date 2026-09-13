/**
 * Diaspora Hub — unit tests for the pure tooling the claims register's
 * 'diaspora-hub' claim cites (timezone conversion, remittance comparison,
 * PoA progress). The register previously said "covered by unit tests" while
 * no test file imported this module.
 */
import { describe, expect, it } from 'vitest';

import {
  compareRemitChannels,
  convertSlot,
  nextJourneyStatus,
  poaProgressPct,
  REMIT_CHANNEL_MODELS,
} from '@/lib/diasporaStore';
import { FX_KES_PER_USD } from '@/lib/finance';

describe('convertSlot — Nairobi (EAT, UTC+3) to diaspora zones', () => {
  it('converts a midday slot to London (BST, UTC+1 in summer)', () => {
    // 2026-08-15 14:00 EAT = 11:00 UTC = 12:00 BST
    expect(convertSlot('2026-08-15', '14:00', 'Europe/London')).toBe('12:00');
  });

  it('converts to New York (EDT, UTC-4 in summer) with a negative day shift', () => {
    // 2026-08-15 01:00 EAT = 2026-08-14 22:00 UTC = 18:00 EDT on the 14th
    expect(convertSlot('2026-08-15', '01:00', 'America/New_York')).toBe('18:00 (-1 day)');
  });

  it('converts to Dubai (UTC+4, no DST) — one hour ahead of EAT', () => {
    expect(convertSlot('2026-08-15', '14:00', 'Asia/Dubai')).toBe('15:00');
  });

  it('flags cross-day rollover into the next day with (+1 day)', () => {
    // 2026-08-15 23:30 EAT = 20:30 UTC = 16:30 EDT same day — no shift.
    // Use a slot that lands past midnight in the target zone: 01:00 EAT → 22:00 (−1d) NY (covered above);
    // for +1 day use Pacific/Kiritimati (UTC+14): 2026-08-15 12:00 EAT = 09:00 UTC = 23:00 same day UTC+14 → 2026-08-16? no: 09:00+14h = 23:00 same day.
    // The robust +1-day case: Pacific/Auckland during NZDT (UTC+13): 09:00 UTC + 13 = 22:00 same day. Still same day.
    // Simplest deterministic +1 day: UTC+14 zone with an evening EAT slot: 2026-08-15 20:00 EAT = 17:00 UTC = 07:00 next day in +14.
    expect(convertSlot('2026-08-15', '20:00', 'Pacific/Kiritimati')).toBe('07:00 (+1 day)');
  });

  it('degrades to an em-dash for malformed input instead of throwing', () => {
    expect(convertSlot('not-a-date', '14:00', 'Europe/London')).toBe('—');
    expect(convertSlot('2026-08-15', 'ab:cd', 'Europe/London')).toBe('—');
  });

  it('same-day winter conversions (GMT, UTC+0)', () => {
    // 2026-01-15 14:00 EAT = 11:00 GMT
    expect(convertSlot('2026-01-15', '14:00', 'Europe/London')).toBe('11:00');
  });
});

describe('compareRemitChannels', () => {
  it('ranks channels best-net-first', () => {
    const quotes = compareRemitChannels(10_000, 'US');
    expect(quotes).toHaveLength(3);
    for (let i = 1; i < quotes.length; i++) {
      expect(quotes[i - 1].netKes).toBeGreaterThanOrEqual(quotes[i].netKes);
    }
  });

  it('computes fee = amount × pct + fixed for each model', () => {
    const quotes = compareRemitChannels(10_000, 'US');
    for (const q of quotes) {
      const model = REMIT_CHANNEL_MODELS.find((m) => m.id === q.channel.id)!;
      expect(q.feeUsd).toBeCloseTo(10_000 * model.pctFee + model.fixedFeeUsd);
      expect(q.netUsd).toBeCloseTo(10_000 - q.feeUsd);
      expect(q.netKes).toBeCloseTo(q.netUsd * FX_KES_PER_USD);
      expect(q.fxKesPerUsd).toBe(FX_KES_PER_USD);
    }
  });

  it('stablecoin (0.8% + $3) beats bank wire (2.5% + $25) at typical amounts', () => {
    const quotes = compareRemitChannels(5_000, 'UK');
    expect(quotes[0].channel.id).toBe('crypto');
    expect(quotes[quotes.length - 1].channel.id).toBe('bank');
  });

  it('never returns negative net on a tiny amount', () => {
    const quotes = compareRemitChannels(1, 'US');
    for (const q of quotes) {
      expect(q.netUsd).toBeGreaterThanOrEqual(0);
    }
  });

  it('carries the corridor on every quote', () => {
    for (const q of compareRemitChannels(500, 'UAE')) {
      expect(q.corridor).toBe('UAE');
    }
  });
});

describe('poaProgressPct', () => {
  it('starts at zero with no tasks done', () => {
    expect(poaProgressPct([])).toBe(0);
  });

  it('never exceeds 100 with every conceivable id thrown at it', () => {
    const ids = ['poa-notarise-original', 'poa-lawyer-registration', 'made-up-id-1', 'made-up-id-2'];
    const pct = poaProgressPct(ids);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThanOrEqual(100);
  });

  it('unknown ids cannot inflate progress (only real checklist tasks count)', () => {
    const withKnown = poaProgressPct(['poa-notarise-original']);
    const withNoise = poaProgressPct(['poa-notarise-original', 'fake-1', 'fake-2', 'fake-3']);
    expect(withNoise).toBe(withKnown);
  });

  it('is monotonic — adding a task never lowers progress', () => {
    const base = poaProgressPct(['poa-notarise-original']);
    const more = poaProgressPct(['poa-notarise-original', 'poa-lawyer-registration']);
    expect(more).toBeGreaterThanOrEqual(base);
  });
});

describe('nextJourneyStatus', () => {
  it('cycles untouched → next → done → untouched', () => {
    expect(nextJourneyStatus('untouched')).toBe('next');
    expect(nextJourneyStatus('next')).toBe('done');
    expect(nextJourneyStatus('done')).toBe('untouched');
  });
});
