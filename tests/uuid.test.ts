/**
 * Identifier helper — audit F-37 regression tests.
 *
 * Date.now() used to be the id at 30+ sites (same-millisecond collisions
 * plus timing leaks). These tests pin the collision-safety properties.
 */
import { newId, uuid } from '@/lib/uuid';

describe('uuid', () => {
  it('produces RFC-4122 v4-shaped strings', () => {
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (let i = 0; i < 50; i++) {
      expect(uuid()).toMatch(re);
    }
  });

  it('never collides across many draws', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(uuid());
    expect(seen.size).toBe(2000);
  });

  it('falls back to a v4-shaped id when crypto.randomUUID is unavailable', async () => {
    const real = globalThis.crypto.randomUUID;
    // biome-ignore lint/suspicious/noExplicitAny: deliberate test shim
    (globalThis.crypto as any).randomUUID = undefined;
    try {
      const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/;
      const id = uuid();
      expect(id).toMatch(re);
    } finally {
      // biome-ignore lint/suspicious/noExplicitAny: restore
      (globalThis.crypto as any).randomUUID = real;
    }
  });
});

describe('newId', () => {
  it('prefixes ids with the record kind', () => {
    expect(newId('lead')).toMatch(/^lead_/);
    expect(newId('viewing')).toMatch(/^viewing_/);
  });

  it('is unique even for ids generated in the same millisecond', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(newId('x'));
    expect(seen.size).toBe(1000);
  });
});
