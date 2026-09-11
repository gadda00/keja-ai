/**
 * KEJA Authentication & Session Management
 * ---------------------------------------------------------------------------
 * Implements the account layer of the KEJA platform blueprint:
 *  - Google Sign-In (Google Identity Services) — activates automatically when
 *    a GOOGLE_CLIENT_ID is present in the site config; otherwise falls back to
 *    a fully-functional demo mode (simulated Google accounts) so the platform
 *    experience is complete on a static host (GitHub Pages).
 *  - Email + password registration (client-side accounts, upgradeable to API).
 *  - Persistent sessions with expiry + activity refresh ("remember me").
 *  - Role-based access: user | agent | admin (RBAC per blueprint Ch.14).
 *  - Audit-ready: every auth event is logged to the audit trail.
 *
 * NOTE FOR PRODUCTION: this is the MVP auth layer for a static deployment.
 * Moving to the Phase-2 backend, the same interface is served by real APIs —
 * Google credential JWTs must then be verified server-side.
 */
import {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { logAudit } from '@/lib/adminStore';
import { store } from '@/lib/store';
import { safeParse, userAccountSchema, sessionSchema } from '@/lib/boundaries';

export type Role = 'user' | 'agent' | 'admin';
export type AuthMethod = 'google' | 'email';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  picture?: string;
  role: Role;
  provider: AuthMethod;
  status: 'active' | 'suspended';
  phone?: string;
  company?: string;
  createdAt: string;
  lastLoginAt: string;
  loginCount: number;
}

export interface Session {
  token: string;
  userId: string;
  issuedAt: string;
  expiresAt: string;
  remember: boolean;
}

interface AuthState {
  user: UserAccount | null;
  session: Session | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  users: UserAccount[];
  loginWithGoogle: (demoAccount?: DemoGoogleAccount) => Promise<UserAccount>;
  loginWithEmail: (email: string, password: string, remember?: boolean) => Promise<UserAccount>;
  register: (data: RegisterInput) => Promise<UserAccount>;
  logout: (reason?: string) => void;
  updateUser: (patch: Partial<UserAccount>) => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
  /** Require auth for an action — opens the auth modal if not signed in. */
  requireAuth: (reason: string, onDone: () => void) => void;
  /** Pending auth intent set by requireAuth, consumed by the auth modal. */
  pendingIntent: { reason: string; onDone: () => void } | null;
  clearIntent: () => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

/* ------------------------------------------------------------------ */
/* Session configuration                                              */
/* ------------------------------------------------------------------ */

const SESSION_SHORT_MS = 1000 * 60 * 60 * 12; // 12 hours
const SESSION_LONG_MS = 1000 * 60 * 60 * 24 * 30; // 30 days (remember me)
const SESSION_KEY = 'keja:session';
const USERS_KEY = 'keja:users';

/* ------------------------------------------------------------------ */
/* Password handling                                                   */
/* ------------------------------------------------------------------ */

/**
 * Password storage (audit F-01 remediation, client-side interim fix).
 *
 * History: the original layer hashed passwords with unsalted DJB2 (a 1997
 * non-cryptographic string hash) — trivially reversible and collision-prone.
 *
 * This layer now uses PBKDF2-SHA-256 (100k iterations, 16-byte random salt)
 * via the WebCrypto API — real cryptographic hashing, available in every
 * browser and Capacitor WebView the platform targets. Stored format:
 *
 *   k2$<iterations>$<salt-b64>$<hash-b64>
 *
 * Accounts created before this change carry `k1$…` DJB2 hashes; those are
 * still accepted on sign-in and transparently re-hashed to k2 on success
 * (standard hash-migration pattern), so no user is ever locked out.
 *
 * Honest scope: client-side hashing can never be server-side security.
 * Until the Phase-2 auth service ships (audit Ch. 24), registration
 * explicitly warns that accounts live only on this device, and the demo
 * credential set is clearly labelled in the UI.
 */

const PBKDF2_ITERATIONS = 100_000;

const toB64 = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};

const fromB64 = (b64: string): Uint8Array => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function deriveBits(pw: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pw),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return new Uint8Array(bits);
}

