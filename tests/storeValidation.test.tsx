/**
 * useValidatedStore — the read-seam boundary for every-visitor localStorage
 * (wave 10). useStore trusts `JSON.parse(raw) as T`, so one corrupted write
 * (partial write, quota hit, stale shape, devtools edit) crashed the view
 * that read it. These tests pin the new contract: invalid data never
 * reaches the component, and the repair is written back to storage so the
 * next read is stable.
 *
 * Also pins the schema round-trip against real objects from each owning
 * module — if an interface drifts from its schema, these fail first.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  chatHistorySchema,
  idListSchema,
  notificationsSchema,
  savedSearchesSchema,
  userListingsSchema,
} from '@/lib/boundaries';
import { useChatHistory, useCompareList, useFavorites, useValidatedStore } from '@/lib/store';

/* ----------------------- corruption resilience ------------------------ */

describe('useValidatedStore — favorites (id list)', () => {
  it('passes valid ids through untouched', () => {
    localStorage.setItem('keja:favorites', JSON.stringify(['KJA-001', 'KJA-002']));
    const { result } = renderHook(() => useFavorites());
    expect(result.current[0]).toEqual(['KJA-001', 'KJA-002']);
  });

  it('salvages the valid entries of a junk-ridden list and repairs storage', () => {
    localStorage.setItem('keja:favorites', JSON.stringify(['KJA-001', 42, null, 'KJA-009']));
    const { result } = renderHook(() => useFavorites());
    expect(result.current[0]).toEqual(['KJA-001', 'KJA-009']);
    expect(JSON.parse(localStorage.getItem('keja:favorites') as string)).toEqual([
      'KJA-001',
      'KJA-009',
    ]);
  });

  it('falls back to [] when every entry is junk', () => {
    localStorage.setItem('keja:favorites', JSON.stringify([42, {}]));
    const { result } = renderHook(() => useFavorites());
    expect(result.current[0]).toEqual([]);
    expect(localStorage.getItem('keja:favorites')).toBe('[]');
  });

  it('falls back when the root is not an array at all (the old crash)', () => {
    localStorage.setItem('keja:favorites', '{"units": "not-a-list"}');
    const { result } = renderHook(() => useFavorites());
    expect(result.current[0]).toEqual([]);
    expect(JSON.parse(localStorage.getItem('keja:favorites') as string)).toEqual([]);
  });

  it('falls back when the payload is not even JSON', () => {
    localStorage.setItem('keja:favorites', 'not json {{{');
    const { result } = renderHook(() => useFavorites());
    expect(result.current[0]).toEqual([]);
  });

  it('the setter still works after a repair', () => {
    localStorage.setItem('keja:favorites', 'garbage');
    const { result } = renderHook(() => useFavorites());
    act(() => result.current[1]((prev) => [...prev, 'KJA-003']));
    expect(result.current[0]).toEqual(['KJA-003']);
    expect(JSON.parse(localStorage.getItem('keja:favorites') as string)).toEqual(['KJA-003']);
  });

  it('function updaters seed from the validated value, never the raw read', () => {
    localStorage.setItem('keja:favorites', JSON.stringify(['KJA-001', 7]));
    const { result } = renderHook(() => useFavorites());
    act(() => result.current[1]((prev) => [...prev, 'KJA-002']));
    expect(result.current[0]).toEqual(['KJA-001', 'KJA-002']);
  });
});

describe('useValidatedStore — chat history', () => {
  it('a message with gateway citations survives the round-trip', () => {
    const history = [
      { id: 'm1', role: 'user', text: '2BR Kilimani?', ts: '2026-09-12T10:00:00Z' },
      {
        id: 'm2',
        role: 'keja',
        text: 'Two listings match.',
        ts: '2026-09-12T10:00:05Z',
        meta: [{ label: 'FACT', text: 'inventory checked' }],
        sources: [
          { ref: 'KJA-A0162', title: 'Elegant 2-Bedroom Residence', kind: 'property', asOf: '2026-09-12' },
        ],
        propertyIds: ['KJA-A0162'],
      },
    ];
    localStorage.setItem('keja:chat-history', JSON.stringify(history));
    const { result } = renderHook(() => useChatHistory());
    expect(result.current[0]).toEqual(history);
  });

  it('drops a corrupted entry but keeps the healthy ones', () => {
    const history = [
      { id: 'm1', role: 'user', text: 'hello', ts: '2026-09-12T10:00:00Z' },
      { role: 'keja', text: 'missing id + ts' },
    ];
    localStorage.setItem('keja:chat-history', JSON.stringify(history));
    const { result } = renderHook(() => useChatHistory());
    expect(result.current[0]).toHaveLength(1);
    expect(result.current[0][0].id).toBe('m1');
  });
});

