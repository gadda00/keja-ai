// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import {
  compareRemitChannels,
  convertSlot,
  CORRIDOR_FX_DEMO,
  diasporaTimezones,
  EMPTY_DIASPORA,
  nextJourneyStatus,
  POA_TASKS,
  poaProgressPct,
  REMIT_CHANNEL_MODELS,
  type ViewingSlot,
} from '@/lib/diasporaStore';
import { FX_KES_PER_USD } from '@/lib/finance';
import { store } from '@/lib/store';

describe('convertSlot — EAT anchor into diaspora zones', () => {
  it('EAT 18:00 → London 16:00 same-day (BST)', () => {
    expect(convertSlot('2026-07-15', '18:00', 'Europe/London')).toBe('16:00');
  });

  it('EAT 23:30 → New York 15:30 same-day (EST)', () => {
    expect(convertSlot('2026-01-15', '23:30', 'America/New_York')).toBe('15:30');
  });

  it('EAT 01:00 → Los Angeles 14:00 the previous day (PST)', () => {
    expect(convertSlot('2026-01-15', '01:00', 'America/Los_Angeles')).toBe('14:00 (-1 day)');
  });

  it('EAT 23:30 → Dubai 00:30 the next day (GST)', () => {
    expect(convertSlot('2026-01-15', '23:30', 'Asia/Dubai')).toBe('00:30 (+1 day)');
  });

  it('EAT 01:00 → Dubai 02:00 same day (cross-midnight without a suffix)', () => {
    expect(convertSlot('2026-01-15', '01:00', 'Asia/Dubai')).toBe('02:00');
  });

  it('Nairobi is the identity zone', () => {
    expect(convertSlot('2026-03-09', '09:30', 'Africa/Nairobi')).toBe('09:30');
  });
});

describe('diasporaTimezones', () => {
  it('covers the five corridors with unique IANA zones', () => {
    expect(diasporaTimezones).toHaveLength(5);
    expect(new Set(diasporaTimezones.map((z) => z.iana)).size).toBe(5);
    expect(diasporaTimezones.map((z) => z.iana)).toContain('Africa/Nairobi');
    for (const zone of diasporaTimezones) {
      expect(zone.label.length).toBeGreaterThan(0);
    }
  });
});

describe('remittance cost models', () => {
  it('defines the three typical channel shapes', () => {
    expect(REMIT_CHANNEL_MODELS.map((m) => m.id)).toEqual(['bank', 'specialist', 'crypto']);
    expect(REMIT_CHANNEL_MODELS[0].pctFee).toBeCloseTo(0.025, 6);
    expect(REMIT_CHANNEL_MODELS[0].fixedFeeUsd).toBe(25);
  });

  it('computes net KES per channel and ranks best-net-first', () => {
    const quotes = compareRemitChannels(10_000, 'UK');
    expect(quotes.map((q) => q.channel.id)).toEqual(['crypto', 'specialist', 'bank']);
    const [best, mid, worst] = quotes;
    expect(best.netUsd).toBeCloseTo(9_917, 2); // 10,000 − (0.8% + $3)
    expect(mid.netUsd).toBeCloseTo(9_895, 2); // 10,000 − (1.0% + $5)
    expect(worst.netUsd).toBeCloseTo(9_725, 2); // 10,000 − (2.5% + $25)
    expect(best.netKes).toBeCloseTo(9_917 * FX_KES_PER_USD, 0);
    expect(worst.netKes).toBeLessThan(mid.netKes);
    expect(quotes.every((q) => q.corridor === 'UK')).toBe(true);
    expect(quotes.every((q) => q.fxKesPerUsd === FX_KES_PER_USD)).toBe(true);
  });

  it('never nets negative on tiny amounts', () => {
    const quotes = compareRemitChannels(10, 'US');
    for (const q of quotes) {
      expect(q.netUsd).toBeGreaterThanOrEqual(0);
      expect(q.netKes).toBeGreaterThanOrEqual(0);
    }
    const bank = quotes.find((q) => q.channel.id === 'bank');
    expect(bank?.netUsd).toBe(0); // 10 − (0.25 + 25) < 0, clamped
  });
});

describe('PoA checklist progress', () => {
  it('lists nine unique tasks with guidance', () => {
    expect(POA_TASKS).toHaveLength(9);
    expect(new Set(POA_TASKS.map((t) => t.id)).size).toBe(9);
    for (const task of POA_TASKS) {
      expect(task.label.length).toBeGreaterThan(0);
      expect(task.hint.length).toBeGreaterThan(0);
    }
  });

  it('computes progress from completed ids only', () => {
    expect(poaProgressPct([])).toBe(0);
    expect(poaProgressPct(POA_TASKS.map((t) => t.id))).toBe(100);
    expect(poaProgressPct(POA_TASKS.slice(0, 3).map((t) => t.id))).toBe(33);
    expect(poaProgressPct(['poa-embassy-appt', 'not-a-task'])).toBe(11);
  });
});

describe('journey status cycle', () => {
  it('cycles untouched → next → done → untouched', () => {
    expect(nextJourneyStatus('untouched')).toBe('next');
    expect(nextJourneyStatus('next')).toBe('done');
    expect(nextJourneyStatus('done')).toBe('untouched');
  });
});

describe('diaspora state slot', () => {
  it('round-trips through keja:diaspora with the shared store', () => {
    localStorage.clear();
    expect(store.get('diaspora', EMPTY_DIASPORA)).toEqual(EMPTY_DIASPORA);
    const slot: ViewingSlot = {
      id: 'slot-1',
      date: '2026-05-01',
      timeEAT: '18:00',
      areas: ['Kilimani'],
      inspectorName: 'Demo inspector',
      status: 'confirmed',
    };
    const next = { ...EMPTY_DIASPORA, slots: [slot] };
    store.set('diaspora', next);
    expect(store.get('diaspora', EMPTY_DIASPORA)).toEqual(next);
    expect(localStorage.getItem('keja:diaspora')).toContain('slot-1');
  });

  it('anchors the corridor demo FX on the finance.ts rate', () => {
    expect(CORRIDOR_FX_DEMO).toHaveLength(3);
    const us = CORRIDOR_FX_DEMO.find((c) => c.corridor === 'US');
    expect(us?.kesPerUnit).toBe(FX_KES_PER_USD);
    for (const c of CORRIDOR_FX_DEMO) {
      expect(c.kesPerUnit).toBeGreaterThan(0);
      expect(c.basis.length).toBeGreaterThan(0);
    }
  });
});
