/**
 * KEJA Authentication & Session Management — Google-only edition
 * ---------------------------------------------------------------------------
 * The account layer of the KEJA platform, now production-shaped:
 *
 *  1. Google Sign-In (Google Identity Services) — the only sign-in method.
 *     A real Google account behind NEXT_PUBLIC_GOOGLE_CLIENT_ID; the ID
 *     token claims are validated (issuer / audience / expiry / verified
 *     email) before any session is created. The demo accounts, email+
 *     password sign-in and client-side registration were RETIRED
 *     (2026-09-11): one identity provider, one trust path.
 *
 *  2. Two-factor authentication (RFC 6238 TOTP) via Google Authenticator —
 *     REQUIRED for admin accounts, optional for everyone else. Enrolment
 *     is a device-local secret scanned as an otpauth:// QR code; every
 *     new session starts unverified (mfaVerified=false) and must present
 *     a valid 6-digit code (or single-use recovery code) to unlock
 *     2FA-gated surfaces. See src/lib/totp.ts.
 *
 *  3. Persistent sessions with expiry + activity refresh ("remember me"),
 *     schema-validated on read so tampered shapes sign out safely.
 *
 *  4. Role-based access: user | agent | admin (RBAC per blueprint Ch.14)
 *     — admin is granted only through the NEXT_PUBLIC_ADMIN_EMAILS
 *     allowlist on Google sign-in, never self-registered.
 *
 *  5. Audit-ready: every auth + 2FA event lands in the audit trail.
 *
 * Migration note: browsers that still hold the retired demo accounts /
 * email-password records in localStorage have them purged on load —
 * sign-in from that point on is Google-only.
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
import {
  decodeIdToken,
  roleForEmail,
  validateIdTokenClaims,
} from '@/lib/googleAuth';
import type { AccountType } from '@/lib/accountTypes';
import {
  buildOtpauthUri,
  generateTotpSecret,
  hashLegacyRecoveryCodes,
  hashRecoveryCode,
  RECOVERY_CODE_FORMAT,
  RECOVERY_HASH_FORMAT,
  verifyTotp,
  type TotpEnrolment,
} from '@/lib/totp';
import { checkLock, lockoutSecondsFor, recordFailure } from '@/lib/twoFactorGuard';
import { ADMIN_EMAILS, GOOGLE_CLIENT_ID, SITE } from '@/config';

export type Role = 'user' | 'agent' | 'admin';
export type AuthMethod = 'google';
export type { AccountType } from '@/lib/accountTypes';

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
  /** Registration group (renter / landlord / developer / agent / investor) —
   *  absent until the user completes the post-Google registration step. */
  accountType?: AccountType;
  /** Set once the registration wizard completed (ISO date-time). */
  onboardedAt?: string;
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
  /** Second factor satisfied for THIS session (Google sign-in + TOTP). */
  mfaVerified: boolean;
}

interface AuthState {
  user: UserAccount | null;
  session: Session | null;
  loading: boolean;
}

/** Enrolment pending confirmation: secret minted, code not yet verified. */
export interface PendingEnrolment {
  secret: string;
  otpauthUri: string;
}

