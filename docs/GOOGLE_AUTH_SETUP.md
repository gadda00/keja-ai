# Google Sign-In & Google Authenticator — Account & 2FA Runbook

Keja uses **Google-only accounts**: Google Identity Services (GIS) is the
single sign-in method. The demo one-tap accounts and email/password
sign-in were **retired on 2026-09-11** — one identity provider, one trust
path. On top of Google sign-in, admin (and opt-in) accounts verify a
**second factor: a 6-digit RFC 6238 TOTP code from Google Authenticator**
(or any authenticator app).

Production activation is a one-time, ~5-minute job:

```
Google Cloud Console → OAuth client → Vercel env vars → redeploy
```

No code changes are required — the app auto-dectects the client ID at
build time.

---

## 1. Create the OAuth client (Google Cloud Console)

1. Open <https://console.cloud.google.com/> and sign in with the Google
   account that owns the platform (e.g. the Chacadom account).
2. Create/select a project (e.g. `keja-ai`).
3. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: `Keja AI`, support email, developer contact.
   - Add scopes: `openid`, `userinfo.email`, `userinfo.profile`.
   - (Optional, before real public traffic) Publish the app so users
     aren't shown the "unverified" warning; you can submit verification
     with just those three basic scopes.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorised JavaScript origins** — add every origin you serve:
     - `https://keja.app`
     - `https://keja-ai-rho.vercel.app` (Vercel preview/production URL)
     - `http://localhost:3000` (local dev, optional)
   - No redirect URIs are needed (GIS uses a popup / One Tap).
5. Copy the generated client ID — it looks like
   `1234567890-abc123.apps.googleusercontent.com`.

## 2. Configure the admin allowlist

Decide which Google accounts are platform **admins**. Comma-separated,
case-insensitive:

```
torv54@gmail.com
```

- Allowlisted emails are **upgraded** to `admin` on Google sign-in.
- The rule never downgrades an existing admin.
- Everyone else gets the standard `user` role.
- The public administrator contact (shown on the admin gate, the footer
  and the Trust Center) is `SITE.adminEmail` in `src/config/index.ts` —
  currently `torv54@gmail.com`.

## 3. Set the environment variables (Vercel)

Vercel → the `keja-ai` project → **Settings → Environment Variables**:

| Key | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `…apps.googleusercontent.com` | Production, Preview |
| `NEXT_PUBLIC_ADMIN_EMAILS` | `torv54@gmail.com` | Production, Preview |

(Or via CLI: `vercel env add NEXT_PUBLIC_ADMIN_EMAILS production`.)

## 4. Redeploy

The values are **build-time inlined** (static-export safe), so a redeploy
is required once after setting them:

- Push any commit to `main` (the deploy workflow rebuilds), or
- Vercel dashboard → Deployments → ⋯ → **Redeploy**.

## 5. Verify

1. Open <https://keja.app> → Sign in — the Google button is the **only**
   sign-in method rendered.
2. Sign in with the admin Google account → the modal advances to the
   **two-factor step**.
3. First admin visit: enrol Google Authenticator by scanning the QR
   (or entering the setup key manually) → enter the 6-digit code →
   **save the recovery codes**.
4. Visit `#/admin` — the console opens after the 2FA step; the account
   avatar on the Account page shows the Google profile photo.
5. Regular users: `#/account → Preferences & security` offers optional
   2FA enable/disable.

---

## Two-factor (Google Authenticator) — how it works

| Rule | Behaviour |
|---|---|
| Admin accounts | 2FA **required** — the admin console (and the sign-in flow) demands a valid code; first visit runs the enrolment wizard |
| Regular accounts | 2FA **optional** — enable/disable from `#/account → Preferences & security` |
| Codes | RFC 6238 TOTP, SHA-1, 6 digits, 30-second step, ±1 step clock drift accepted |
| Recovery | 8 single-use `XXXXX-XXXXX` codes shown once at enrolment; each unlocks one sign-in |
| Storage | Enrolment secret + remaining recovery codes live on this device (`localStorage`), never transmitted |
| Session | Every fresh session starts `mfaVerified: false`; a valid code flips it for that session |

What this is (honest scope): a device-local second factor that hardens the
admin UI against casual use of a borrowed/hijacked Google session on this
device. What this is not yet: a server-side policy — that arrives with the
Phase-2 auth service, where the same RFC 6238 module (`src/lib/totp.ts`)
moves verbatim to the server and the secret never touches the browser
again.

## How it works (for maintainers)

| Piece | Where |
|---|---|
| Client ID + admin allowlist config | `src/config/index.ts` (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_ADMIN_EMAILS`) |
| GIS loader, JWT decode, claim validation, role mapping | `src/lib/googleAuth.ts` (pure functions, unit-tested in `tests/googleAuth.test.ts`) |
| TOTP (RFC 6238) + base32 + otpauth URI | `src/lib/totp.ts` (pure functions, unit-tested in `tests/totp.test.ts` against the RFC appendix-B vectors) |
| Sign-in flow + find-or-create account + 2FA state | `src/lib/auth.tsx` → `loginWithGoogleCredential()`, `verifyTwoFactor()`, `confirmTwoFactorEnrolment()` |
| Sign-in UI (Google-only + 2FA step) | `src/components/shell/AuthModal.tsx` |
| 2FA challenge / enrolment wizard (shared) | `src/components/common/TwoFactorChallenge.tsx` (QR via dynamic `qrcode` import) |
| Admin gate (Google + allowlist + 2FA) | `src/components/admin/AdminGate.tsx` |
| CSP allowances for accounts.google.com | `vercel.json` (script/frame/img/connect-src) |

Claim checks performed on every credential: issuer
(`accounts.google.com`), audience (must equal our client ID), expiry,
email presence, and `email_verified`. This is the correct model for a
static front-end: Google itself cryptographically signed the token and
delivered it over its own postMessage channel; our checks stop wrong-app
and stale-token mistakes. When the Phase-2 backend ships, the same token
should additionally be verified server-side (signature against Google's
JWKS) before any privileged server action.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Button doesn't render | Client ID not set at build time — check Vercel env var, then **redeploy**; confirm with `view-source:` that the build picked it up. |
| "Token was issued for a different app" | The client ID in `NEXT_PUBLIC_GOOGLE_CLIENT_ID` doesn't match the one that issued the token — usually a stale build. |
| Popup blocked | The GIS button uses `ux_mode: 'popup'`; browsers require it be opened from a user gesture — it is (a tap on the Google button). |
| Origin rejected in console | The origin is missing from the OAuth client's **Authorised JavaScript origins**. |
| Admin console 403 after Google sign-in | Email not in `NEXT_PUBLIC_ADMIN_EMAILS` — add it and redeploy. |
| 2FA code always rejected | Check the device clock (codes are time-based, ±30 s drift allowed). Re-enrol if the device changed. |
| Lost the authenticator device | Sign in with a recovery code, then re-enrol. All codes used? Clearing Keja data on the device resets the local enrolment (Google sign-in still works — admin re-enrols on next visit). |
