// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { getRole, markRoleAsked, ROLES, roleWasAsked, setRole } from '@/lib/roleStore';

/** roleStore persists the first-run "what are you trying to do?" answer. */
describe('roleStore', () => {
  it('round-trips a role through localStorage', () => {
    localStorage.clear();
    expect(getRole()).toBeNull();
    setRole('invest');
    expect(getRole()).toBe('invest');
    setRole('buy');
    expect(getRole()).toBe('buy');
  });

  it('rejects values outside the role taxonomy (no bad persisted state)', () => {
    localStorage.clear();
    localStorage.setItem('keja:role', JSON.stringify('holiday'));
    expect(getRole()).toBeNull();
  });

  it('survives garbage in the storage slot without throwing', () => {
    localStorage.clear();
    localStorage.setItem('keja:role', '{not json');
    expect(getRole()).toBeNull();
  });

  it('markRoleAsked persists the first-run gate state separately', () => {
    localStorage.clear();
    expect(roleWasAsked()).toBe(false);
    markRoleAsked();
    expect(roleWasAsked()).toBe(true);
    // clearing the role must not clear the asked flag (skip path)
    localStorage.removeItem('keja:role');
    expect(roleWasAsked()).toBe(true);
  });

  it('exposes the five visitor roles with CTA destinations inside the app', () => {
    expect(ROLES.length).toBe(5);
    for (const r of ROLES) {
      expect(['buy', 'rent', 'invest', 'list', 'manage']).toContain(r.value);
      expect(r.label.length).toBeGreaterThan(0);
      expect(r.cta.length).toBeGreaterThan(0);
      expect(r.to.startsWith('/')).toBe(true);
    }
  });
});
