/**
 * Build-command parity (2026-09-12).
 *
 * Live incident: `package.json`'s build script gained the inject-preloads
 * step, but `vercel.json`'s buildCommand — the string BOTH deployment paths
 * actually execute (Vercel Git integration + `vercel build`) — did not, so
 * the deployed site silently shipped without the boot preloads. Two sources
 * of truth for one pipeline is a drift hazard; this test pins them together:
 * the command sequences must match step for step (modulo `npx`).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));

function steps(command: string): string[] {
  return command
    .split('&&')
    .map((s) => s.trim().replace(/^npx\s+/, ''))
    .filter(Boolean);
}

describe('build-command parity (package.json ↔ vercel.json)', () => {
  it('the two build definitions run the identical step sequence', () => {
    const npmSteps = steps(pkg.scripts.build);
    const vercelSteps = steps(vercel.buildCommand);
    expect(vercelSteps).toEqual(npmSteps);
  });

  it('the pipeline includes the preload injection before the prerender clones the template', () => {
    const s = steps(pkg.scripts.build);
    const inject = s.indexOf('node scripts/inject-preloads.mjs');
    const prerender = s.indexOf('bun scripts/prerender.ts');
    expect(inject).toBeGreaterThan(-1);
    expect(prerender).toBeGreaterThan(-1);
    expect(inject).toBeLessThan(prerender);
  });

  it('the pipeline ends with artifact verification (nothing ships ungated)', () => {
    const s = steps(pkg.scripts.build);
    expect(s[s.length - 1]).toBe('node scripts/verify-artifacts.mjs');
  });

  it('the install command is the frozen bun install in both', () => {
    expect(vercel.installCommand).toBe('bun install --frozen-lockfile');
  });
});
