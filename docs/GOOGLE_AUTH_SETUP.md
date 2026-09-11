# Google Sign-In — Activation Runbook

Keja ships with a complete **Google Identity Services (GIS)** integration.
Until a Google OAuth client ID is configured, the sign-in modal runs in
**demo mode** (one-tap demo accounts + email/password — clearly labelled).

Activating real Google accounts is a one-time, ~5-minute job:

```
Google Cloud Console → OAuth client → Vercel env var → redeploy
```

No code changes are required — the app auto-detects the client ID at
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

## 2. Configure the admin allowlist (optional but recommended)

Decide which Google accounts are platform **admins**. Comma-separated,
case-insensitive:

```
clive@chacadom.com,ops@keja.app
```

- Allowlisted emails are **upgraded** to `admin` on Google sign-in.
- The rule never downgrades an existing admin.
- Everyone else gets the standard `user` role.

## 3. Set the environment variables (Vercel)

Vercel → the `keja-ai` project → **Settings → Environment Variables**:

| Key | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `…apps.googleusercontent.com` | Production, Preview |
| `NEXT_PUBLIC_ADMIN_EMAILS` | `clive@chacadom.com,…` | Production, Preview |

(Or via CLI: `vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID production`.)

## 4. Redeploy

The values are **build-time inlined** (static-export safe), so a redeploy
is required once after setting them:

- Push any commit to `main` (the deploy workflow rebuilds), or
- Vercel dashboard → Deployments → ⋯ → **Redeploy**.

## 5. Verify

1. Open <https://keja.app> → Sign in — the real Google button now renders
   above the demo accounts.
2. Sign in with the admin Google account → visit `#/admin` — the console
   opens (the account was allowlisted in step 2).
3. The account avatar on the Account page shows the Google profile photo.

---

## How it works (for maintainers)

| Piece | Where |
|---|---|
| Client ID + admin allowlist config | `src/config/index.ts` (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_ADMIN_EMAILS`) |
| GIS loader, JWT decode, claim validation, role mapping | `src/lib/googleAuth.ts` (pure functions, unit-tested in `tests/googleAuth.test.ts`) |
| Sign-in flow + find-or-create account | `src/lib/auth.tsx` → `loginWithGoogleCredential()` |
| Google button UI | `src/components/shell/AuthModal.tsx` → `GoogleSignInButton` |
| Admin gate | `src/components/admin/AdminGate.tsx` |
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