export interface AuthContextValue extends AuthState {
  users: UserAccount[];
  /** Real Google Sign-In: consumes a GIS ID-token credential. */
  loginWithGoogleCredential: (credential: string) => Promise<UserAccount>;
  logout: (reason?: string) => void;
  updateUser: (patch: Partial<UserAccount>) => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
  /** Session has passed the second factor (admin gate). */
  mfaVerified: boolean;
  /** Does this account need a 2FA step right now (admin, or enrolled)? */
  needsTwoFactor: boolean;
  /** Same check for any account — used right after Google sign-in. */
  accountRequiresTwoFactor: (account: UserAccount) => boolean;
  /** The account's confirmed enrolment, if any. */
  twoFactorEnrolled: boolean;
  /** Mint a fresh enrolment secret + otpauth URI (pre-confirmation). */
  beginTwoFactorEnrolment: () => PendingEnrolment;
  /** Confirm an enrolment by verifying a code against the pending secret. */
  confirmTwoFactorEnrolment: (
    code: string,
    pendingSecret: string
  ) => Promise<{ ok: boolean; recoveryCodes: string[] }>;
  /** Verify a TOTP or recovery code → flags the session mfaVerified.
   *  Repeated failures escalate into timed lockouts (twoFactorGuard). */
  verifyTwoFactor: (code: string) => Promise<{
    ok: boolean;
    usedRecovery?: boolean;
    /** Present while the brute-force throttle is holding the account. */
    lockoutRemainingSeconds?: number;
  }>;
  /** Disable 2FA for this account (requires a valid code). */
  disableTwoFactor: (code: string) => Promise<boolean>;
  /** Require auth for an action — opens the auth modal if not signed in. */
  requireAuth: (reason: string, onDone: () => void) => void;
  /** Complete (or redo) registration for the signed-in account. */
  completeRegistration: (info: {
    accountType: AccountType;
    phone?: string;
    company?: string;
    name?: string;
  }) => void;
  /** True when the signed-in account has not finished registration. */
  needsRegistration: boolean;
  /** Pending auth intent set by requireAuth, consumed by the auth modal. */
  pendingIntent: { reason: string; onDone: () => void } | null;
  clearIntent: () => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
}

/* ------------------------------------------------------------------ */
/* Session configuration                                              */
/* ------------------------------------------------------------------ */

const SESSION_SHORT_MS = 1000 * 60 * 60 * 12; // 12 hours
const SESSION_LONG_MS = 1000 * 60 * 60 * 24 * 30; // 30 days (remember me)
const SESSION_KEY = 'keja:session';
const USERS_KEY = 'keja:users';

/* ------------------------------------------------------------------ */
/* TOTP enrolment store (per-account, this device)                     */
/* ------------------------------------------------------------------ */

type TotpMap = Record<string, TotpEnrolment>;

const readEnrolments = (): TotpMap => {
  const raw = store.get<unknown>('totp', null);
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as TotpMap) : {};
};

const writeEnrolments = (map: TotpMap) => store.set('totp', map);

/** Single-use recovery codes: 8 × "XXXXX-XXXXX" (crypto-random base32). */
const mintRecoveryCodes = (n = 8): string[] =>
  Array.from({ length: n }, () => {
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no lookalikes
    const s = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
    return `${s.slice(0, 5)}-${s.slice(5)}`;
  });

/* ------------------------------------------------------------------ */
/* Accounts (Google-only) + legacy migration                           */
/* ------------------------------------------------------------------ */

const loadUsers = (): UserAccount[] => {
  const raw = store.get<unknown>('users', null);
  const users = Array.isArray(raw)
    ? raw.flatMap((u) => {
        const parsed = userAccountSchema.safeParse(u);
        // userAccountSchema only admits provider 'google' now — retired
        // email/demo records fail validation here and are dropped.
        return parsed.success ? [parsed.data as UserAccount] : [];
      })
    : [];
  // Google-only migration (2026-09-11): purge retired keys + any demo
  // accounts from earlier builds, then persist the pruned set once.
  let purged = false;
  try {
    if (localStorage.getItem('keja:pw') !== null) {
      localStorage.removeItem('keja:pw');
      purged = true;
    }
    if (localStorage.getItem('keja:login-fails') !== null) {
      localStorage.removeItem('keja:login-fails');
      purged = true;
    }
  } catch {
    /* storage unavailable */
  }
  const clean = users.filter(
    (u) => !u.email.toLowerCase().endsWith('@demo.keja.app'),
  );
  if (raw && (clean.length !== users.length || purged)) store.set('users', clean);
  return clean;
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
  // every fresh session starts second-factor-unverified
  mfaVerified: false,
});

