/**
 * Vitest setup — shared test environment shims.
 *
 * 1. WebCrypto: jsdom ships getRandomValues but not crypto.subtle; the
 *    password tests must run the REAL PBKDF2 algorithm, so we graft Node's
 *    webcrypto onto the global when it is missing.
 * 2. localStorage isolation: every test starts from a clean store so seeded
 *    defaults (auth users, analytics buffer, …) never leak between tests.
 */
import { webcrypto } from 'node:crypto';

if (typeof globalThis.crypto?.subtle !== 'object') {
  // biome-ignore lint/suspicious/noExplicitAny: jsdom's crypto type lacks subtle
  (globalThis as any).crypto = webcrypto;
}

beforeEach(() => {
  localStorage.clear();
});
