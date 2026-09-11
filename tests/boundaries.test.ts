/**
 * Boundary validation — audit F-19 / F-20 regression tests.
 *
 * Every persisted or bot-generated payload crosses one of these schemas.
 * The contract under test: invalid data NEVER crashes the app — it falls
 * back to seeded defaults and (in salvage mode) drops only the bad entries.
 */
import {
  passwordMapSchema,
  safeParse,
  sessionSchema,
  userAccountSchema,
  validateAutoState,
  validateTokenizePersisted,
} from '@/lib/boundaries';

const validUser = {
  id: 'usr-1',
  name: 'Amina',
  email: 'amina@example.com',
  role: 'user',
  provider: 'email',
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  lastLoginAt: '2026-09-01T00:00:00Z',
  loginCount: 3,
};

const fallbackUser = { ...validUser, id: 'fallback' };

describe('safeParse', () => {
  it('returns the parsed value on success', () => {
    expect(safeParse(userAccountSchema, validUser, fallbackUser, 'test')).toEqual(validUser);
  });

  it('returns the fallback on failure', () => {
    const broken = { ...validUser, role: 'superadmin' };
    expect(safeParse(userAccountSchema, broken, fallbackUser, 'test')).toBe(fallbackUser);
  });

  it('does not throw on garbage input', () => {
    expect(safeParse(userAccountSchema, undefined, fallbackUser, 'test')).toBe(fallbackUser);
    expect(safeParse(userAccountSchema, 42, fallbackUser, 'test')).toBe(fallbackUser);
  });
});

describe('userAccountSchema', () => {
  it('accepts a well-formed account', () => {
    expect(userAccountSchema.safeParse(validUser).success).toBe(true);
  });

  it('rejects unknown roles / providers / statuses', () => {
    for (const patch of [{ role: 'owner' }, { provider: 'facebook' }, { status: 'banned' }]) {
      expect(userAccountSchema.safeParse({ ...validUser, ...patch }).success).toBe(false);
    }
  });

  it('requires the identity fields', () => {
    for (const key of ['id', 'email', 'createdAt', 'loginCount']) {
      const rest: Record<string, unknown> = { ...validUser };
      delete rest[key];
      expect(userAccountSchema.safeParse(rest).success).toBe(false);
    }
  });
});

describe('sessionSchema', () => {
  const validSession = {
    token: 'a'.repeat(24),
    userId: 'usr-1',
    issuedAt: '2026-09-01T00:00:00Z',
    expiresAt: '2026-09-02T00:00:00Z',
    remember: false,
  };

  it('accepts a well-formed session', () => {
    expect(sessionSchema.safeParse(validSession).success).toBe(true);
  });

  it('rejects short tokens (min 8) and missing fields', () => {
    expect(sessionSchema.safeParse({ ...validSession, token: 'short' }).success).toBe(false);
    const { remember: _r, ...noRemember } = validSession;
    expect(sessionSchema.safeParse(noRemember).success).toBe(false);
  });
});

describe('passwordMapSchema', () => {
  it('validates email → hash records', () => {
    expect(passwordMapSchema.safeParse({ 'a@b.c': 'k2$1$s$h' }).success).toBe(true);
    expect(passwordMapSchema.safeParse(['not', 'an', 'object']).success).toBe(false);
  });
});

describe('validateAutoState (bot payload boundary)', () => {
  const oneListing = {
    id: 'KJA-A0001',
    title: 'Test listing',
    type: 'apartment',
    purpose: ['rent'],
    area: 'Kilimani',
    county: 'Nairobi',
    price: 85000,
    sizeSqm: 80,
    amenities: ['Lift'],
    images: ['/images/props/apartment_0.webp'],
    description: 'A home.',
    agency: 'Test Agency',
    agent: { name: 'Agent A', phone: '+254700000000' },
    availability: 'available',
    listedAt: '2026-09-01',
    highlights: [],
    views: 10,
    auto: {
      source: 'test',
      firstSeenAt: '2026-09-01',
      enrichedBy: 'test',
      priceGrade: 'within',
      areaYieldBand: 7,
      qualityScore: 80,
      route: 'feed',
      checks: [{ label: 'price', status: 'pass', detail: 'ok' }],
    },
  };

  it('passes a well-formed payload through with dropped=0', () => {
    const out = validateAutoState({
      version: 1,
      generatedAt: '2026-09-01T00:00:00Z',
      listings: [oneListing],
      pending: [],
    });
    expect(out.dropped).toBe(0);
    expect(out.listings).toHaveLength(1);
    expect(out.listings[0].id).toBe('KJA-A0001');
  });

  it('salvages per-entry when the overall structure fails', () => {
    const bad = { ...oneListing, id: '' };
    const out = validateAutoState({
      version: 1,
      generatedAt: '2026-09-01T00:00:00Z',
      listings: [oneListing, bad],
      pending: [bad],
    });
    // structural failure → salvage path: one good listing kept, two bad dropped
    expect(out.listings).toHaveLength(1);
    expect(out.dropped).toBe(2);
  });

  it('survives null / garbage input entirely', () => {
    const out = validateAutoState(null);
    expect(out.listings).toEqual([]);
    expect(out.dropped).toBe(0);
    expect(typeof out.generatedAt).toBe('string');
    expect(out.version).toBe(0);
  });

  it('rejects negative prices and empty agent objects', () => {
    const negative = { ...oneListing, price: -5 };
    const noAgent = { ...oneListing, agent: {} };
    const out = validateAutoState({
      version: 1,
      generatedAt: '2026-09-01T00:00:00Z',
      listings: [negative, noAgent],
    });
    expect(out.listings).toHaveLength(0);
    expect(out.dropped).toBe(2);
  });
});

describe('validateTokenizePersisted', () => {
  it('resets to defaults on invalid state', () => {
    const out = validateTokenizePersisted({ walletUsd: 'not-a-number' }) as {
      walletUsd: number;
      investments: unknown[];
    };
    expect(out.walletUsd).toBe(0);
    expect(out.investments).toEqual([]);
  });

  it('keeps a valid persisted shape', () => {
    const out = validateTokenizePersisted({ walletUsd: 500, waitlist: ['a@b.c'] }) as {
      walletUsd: number;
      waitlist: string[];
    };
    expect(out.walletUsd).toBe(500);
    expect(out.waitlist).toEqual(['a@b.c']);
  });
});