/** Hash a password with PBKDF2 (random salt) → `k2$iter$salt$hash`. */
async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveBits(pw, salt, PBKDF2_ITERATIONS);
  return `k2$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

/** Legacy DJB2 (pre-migration accounts only). */
const legacyDjb2 = (pw: string): string => {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) h = ((h << 5) + h + pw.charCodeAt(i)) | 0;
  return `k1$${(h >>> 0).toString(36)}$${pw.length}`;
};

/** Constant-time-ish byte comparison (no early exit on first difference).
 * Not a true constant-time comparison, but removes the trivial timing
 * oracle of `===` on the full digest. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Verify a password against a stored k2 (PBKDF2) or k1 (legacy) hash. */
async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  if (stored.startsWith('k2$')) {
    const [, , iterStr, saltB64, hashB64] = stored.split('$');
    const iterations = Number(iterStr);
    if (!Number.isFinite(iterations) || iterations < 1 || iterations > 10_000_000) return false;
    try {
      const derived = await deriveBits(pw, fromB64(saltB64), iterations);
      return timingSafeEqual(derived, fromB64(hashB64));
    } catch {
      return false;
    }
  }
  if (stored.startsWith('k1$')) return legacyDjb2(pw) === stored;
  return false;
}

/** True when the stored hash is the legacy format and should be upgraded. */
const isLegacyHash = (stored: string | undefined): boolean => !!stored?.startsWith('k1$');

/* Pre-computed PBKDF2 hashes for the documented demo credentials (public,
 * fixed salts — these accounts exist only to demonstrate the platform). */
const DEMO_PW_HASHES: Record<string, string> = {
  'admin@demo.keja.app':
    'k2$100000$odDG6D8CcyfYRhBj9KxYpg==$kIoSCX690Z9pEaqQ5wy6x1anWh8J0GVBxvlTWukTJio=',
  'agent@demo.keja.app':
    'k2$100000$GfPNMI8UVbP6CaaCsOMtGg==$ruXM9tgewhP01wNqAUNP1D1SuixQPV0oGZPEVUQZfhc=',
  'investor@demo.keja.app':
    'k2$100000$AzbcurBbNNdePkLmsrtvNg==$mVsO+am9YxdX5CQCmhiRqPorF8IyfZX2tFv0g2hIilE=',
};

/* ------------------------------------------------------------------ */
/* Demo Google accounts (used until a real GOOGLE_CLIENT_ID is set)    */
/* ------------------------------------------------------------------ */

export interface DemoGoogleAccount {
  email: string;
  name: string;
  role: Role;
  picture: string; // avatar color
  blurb: string;
}

export const DEMO_GOOGLE_ACCOUNTS: DemoGoogleAccount[] = [
  {
    email: 'amina.otieno@demo.keja.app',
    name: 'Amina Otieno',
    role: 'user',
    picture: '#a88727',
    blurb: 'Verified investor · 3 tokenized holdings',
  },
  {
    email: 'victor.ndunda@demo.keja.app',
    name: 'Victor Ndunda',
    role: 'agent',
    picture: '#1f2937',
    blurb: 'Agent · Chacadom Premier Properties',
  },
  {
    email: 'clive@demo.keja.app',
    name: 'Clive Mwangi',
    role: 'admin',
    picture: '#7c2d12',
    blurb: 'Platform administrator · Chacadom',
  },
];

/* ------------------------------------------------------------------ */
/* Seed accounts (email login for demos & QA)                          */
/* ------------------------------------------------------------------ */

const seedUsers = (): UserAccount[] => {
  const now = new Date().toISOString();
  return [
    {
      id: 'usr-admin',
      name: 'Clive Mwangi',
      email: 'admin@demo.keja.app',
      role: 'admin',
      provider: 'email',
      status: 'active',
      phone: '+254 700 000 001',
      company: 'Chacadom Investments',
      createdAt: '2026-06-01T08:00:00Z',
      lastLoginAt: now,
      loginCount: 42,
    },
    {
      id: 'usr-agent',
      name: 'Victor Ndunda',
      email: 'agent@demo.keja.app',
      role: 'agent',
      provider: 'email',
      status: 'active',
      phone: '+254 700 000 002',
      company: 'Chacadom Premier Properties',
      createdAt: '2026-06-12T09:30:00Z',
      lastLoginAt: now,
      loginCount: 17,
    },
    {
      id: 'usr-investor',
      name: 'Amina Otieno',
      email: 'investor@demo.keja.app',
      role: 'user',
      provider: 'email',
      status: 'active',
      phone: '+254 700 000 003',
      createdAt: '2026-07-03T14:15:00Z',
      lastLoginAt: now,
      loginCount: 9,
    },
  ];
};

const loadUsers = (): UserAccount[] => {
  const raw = store.get<unknown>(USERS_KEY.replace('keja:', ''), null);
  // F-19: validate each stored account; invalid entries are dropped so one
  // corrupted record cannot lock every account out.
  const users = Array.isArray(raw)
    ? raw.flatMap((u) => {
        const parsed = userAccountSchema.safeParse(u);
        return parsed.success ? [parsed.data as UserAccount] : [];
      })
    : null;
  if (users?.length) return users;
  const seeded = seedUsers();
  store.set('users', seeded);
  // seed demo passwords (investor123 / agent123 / admin123) — pre-computed
  // PBKDF2 hashes so seeding stays synchronous (see DEMO_PW_HASHES).
  const pw = store.get<Record<string, string>>('pw', {});
  for (const [email, hash] of Object.entries(DEMO_PW_HASHES)) {
    if (!pw[email]) pw[email] = hash;
  }
  store.set('pw', pw);
  return seeded;
};

const saveUsers = (users: UserAccount[]) => store.set('users', users);

/* ------------------------------------------------------------------ */
/* Session helpers                                                     */
/* ------------------------------------------------------------------ */

const newToken = (): string => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

const createSession = (userId: string, remember: boolean): Session => ({
  token: newToken(),
  userId,
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + (remember ? SESSION_LONG_MS : SESSION_SHORT_MS)).toISOString(),
  remember,
});

const readSession = (): Session | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    // F-19: schema-validate the persisted session; tampered or legacy
    // shapes are treated as "no session" (safe fallback = signed out).
    const s = safeParse(sessionSchema, JSON.parse(raw), null, 'auth.session');
    if (!s) return null;
    if (new Date(s.expiresAt).getTime() < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
};

const writeSession = (s: Session | null) => {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
};

/** Sliding expiry: refresh session TTL on activity (max once / 10 min). */
const touchSession = (s: Session): Session => {
  const age = Date.now() - new Date(s.issuedAt).getTime();
  if (age < 1000 * 60 * 10) return s;
  const next: Session = {
    ...s,
    expiresAt: new Date(
      Date.now() + (s.remember ? SESSION_LONG_MS : SESSION_SHORT_MS)
    ).toISOString(),
  };
  writeSession(next);
  return next;
};

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserAccount[]>(() => loadUsers());
  const [session, setSession] = useState<Session | null>(() => readSession());
  const [loading, setLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<{ reason: string; onDone: () => void } | null>(
    null
  );

  // resolve user from session
  const user = useMemo(
    () =>
      (session ? users.find((u) => u.id === session.userId && u.status === 'active') : null) ??
      null,
    [session, users]
  );

  // cross-tab session sync + same-tab users collection sync (admin edits)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) setSession(readSession());
      if (e.key === USERS_KEY) setUsers(loadUsers());
    };
    const onStoreChange = (e: Event) => {
      if ((e as CustomEvent).detail === 'users') setUsers(loadUsers());
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('keja-store-change', onStoreChange as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('keja-store-change', onStoreChange as EventListener);
    };
  }, []);

  const persistLogin = useCallback(
    (account: UserAccount, remember: boolean, usersOverride?: UserAccount[]) => {
      const base = usersOverride ?? users;
      const s = createSession(account.id, remember);
      writeSession(s);
      setSession(s);
      const updated = base.map((u) =>
        u.id === account.id
          ? { ...u, lastLoginAt: new Date().toISOString(), loginCount: u.loginCount + 1 }
          : u
      );
      saveUsers(updated);
      setUsers(updated);
      logAudit({
        actor: account.name,
        actorEmail: account.email,
        action: 'auth.login',
        target: account.email,
        detail: `Signed in via ${account.provider === 'google' ? 'Google' : 'email'} (role: ${account.role})`,
        severity: 'info',
      });
      return account;
    },
    [users]
  );

  const loginWithGoogle = useCallback(
    async (demoAccount?: DemoGoogleAccount) => {
      setLoading(true);
      try {
        // simulate network round-trip for realistic UX
        await new Promise((r) => setTimeout(r, 650));
        let account = demoAccount
          ? users.find((u) => u.email === demoAccount.email)
          : users.find((u) => u.provider === 'google' && u.role === 'user');
        if (!account) {
          const src = demoAccount ?? DEMO_GOOGLE_ACCOUNTS[0];
          const now = new Date().toISOString();
          account = {
            id: `usr-${newToken().slice(0, 8)}`,
            name: src.name,
            email: src.email,
            role: src.role,
            provider: 'google',
            status: 'active',
            createdAt: now,
            lastLoginAt: now,
            loginCount: 0,
          };
          const next = [...users, account];
          return persistLogin(account, true, next);
        }
        if (account.status === 'suspended') throw new Error('Account suspended. Contact support.');
        return persistLogin(account, true);
      } finally {
        setLoading(false);
      }
    },
    [users, persistLogin]
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string, remember = false) => {
      setLoading(true);
      try {
        await new Promise((r) => setTimeout(r, 450));
        // brute-force throttle: 5 failures per email → 60s lockout (demo-grade, client-side)
        const fails = store.get<Record<string, { n: number; ts: number }>>('login-fails', {});
        const f = fails[email.trim().toLowerCase()];
        if (f && f.n >= 5 && Date.now() - f.ts < 60_000) {
          throw new Error('Too many attempts. Wait one minute and try again.');
        }
        const recordFail = () => {
          const cur = store.get<Record<string, { n: number; ts: number }>>('login-fails', {});
          cur[email.trim().toLowerCase()] = {
            n: (cur[email.trim().toLowerCase()]?.n ?? 0) + 1,
            ts: Date.now(),
          };
          store.set('login-fails', cur);
        };
        if (email.length > 254 || password.length > 128) throw new Error('Invalid credentials.');
        const account = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (!account) {
          recordFail();
          throw new Error('No account found with that email. Create one below.');
        }
        if (account.status === 'suspended')
          throw new Error('This account has been suspended. Contact info@chacadom.com.');
        const pw = store.get<Record<string, string>>('pw', {});
        const expected = pw[account.email];
        const demoHash = DEMO_PW_HASHES[account.email];
        const matchedStored = expected ? await verifyPassword(password, expected) : false;
        const matchedDemo = !matchedStored && demoHash ? await verifyPassword(password, demoHash) : false;
        if (!matchedStored && !matchedDemo) {
          recordFail();
          throw new Error('Incorrect password. Try again or use Google sign-in.');
        }
        // Transparent hash migration: k1 (DJB2) accounts are re-hashed to
        // PBKDF2 on successful sign-in; demo accounts get their hash persisted.
        if (isLegacyHash(expected) || (matchedDemo && !expected)) {
          pw[account.email] = await hashPassword(password);
          store.set('pw', pw);
        }
        // success clears the throttle
        const cur = store.get<Record<string, { n: number; ts: number }>>('login-fails', {});
        delete cur[email.trim().toLowerCase()];
        store.set('login-fails', cur);
        return persistLogin(account, remember);
      } finally {
        setLoading(false);
      }
    },
    [users, persistLogin]
  );

  const register = useCallback(
    async (data: RegisterInput) => {
      setLoading(true);
      try {
        await new Promise((r) => setTimeout(r, 550));
        if (users.some((u) => u.email.toLowerCase() === data.email.trim().toLowerCase()))
          throw new Error('An account with this email already exists. Sign in instead.');
        if (data.password.length < 6) throw new Error('Password must be at least 6 characters.');
        if (data.password.length > 128) throw new Error('Password must be at most 128 characters.');
        const now = new Date().toISOString();
        const account: UserAccount = {
          id: `usr-${newToken().slice(0, 8)}`,
          name: data.name.trim(),
          email: data.email.trim(),
          role: 'user', // self-registration can never mint elevated roles (RBAC safety)
          provider: 'email',
          status: 'active',
          phone: data.phone?.trim(),
          createdAt: now,
          lastLoginAt: now,
          loginCount: 0,
        };
        const next = [...users, account];
        const pw = store.get<Record<string, string>>('pw', {});
        pw[account.email] = await hashPassword(data.password);
        store.set('pw', pw);
        return persistLogin(account, true, next);
      } finally {
        setLoading(false);
      }
    },
    [users, persistLogin]
  );

  const logout = useCallback(
    (reason = 'user') => {
      if (user) {
        logAudit({
          actor: user.name,
          actorEmail: user.email,
          action: 'auth.logout',
          target: user.email,
          detail: `Signed out (${reason})`,
          severity: 'info',
        });
      }
      writeSession(null);
      setSession(null);
    },
    [user]
  );

  const updateUser = useCallback(
    (patch: Partial<UserAccount>) => {
      if (!user) return;
      const next = users.map((u) => (u.id === user.id ? { ...u, ...patch } : u));
      saveUsers(next);
      setUsers(next);
      logAudit({
        actor: user.name,
        actorEmail: user.email,
        action: 'account.update',
        target: user.email,
        detail: `Updated profile: ${Object.keys(patch).join(', ')}`,
        severity: 'info',
      });
    },
    [user, users]
  );

  const requireAuth = useCallback((reason: string, onDone: () => void) => {
    setPendingIntent({ reason, onDone });
    setAuthModalOpen(true);
  }, []);

  const clearIntent = useCallback(() => setPendingIntent(null), []);

  // sliding session refresh on window focus
  useEffect(() => {
    const onFocus = () => {
      if (session) setSession(touchSession(session));
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      users,
      loginWithGoogle,
      loginWithEmail,
      register,
      logout,
      updateUser,
      isLoggedIn: !!user,
      isAdmin: user?.role === 'admin',
      requireAuth,
      pendingIntent,
      clearIntent,
      authModalOpen,
      setAuthModalOpen,
    }),
    [
      user,
      session,
      loading,
      users,
      loginWithGoogle,
      loginWithEmail,
      register,
      logout,
      updateUser,
      requireAuth,
      pendingIntent,
      clearIntent,
      authModalOpen,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const initials = (name: string): string =>
  name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
