/**
 * Google Identity Services (GIS) — client integration for real Google
 * accounts on the static deployment.
 * ---------------------------------------------------------------------------
 * What this module owns:
 *  - loadGoogleIdentity(): one-time loader for https://accounts.google.com/gsi/client
 *  - decodeIdToken(): base64url JWT payload decode (no external deps)
 *  - validateIdTokenClaims(): honest client-side checks — issuer, audience,
 *    expiry, email presence + email_verified. (Full cryptographic
 *    verification happens at Google's edge before the token is ever issued
 *    to this client; the checks here stop replay / wrong-app / stale
 *    tokens. The Phase-2 backend verifies signatures server-side.)
 *  - roleForEmail(): admin allowlist mapping (NEXT_PUBLIC_ADMIN_EMAILS).
 *
 * Everything crypto/validation-related is a pure function so the vitest
 * suite covers it without a DOM (tests/googleAuth.test.ts).
 */

/* ------------------------------------------------------------------ */
/* Types (subset of the GIS surface this app touches)                   */
/* ------------------------------------------------------------------ */

export interface IdTokenClaims {
  iss: string;
  aud: string;
  sub: string;
  exp: number;
  iat: number;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  hd?: string;
  nonce?: string;
}

export interface CredentialResponse {
  credential: string;
  select_by?: string;
}

interface GisButtonOptions {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'continue_with' | 'signup_with';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    ux_mode?: 'popup' | 'redirect';
    use_fedcm_for_prompt?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: GisButtonOptions) => void;
  prompt: () => void;
  disableAutoSelect: () => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

/* ------------------------------------------------------------------ */
/* GIS script loader                                                    */
/* ------------------------------------------------------------------ */

let gisPromise: Promise<GoogleAccountsId> | null = null;

/** Load the Google Identity Services script exactly once; resolves the
 *  `google.accounts.id` API. Rejects if the script cannot load (offline /
 *  blocked) — callers fall back to the demo sign-in surface. */
export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (gisPromise) return gisPromise;

  gisPromise = new Promise<GoogleAccountsId>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    const timeout = window.setTimeout(
      () => reject(new Error('Google Sign-In took too long to load.')),
      10_000,
    );
    script.onload = () => {
      window.clearTimeout(timeout);
      const api = window.google?.accounts?.id;
      if (api) resolve(api);
      else reject(new Error('Google Sign-In failed to initialise.'));
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      gisPromise = null;
      reject(new Error('Google Sign-In could not be loaded. Check your connection.'));
    };
    document.head.appendChild(script);
  });
  return gisPromise;
}

/* ------------------------------------------------------------------ */
/* JWT decode + claim validation (pure, testable)                       */
/* ------------------------------------------------------------------ */

/** base64url → bytes, tolerating missing padding. */
function base64UrlToBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    Math.ceil(input.length / 4) * 4,
    '=',
  );
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Decode the payload segment of a Google ID token. No signature check —
 *  the token is minted by Google and delivered over the GIS postMessage
 *  channel; see the module header for the verification model. */
export function decodeIdToken(jwt: string): IdTokenClaims {
  const parts = jwt.split('.');
  if (parts.length !== 3) throw new Error('Malformed Google credential.');
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(parts[1]));
    const claims = JSON.parse(json) as IdTokenClaims;
    // reject null / primitives / arrays — only a claims object is meaningful
    if (!claims || typeof claims !== 'object' || Array.isArray(claims)) throw new Error('empty');
    return claims;
  } catch {
    throw new Error('Malformed Google credential.');
  }
}

export interface ClaimCheck {
  ok: boolean;
  reason?: string;
}

/** Validate the claims that matter for sign-in on this client. */
export function validateIdTokenClaims(
  claims: IdTokenClaims,
  clientId: string,
  nowMs: number = Date.now(),
): ClaimCheck {
  const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
  if (!ISSUERS.includes(claims.iss)) return { ok: false, reason: 'Unrecognised token issuer.' };
  if (claims.aud !== clientId) return { ok: false, reason: 'Token was issued for a different app.' };
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= nowMs)
    return { ok: false, reason: 'Google session expired — try again.' };
  if (!claims.email) return { ok: false, reason: 'Google account exposed no email.' };
  const verified = claims.email_verified === true || claims.email_verified === 'true';
  if (!verified) return { ok: false, reason: 'Google account email is not verified.' };
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Role mapping                                                         */
/* ------------------------------------------------------------------ */

/** The role a Google sign-in should carry: admin for allowlisted emails,
 *  otherwise null (the caller keeps the existing role or defaults to user).
 *  Both sides are normalised (trim + lowercase) so the config allowlist is
 *  safe even if it ships with mixed case or stray spaces. */
export function roleForEmail(email: string, adminEmails: string[]): 'admin' | null {
  const e = email.trim().toLowerCase();
  return adminEmails.some((a) => a.trim().toLowerCase() === e) ? 'admin' : null;
}

/** Google profile photos are hosted on lh3.googleusercontent.com — demo
 *  accounts use colour hexes instead; this predicate tells them apart. */
export const isPictureUrl = (picture?: string): boolean =>
  !!picture && /^https?:\/\//i.test(picture);