const readSession = (): Session | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    // schema-validate the persisted session; tampered or legacy shapes
    // are treated as "no session" (safe fallback = signed out).
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

  const enrolments = readEnrolments();
  const myEnrolment = user ? enrolments[user.id] : undefined;
  // Admins always need the second factor; everyone else only once enrolled.
  const needsTwoFactor = !!user && (user.role === 'admin' || !!myEnrolment);
  // Registration (group personalisation) is pending until accountType is set.
  const needsRegistration = !!user && !user.accountType;
  const accountRequiresTwoFactor = useCallback(
    (account: UserAccount) => account.role === 'admin' || !!readEnrolments()[account.id],
    []
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

  // One-time storage hardening (wave 10): enrolments written before
  // recovery-code hashing hold plaintext codes — hash them in place so the
  // paper copies users saved keep working while storage stops leaking them.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const map = readEnrolments();
        const legacy = Object.values(map).some((e) =>
          e.recoveryCodes.some((c) => !RECOVERY_HASH_FORMAT.test(c)),
        );
        if (!legacy) return;
        const hardened = await hashLegacyRecoveryCodes(map);
        if (!cancelled) writeEnrolments(hardened);
      } catch {
        /* storage unavailable — nothing to migrate */
      }
    })();
    return () => {
      cancelled = true;
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
        detail: `Signed in via Google (role: ${account.role})`,
        severity: 'info',
      });
      return account;
    },
    [users]
  );

  /** Real Google Sign-In — consume a GIS credential (JWT ID token):
   *  decode + validate the claims (issuer / audience / expiry / verified
   *  email), then find-or-create the local account. Admin allowlist emails
   *  are upgraded to the admin role (never downgraded). */
  const loginWithGoogleCredential = useCallback(
    async (credential: string) => {
      setLoading(true);
      try {
        const claims = decodeIdToken(credential);
        const check = validateIdTokenClaims(claims, GOOGLE_CLIENT_ID);
        if (!check.ok) throw new Error(check.reason ?? 'Google sign-in could not be verified.');
        const email = claims.email as string;
        const picture = typeof claims.picture === 'string' ? claims.picture : undefined;
        const name =
          (typeof claims.name === 'string' && claims.name.trim()) || email.split('@')[0];

        const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (existing) {
          if (existing.status === 'suspended')
            throw new Error('This Google account is suspended on Keja. Contact support.');
          // keep profile fresh + apply admin allowlist without ever downgrading
          const allowed = roleForEmail(email, ADMIN_EMAILS);
          const role = allowed === 'admin' || existing.role === 'admin' ? 'admin' : existing.role;
          const refreshed: UserAccount =
            existing.name === name && existing.picture === picture && existing.role === role
              ? existing
              : { ...existing, name, picture: picture ?? existing.picture, role };
          const next =
            refreshed === existing ? users : users.map((u) => (u.id === existing.id ? refreshed : u));
          return persistLogin(refreshed, true, next);
        }

        const now = new Date().toISOString();
        const account: UserAccount = {
          id: `usr-${newToken().slice(0, 8)}`,
          name,
          email,
          role: roleForEmail(email, ADMIN_EMAILS) === 'admin' ? 'admin' : 'user',
          provider: 'google',
          status: 'active',
          picture,
          createdAt: now,
          lastLoginAt: now,
          loginCount: 0,
        };
        return persistLogin(account, true, [...users, account]);
      } finally {
        setLoading(false);
      }
    },
    [users, persistLogin]
  );

  /* ---------------------------------------------------------------- */
  /* Two-factor (Google Authenticator, RFC 6238)                        */
  /* ---------------------------------------------------------------- */

  const flagSessionMfa = useCallback(() => {
    // only an already-authenticated, non-expired session can be flagged
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, mfaVerified: true };
      writeSession(next);
      return next;
    });
  }, []);

  const beginTwoFactorEnrolment = useCallback((): PendingEnrolment => {
    const secret = generateTotpSecret();
    return {
      secret,
      otpauthUri: buildOtpauthUri({
        secretBase32: secret,
        account: user?.email ?? 'keja-user',
        issuer: SITE.name,
      }),
    };
  }, [user]);

  const confirmTwoFactorEnrolment = useCallback(
    async (code: string, pendingSecret: string) => {
      if (!user) throw new Error('Sign in first.');
      if (!pendingSecret) throw new Error('Start the enrolment again.');
      const result = await verifyTotp(pendingSecret, code);
      if (!result.ok) {
        logAudit({
          actor: user.name,
          actorEmail: user.email,
          action: 'auth.2fa.failed',
          target: user.email,
          detail: 'Enrolment confirmation code rejected',
          severity: 'warning',
        });
        return { ok: false, recoveryCodes: [] };
      }
      const recoveryCodes = mintRecoveryCodes();
      // only SHA-256 hashes are persisted — the plaintext exists on screen
      // (returned below) exactly once, never in storage
      const recoveryHashes = await Promise.all(recoveryCodes.map(hashRecoveryCode));
      const map = readEnrolments();
      map[user.id] = {
        secret: pendingSecret,
        confirmedAt: new Date().toISOString(),
        recoveryCodes: recoveryHashes,
        createdAt: new Date().toISOString(),
      };
      writeEnrolments(map);
      flagSessionMfa();
      logAudit({
        actor: user.name,
        actorEmail: user.email,
        action: 'auth.2fa.enrolled',
        target: user.email,
        detail: `Google Authenticator enrolment confirmed (drift ${result.drift}s)`,
        severity: 'info',
      });
      return { ok: true, recoveryCodes };
    },
    [user, flagSessionMfa]
  );

  const verifyTwoFactor = useCallback(
    async (code: string) => {
      if (!user) return { ok: false };
      const enrolment = readEnrolments()[user.id];
      if (!enrolment) return { ok: false };

      // brute-force throttle (src/lib/twoFactorGuard.ts): while locked,
      // every attempt is rejected without touching the verifier
      const lock = checkLock(enrolment, Date.now());
      if (lock.locked) return { ok: false, lockoutRemainingSeconds: lock.remainingSeconds };

      const persistEnrolment = (next: TotpEnrolment) => {
        const map = readEnrolments();
        map[user.id] = next;
        writeEnrolments(map);
      };
      const noteFailure = (): { ok: false; lockoutRemainingSeconds?: number } => {
        const throttled = recordFailure(enrolment, Date.now());
        persistEnrolment({
          ...enrolment,
          failCount: throttled.failCount,
          lockedUntil: throttled.lockedUntil,
        });
        logAudit({
          actor: user.name,
          actorEmail: user.email,
          action: 'auth.2fa.failed',
          target: user.email,
          detail: 'Verification code rejected',
          severity: 'warning',
        });
        if (throttled.lockedUntil && throttled.lockedUntil !== enrolment.lockedUntil) {
          logAudit({
            actor: user.name,
            actorEmail: user.email,
            action: 'auth.2fa.lockout',
            target: user.email,
            detail: `Second-factor verification locked for ${lockoutSecondsFor(
              throttled.failCount,
            )} s after ${throttled.failCount} failed attempts`,
            severity: 'warning',
          });
          return { ok: false as const, lockoutRemainingSeconds: lockoutSecondsFor(throttled.failCount) };
        }
        return { ok: false as const };
      };

      const trimmed = code.trim().toUpperCase();

      // recovery codes: single-use, hash-compared against the stored hashes
      if (RECOVERY_CODE_FORMAT.test(trimmed)) {
        const hash = await hashRecoveryCode(trimmed);
        if (enrolment.recoveryCodes.includes(hash)) {
          persistEnrolment({
            ...enrolment,
            failCount: 0,
            lockedUntil: undefined,
            recoveryCodes: enrolment.recoveryCodes.filter((c) => c !== hash),
          });
          flagSessionMfa();
          logAudit({
            actor: user.name,
            actorEmail: user.email,
            action: 'auth.2fa.recovery_used',
            target: user.email,
            detail: 'Signed in with a single-use recovery code',
            severity: 'warning',
          });
          return { ok: true, usedRecovery: true };
        }
        // right shape, wrong code — a failed verification like any other
        return noteFailure();
      }

      const result = await verifyTotp(enrolment.secret, code);
      if (!result.ok) {
        return noteFailure();
      }
      persistEnrolment({ ...enrolment, failCount: 0, lockedUntil: undefined });
      flagSessionMfa();
      logAudit({
        actor: user.name,
        actorEmail: user.email,
        action: 'auth.2fa.verified',
        target: user.email,
        detail: 'Verification code accepted',
        severity: 'info',
      });
      return { ok: true };
    },
    [user, flagSessionMfa]
  );

  const disableTwoFactor = useCallback(
    async (code: string) => {
      if (!user) return false;
      const enrolment = readEnrolments()[user.id];
      if (!enrolment) return false;
      // disabling requires passing the same throttle as verifying
      const lock = checkLock(enrolment, Date.now());
      if (lock.locked) return false;
      const result = await verifyTotp(enrolment.secret, code);
      if (!result.ok) {
        const throttled = recordFailure(enrolment, Date.now());
        const map = readEnrolments();
        map[user.id] = {
          ...enrolment,
          failCount: throttled.failCount,
          lockedUntil: throttled.lockedUntil,
        };
        writeEnrolments(map);
        logAudit({
          actor: user.name,
          actorEmail: user.email,
          action: 'auth.2fa.failed',
          target: user.email,
          detail: 'Disable-2FA code rejected',
          severity: 'warning',
        });
        return false;
      }
      const map = readEnrolments();
      delete map[user.id];
      writeEnrolments(map);
      logAudit({
        actor: user.name,
        actorEmail: user.email,
        action: 'auth.2fa.disabled',
        target: user.email,
        detail: 'Two-factor authentication removed from this device',
        severity: 'warning',
      });
      return true;
    },
    [user]
  );

  /* ---------------------------------------------------------------- */
  /* Session lifecycle                                                 */
  /* ---------------------------------------------------------------- */

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

  /** Finish the post-Google registration: stamp the group + profile fields. */
  const completeRegistration = useCallback(
    (info: { accountType: AccountType; phone?: string; company?: string; name?: string }) => {
      if (!user) return;
      const patch: Partial<UserAccount> = {
        accountType: info.accountType,
        onboardedAt: new Date().toISOString(),
      };
      if (info.phone?.trim()) patch.phone = info.phone.trim();
      if (info.company?.trim()) patch.company = info.company.trim();
      if (info.name?.trim()) patch.name = info.name.trim();
      updateUser(patch);
      logAudit({
        actor: user.name,
        actorEmail: user.email,
        action: 'account.registered',
        target: user.email,
        detail: `Registered as ${info.accountType}`,
        severity: 'info',
      });
    },
    [user, updateUser]
  );

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
      loginWithGoogleCredential,
      logout,
      updateUser,
      isLoggedIn: !!user,
      isAdmin: user?.role === 'admin',
      mfaVerified: !!session?.mfaVerified,
      needsTwoFactor,
      accountRequiresTwoFactor,
      twoFactorEnrolled: !!myEnrolment,
      beginTwoFactorEnrolment,
      confirmTwoFactorEnrolment,
      verifyTwoFactor,
      disableTwoFactor,
      requireAuth,
      completeRegistration,
      needsRegistration,
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
      loginWithGoogleCredential,
      logout,
      updateUser,
      needsTwoFactor,
      accountRequiresTwoFactor,
      myEnrolment,
      beginTwoFactorEnrolment,
      confirmTwoFactorEnrolment,
      verifyTwoFactor,
      disableTwoFactor,
      requireAuth,
      completeRegistration,
      needsRegistration,
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