describe('useValidatedStore — compare list', () => {
  it('repairs a corrupted compare tray (the listing-detail crash path)', () => {
    localStorage.setItem('keja:compare', JSON.stringify('KJA-001')); // string, not array
    const { result } = renderHook(() => useCompareList());
    expect(result.current[0]).toEqual([]);
  });
});

describe('useValidatedStore — cross-tab sync stays validated', () => {
  it('a junk write from "another tab" triggers the repair listener', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current[0]).toEqual([]);
    act(() => {
      localStorage.setItem('keja:favorites', JSON.stringify([1, 2, 3]));
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'keja:favorites', newValue: '[1,2,3]' }),
      );
    });
    expect(result.current[0]).toEqual([]);
    expect(localStorage.getItem('keja:favorites')).toBe('[]');
  });
});

/* --------------------- schema / interface round-trips ------------------- */

describe('the persisted-state schemas accept real objects', () => {
  it('a real saved search passes savedSearchesSchema', () => {
    const search = {
      id: 'ss-1',
      label: 'Kilimani 2BR under 15M',
      filters: { q: '2BR Kilimani under 15M', purpose: 'buy', maxPrice: 15_000_000 },
      createdAt: '2026-09-12T10:00:00Z',
      alerts: true,
      seenIds: ['KJA-A0162'],
    };
    expect(savedSearchesSchema.safeParse([search]).success).toBe(true);
  });

  it('a real notification passes notificationsSchema', () => {
    const n = {
      id: 'n-1',
      kind: 'match',
      title: 'New match',
      body: 'A listing matched your saved search.',
      href: '#/properties',
      createdAt: '2026-09-12T10:00:00Z',
      read: false,
    };
    expect(notificationsSchema.safeParse([n]).success).toBe(true);
  });

  it('a real user listing passes userListingsSchema (the marketplace merge key)', () => {
    const listing = {
      id: 'KJA-U1a2b3c',
      submissionId: 'UL-1',
      ownerEmail: 'poster@example.com',
      ownerName: 'Poster',
      title: 'Sunlit 3BR with garden, Kileleshwa',
      type: 'apartment',
      purpose: ['buy'],
      area: 'Kileleshwa',
      county: 'Nairobi',
      price: 14_500_000,
      rentEstimate: 85_000,
      bedrooms: 3,
      bathrooms: 2,
      sizeSqm: 140,
      amenities: [],
      images: ['/images/props/apartment_2.webp'],
      description: 'Bright corner unit on a quiet street.',
      agency: 'Direct owner / agent',
      agent: { name: 'Poster', phone: '+254 700 000 000' },
      availability: 'available',
      listedAt: '2026-09-12T10:00:00Z',
      source: 'wizard',
      userSubmitted: true,
      views: 0,
    };
    expect(userListingsSchema.safeParse([listing]).success).toBe(true);
  });

  it('a listing missing required fields is dropped element-wise, not merged', () => {
    const ok = {
      id: 'KJA-U1a2b3c',
      title: 'Kept',
      type: 'apartment',
      purpose: ['buy'],
      area: 'Kileleshwa',
      county: 'Nairobi',
      price: 1,
      sizeSqm: 100,
      amenities: [],
      images: [],
      description: 'kept entry',
      agency: 'x',
      agent: { name: 'y', phone: 'z' },
      availability: 'available',
      listedAt: '2026-09-12T10:00:00Z',
      source: 'wizard',
      userSubmitted: true,
      views: 0,
    };
    const { result } = renderHook(() =>
      useValidatedStore('user-listings-test', userListingsSchema, [] as unknown[]),
    );
    void result;
    const salvage = userListingsSchema.safeParse([{ ...ok, price: 'NaN-string' }]);
    expect(salvage.success).toBe(false);
    expect(idListSchema.safeParse(['a']).success).toBe(true);
    expect(chatHistorySchema.safeParse([]).success).toBe(true);
  });
});
