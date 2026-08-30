import { describe, expect, it } from 'vitest';

import { kejaAI } from '@/lib/ai/engine';
import { AUTO_LISTINGS, autoListingToProperty, autoPilotStats } from '@/lib/autoListings';
import { calculateMortgage } from '@/lib/finance';

describe('Keja AI engine v3 — intent routing', () => {
  it('answers comparison queries with a comparison, not an area investment brief', () => {
    const r = kejaAI.respond('Kilimani vs Westlands as an investment');
    expect(r.text).toContain('vs');
    expect(r.text).toContain('Kilimani');
    expect(r.text).toContain('Westlands');
  });

  it('starts the 4-question qualification flow and captures a lead profile', () => {
    kejaAI.respond('find me a home');
    expect(kejaAI.qualificationState).not.toBeNull();
    kejaAI.respond('Amina Otieno');
    kejaAI.respond('8-12M');
    kejaAI.respond('an investment apartment');
    const done = kejaAI.respond('ready now');
    expect(done.text).toContain('Amina');
    expect(done.text).toMatch(/HOT|WARM|COLD/);
    expect(kejaAI.lastQualification).toBeTruthy();
    expect(kejaAI.qualificationState).toBeNull();
  });

  it('provides engine-authored quick replies on key intents', () => {
    expect(kejaAI.respond('hello').quickReplies?.length).toBeGreaterThan(0);
    expect(kejaAI.respond('how do you verify listings?').quickReplies?.length).toBeGreaterThan(0);
  });

  it('answers new-listings queries with fresh inventory', () => {
    const r = kejaAI.respond('what new listings do you have?');
    expect(r.text).toMatch(/fresh on the market/i);
    expect(r.propertyIds?.length).toBeGreaterThan(0);
  });

  it('hands off to a human with an action', () => {
    expect(kejaAI.respond('I want to talk to a human').action).toBe('whatsapp');
  });

  it('quotes mortgage maths consistent with the finance engine', () => {
    const r = kejaAI.respond('how do mortgages work in Kenya?');
    const m = calculateMortgage({
      propertyPrice: 10_000_000,
      depositPct: 20,
      annualRatePct: 13.5,
      termYears: 15,
    });
    expect(r.text).toContain(
      m.monthlyRepayment.toLocaleString('en-US', { maximumFractionDigits: 0 })
    );
  });
});

describe('Keja Auto-Pilot runtime adapter', () => {
  it('adapts every committed auto listing to a valid marketplace property', () => {
    for (const l of AUTO_LISTINGS) {
      const p = autoListingToProperty(l);
      expect(p.id).toMatch(/^KJA-A\d+$/);
      expect(p.trustScore).toBeGreaterThanOrEqual(72);
      // Trust cap: machine-screened stock never reaches the human-verified elite band
      expect(p.trustScore).toBeLessThanOrEqual(88);
      expect(p.verification.titleCheck).toBe('pending');
      expect(p.verification.duplicateCheck).toBe('clean');
      expect(p.images.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(80);
      expect(p.trustSignals.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('exposes coherent pipeline stats', () => {
    const s = autoPilotStats();
    expect(s.liveListings).toBe(AUTO_LISTINGS.length);
    expect(s.totalRuns).toBeGreaterThan(0);
    expect(s.avgQuality).toBeGreaterThanOrEqual(0);
    expect(s.avgQuality).toBeLessThanOrEqual(100);
    expect(s.sources.scanner + s.sources.feeds).toBe(AUTO_LISTINGS.length);
  });
});
