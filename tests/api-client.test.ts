/**
 * API seam client (audit Ch. 24, P2-2) — the config-only fallback contract.
 *
 * Today NEXT_PUBLIC_API_URL is unset: every call must reject with
 * ApiUnavailable so the store twins transparently fall back to
 * localStorage. The day the env var is set, the same calls go remote —
 * that behaviour is exercised with a stubbed fetch and a fresh module.
 */
import { ApiUnavailable, api, apiConfigured, getApiToken, setApiToken } from '@/lib/api/client';

const TOKEN_KEY = 'keja:api-token';

describe('unconfigured seam (local mode — today)', () => {
  it('apiConfigured() is false without NEXT_PUBLIC_API_URL', () => {
    expect(process.env.NEXT_PUBLIC_API_URL).toBeUndefined();
    expect(apiConfigured()).toBe(false);
  });

  it('every verb rejects with ApiUnavailable', async () => {
    await expect(api.get('/leads')).rejects.toBeInstanceOf(ApiUnavailable);
    await expect(api.post('/leads', { name: 'x' })).rejects.toBeInstanceOf(ApiUnavailable);
    await expect(api.patch('/leads/1', { name: 'y' })).rejects.toBeInstanceOf(ApiUnavailable);
    await expect(api.del('/leads/1')).rejects.toBeInstanceOf(ApiUnavailable);
  });

  it('ApiUnavailable carries an honest message', () => {
    expect(new ApiUnavailable().message).toContain('NEXT_PUBLIC_API_URL');
  });
});

describe('token custody (localStorage)', () => {
  it('round-trips set → get → remove', () => {
    expect(getApiToken()).toBeNull();
    setApiToken('tok_abc123');
    expect(getApiToken()).toBe('tok_abc123');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok_abc123');
    setApiToken(null);
    expect(getApiToken()).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
