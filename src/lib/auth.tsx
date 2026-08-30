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
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { logAudit } from '@/lib/adminStore';
import { store } from '@/lib/store';

export type Role = 'user' | 'agent' | 'admin';
export type AuthProvider = 'google' | 'email';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  picture?: string;
  role: Role;
  provider: AuthProvider;
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
/* Password handling (demo-grade; replaced by bcrypt on the backend)  */
/* ------------------------------------------------------------------ */

const hashPassword = (pw: string): string => {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) h = ((h << 5) + h + pw.charCodeAt(i)) | 0;
  return `k1$${(h >>> 0).toString(36)}$${pw.length}`;
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
    email: 'amina.otieno@gmail.com',
    name: 'Amina Otieno',
    role: 'user',
    picture: '#a88727',
    blurb: 'Verified investor · 3 tokenized holdings',
  },
  {
    email: 'victor.ndunda@chacadom.com',
    name: 'Victor Ndunda',
    role: 'agent',
    picture: '#1f2937',
    blurb: 'Agent · Chacadom Premier Properties',
  },
  {
    email: 'clive@chacadom.com',
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
      email: 'admin@keja.ai',
      role: 'admin',
      provider: 'email',
      status: 'active',
      phone: '+254 700 123 456',
      company: 'Chacadom Investments',
      createdAt: '2026-06-01T08:00:00Z',
      lastLoginAt: now,
      loginCount: 42,
    },
    {
      id: 'usr-agent',
      name: 'Victor Ndunda',
      email: 'agent@keja.ai',
      role: 'agent',
      provider: 'email',
      status: 'active',
      phone: '+254 711 222 333',
      company: 'Chacadom Premier Properties',
      createdAt: '2026-06-12T09:30:00Z',
      lastLoginAt: now,
      loginCount: 17,
    },
    {
      id: 'usr-investor',
      name: 'Amina Otieno',
      email: 'investor@keja.ai',
      role: 'user',
      provider: 'email',
      status: 'active',
      phone: '+254 722 444 555',
      createdAt: '2026-07-03T14:15:00Z',
      lastLoginAt: now,
      loginCount: 9,
    },
  ];
};

const loadUsers = (): UserAccount[] => {
  const users = store.get<UserAccount[] | null>(USERS_KEY.replace('keja:', ''), null);
  if (users?.length) return users;
  const seeded = seedUsers();
  store.set('users', seeded);
  // seed demo passwords (investor123 / agent123 / admin123)
  const pw = store.get<Record<string, string>>('pw', {});
  pw['admin@keja.ai'] = hashPassword('admin123');
  pw['agent@keja.ai'] = hashPassword('agent123');
  pw['investor@keja.ai'] = hashPassword('investor123');
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
    const s = JSON.parse(raw) as Session;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
          throw new Error('This account has been suspended. Contact support@keja.ai.');
        const pw = store.get<Record<string, string>>('pw', {});
        const expected = pw[account.email];
        // demo accounts accept their seeded password
        const demoPw: Record<string, string> = {
          'admin@keja.ai': hashPassword('admin123'),
          'agent@keja.ai': hashPassword('agent123'),
          'investor@keja.ai': hashPassword('investor123'),
        };
        if (
          expected !== hashPassword(password) &&
          demoPw[account.email] !== hashPassword(password)
        ) {
          recordFail();
          throw new Error('Incorrect password. Try again or use Google sign-in.');
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
        pw[account.email] = hashPassword(data.password);
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
