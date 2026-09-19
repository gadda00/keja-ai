'use client';
/**
 * PortalGate — the shared three-state workspace gate (wave 18).
 * ---------------------------------------------------------------------------
 * Wave 17 gave /develop and /pro the "portal reality" shape: a guest
 * sign-in/registration gate, a one-click account-type switch for signed-in
 * users in the wrong lane, and the workspace itself. Five more stakeholder
 * portals needed the same contract (the usability review behind wave 18:
 * "there other portals ensure all are done appropriately"), so the pattern
 * is extracted here once instead of being hand-copied into every view:
 *
 *   1. GUESTS → a sign-in / registration gate. One Google sign-in; the
 *      first-time registration step asks "what brings you to Keja" and a
 *      member of the portal's lane lands right back in the workspace.
 *   2. SIGNED-IN WRONG LANE → an explicit one-click switch (or first-time
 *      registration) — never a silent dead end.
 *   3. THE LANE (or ANY signed-in account, for cross-cutting portals such
 *      as the diaspora desk) → the workspace itself.
 *
 * Every portal that renders "Open workspace" from the homepage stakeholder
 * grid now behaves identically: auth first, personalised workspace after.
 */
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ArrowRight, LogIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { accountTypeInfo, type AccountType } from '@/lib/accountTypes';
import { navigate } from '@/lib/router';

export interface PortalGateFeature {
  icon: LucideIcon;
  title: string;
  text: string;
}

export interface PortalGateProps {
  /** Badge chip, e.g. "Keja Manage · Landlord console" */
  badge: string;
  /** Guest-gate headline, e.g. "The landlord console" */
  title: string;
  /** Guest-gate body copy (plain text or light JSX) */
  blurb: ReactNode;
  /** The account lane this workspace expects — 'any' admits every
   *  signed-in account (cross-cutting portals, e.g. diaspora). */
  lane: AccountType | 'any';
  /** Human label used in copy, e.g. "landlord", "investor". */
  laneLabel: string;
  /** Sentence-case lane label for the registration hint, e.g. "Investor". */
  laneTitle: string;
  /** The intent reason handed to requireAuth ("the landlord console"). */
  intent: string;
  /** The three feature cards rendered on the guest gate. */
  features: PortalGateFeature[];
  /** Optional footnote under the guest gate (verification, partners…). */
  footnote?: ReactNode;
  /** The workspace — rendered only for the right lane. */
  children: ReactNode;
}

/* ------------------------------ gate states -------------------------------- */

function GuestGate({
  badge,
  title,
  blurb,
  laneLabel,
  laneTitle,
  intent,
  features,
  footnote,
}: Omit<PortalGateProps, 'children' | 'lane'>) {
  const { requireAuth } = useAuth();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <Badge variant="outline" className="border-primary/40 font-bold text-primary">{badge}</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-xl leading-relaxed text-muted-foreground">{blurb}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button className="font-black" onClick={() => requireAuth(intent, () => undefined)}>
            <LogIn className="mr-1.5 h-4 w-4" aria-hidden /> Sign in / create {laneLabel} account
          </Button>
          <Button variant="outline" className="font-bold" onClick={() => navigate('/properties')}>
            Browse the marketplace first
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          One Google sign-in. New accounts pick their lane — choose{' '}
          <strong>{laneTitle}</strong> and you land right back here.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border bg-card p-5">
            <f.icon className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="mt-3 text-sm font-black">{f.title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </div>

      {footnote && (
        <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">{footnote}</p>
      )}
    </div>
  );
}

/** Signed in, but this workspace expects a different lane — an explicit
 *  switch (or first-time registration), not a dead end. */
function AccountSwitchCard({
  lane,
  laneLabel,
  laneTitle,
}: {
  lane: AccountType;
  laneLabel: string;
  laneTitle: string;
}) {
  const { user, completeRegistration, updateUser } = useAuth();
  if (!user) return null;
  const unregistered = !user.accountType;

  const switchLane = () => {
    if (unregistered) {
      completeRegistration({ accountType: lane, phone: user.phone, company: user.company });
    } else {
      updateUser({ accountType: lane });
    }
  };

  const info = accountTypeInfo(lane);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="rounded-3xl border bg-card p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-2xl" aria-hidden>
          {info.emoji}
        </div>
        <h1 className="mt-4 text-xl font-black">
          This workspace needs {unregistered ? 'your account set up' : `a ${laneLabel} account`}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          You&rsquo;re signed in as <strong className="text-foreground">{user.name}</strong> (
          {unregistered ? 'account not registered yet' : `${user.accountType} account`}).{' '}
          {unregistered
            ? `Register as ${laneTitle} and the workspace personalises to you immediately.`
            : `Switching adds the ${laneLabel} journey to your account — your other activity stays untouched, and you can change it any time from your account page.`}
        </p>
        <Button className="mt-5 font-black" onClick={switchLane}>
          {unregistered ? `Register as ${laneTitle}` : `Switch to ${laneTitle}`}
          <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------ the gate ----------------------------------- */

export function PortalGate(props: PortalGateProps) {
  const { isLoggedIn, user } = useAuth();
  const { lane, children } = props;

  if (!isLoggedIn || !user) return <GuestGate {...props} />;
  // lane is a concrete AccountType here — 'any' never routes to the switch
  // card (cross-cutting portals admit every signed-in account).
  if (lane !== 'any' && user.accountType !== lane) {
    return (
      <AccountSwitchCard
        lane={lane as AccountType}
        laneLabel={props.laneLabel}
        laneTitle={props.laneTitle}
      />
    );
  }
  return <>{children}</>;
}

/** Inline hint for cross-cutting ('any'-lane) portals when the signed-in
 *  account skipped registration: personalisation is one lane pick away. */
export function RegistrationHint() {
  const { needsRegistration } = useAuth();
  if (!needsRegistration) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold-soft p-4">
      <p className="text-xs leading-relaxed text-gold-foreground">
        <strong>One step left.</strong> Pick your Keja lane to personalise this workspace — saved
        homes, quick actions and the surfaces built for your journey.
      </p>
      <Button
        size="sm"
        className="h-8 shrink-0 text-xs font-black"
        onClick={() => navigate('/account')}
      >
        Choose your lane <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
      </Button>
    </div>
  );
}
