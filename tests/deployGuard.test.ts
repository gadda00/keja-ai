/**
 * deploy-guard.mjs — the double-deploy elimination gate (2026-09-12).
 *
 * The Vercel Git integration deploys every push to main (including the
 * Auto-Pilot's GITHUB_TOKEN pushes, which cannot trigger workflows); the
 * CLI workflow used to deploy every PAT push again. The guard asks the
 * GitHub deployments API whether the integration already shipped the exact
 * SHA, and the workflow skips its own deploy when it has. These tests pin
 * the decision table and the polling/fail-open semantics.
 */
import { describe, expect, it, vi } from 'vitest';

import { decide, pollUntilTerminalOrTimeout } from '../scripts/deploy-guard.mjs';

const vercelDeploy = (id: number) => ({
  id,
  creator: 'vercel[bot]',
  environment: 'Production',
});

describe('decide', () => {
  it('falls back to CLI deploy when no vercel[bot] deployment exists', async () => {
    const [decision, reason] = await decide([], async () => 'success');
    expect(decision).toBe('deploy');
    expect(reason).toContain('no vercel[bot] deployment');
  });

  it('skips the CLI deploy when the integration deployment succeeded', async () => {
    const [decision, reason] = await decide(
      [vercelDeploy(6403884611)],
      async (id: number) => (id === 6403884611 ? 'success' : 'unknown'),
    );
    expect(decision).toBe('skip');
    expect(reason).toContain('already succeeded');
  });

  it('falls back to CLI deploy when the integration deployment failed', async () => {
    const [decision, reason] = await decide([vercelDeploy(1)], async () => 'failure');
    expect(decision).toBe('deploy');
    expect(reason).toContain('failed');
  });

  it('waits while the integration deployment is still building', async () => {
    for (const state of ['in_progress', 'queued', 'pending', 'unknown']) {
      const [decision] = await decide([vercelDeploy(1)], async () => state);
      expect(decision).toBe('wait');
    }
  });

  it('ignores deployments created by other actors', async () => {
    const [decision] = await decide(
      [{ id: 2, creator: 'gadda00', environment: 'Production' }],
      async () => 'success',
    );
    expect(decision).toBe('deploy');
  });

  it('decides on the newest vercel[bot] deployment when several exist', async () => {
    const statuses: Record<number, string> = { 1: 'failure', 2: 'success' };
    const [decision] = await decide([vercelDeploy(1), vercelDeploy(2)], async (id: number) => statuses[id]);
    expect(decision).toBe('skip');
  });

  it('treats a null deployment list as "no deployment"', async () => {
    const [decision] = await decide(null, async () => 'success');
    expect(decision).toBe('deploy');
  });
});

describe('pollUntilTerminalOrTimeout', () => {
  const baseCfg = {
    repo: 'gadda00/keja-ai',
    sha: 'abc123',
    token: '',
    waitMinutes: 0.05, // ~3s window
    pollSeconds: 0.01,
    sleepFn: async () => {},
    log: () => {},
  };

  it('returns skip once the integration deployment reaches success', async () => {
    let calls = 0;
    const list = vi.fn(async () => {
      calls++;
      return [vercelDeploy(7)];
    });
    const status = vi.fn(async () => (calls >= 2 ? 'success' : 'in_progress'));
    const result = await pollUntilTerminalOrTimeout({ ...baseCfg, list, status });
    expect(result.decision).toBe('skip');
    expect(list.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('returns deploy when the integration deployment fails', async () => {
    const result = await pollUntilTerminalOrTimeout({
      ...baseCfg,
      list: async () => [vercelDeploy(8)],
      status: async () => 'failure',
    });
    expect(result.decision).toBe('deploy');
    expect(result.reason).toContain('failed');
  });

  it('times out to deploy while a build stays in_progress past the window', async () => {
    const result = await pollUntilTerminalOrTimeout({
      ...baseCfg,
      list: async () => [vercelDeploy(9)],
      status: async () => 'in_progress',
    });
    expect(result.decision).toBe('deploy');
    expect(result.reason).toContain('wait window elapsed');
  });

  it('fails open (deploy) on GitHub API errors — degradation is duplication, never a missing deploy', async () => {
    const result = await pollUntilTerminalOrTimeout({
      ...baseCfg,
      list: async () => {
        throw new Error('GET /deployments -> 403');
      },
      status: async () => 'success',
    });
    expect(result.decision).toBe('deploy');
    expect(result.reason).toContain('GitHub API error');
  });

  it('deploys immediately when the integration never created a deployment', async () => {
    const result = await pollUntilTerminalOrTimeout({
      ...baseCfg,
      list: async () => [],
      status: async () => 'unknown',
    });
    expect(result.decision).toBe('deploy');
    expect(result.reason).toContain('no vercel[bot] deployment');
  });

  it('honours the injected sleep between polls', async () => {
    const sleeps: number[] = [];
    let polls = 0;
    const result = await pollUntilTerminalOrTimeout({
      ...baseCfg,
      list: async () => {
        polls++;
        return polls < 3 ? [vercelDeploy(10)] : [];
      },
      status: async () => 'queued',
      sleepFn: async (ms: number) => sleeps.push(ms),
    });
    expect(result.decision).toBe('deploy'); // integration vanished → fallback
    expect(sleeps.length).toBeGreaterThanOrEqual(2);
  });
});
