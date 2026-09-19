'use client';
/**
 * AccountMenu — the top-right account entry, portal-aware (wave 19).
 * ---------------------------------------------------------------------------
 * The old navbar "Account" button was a dead label: it told the visitor
 * nothing about which account they were signing into, and a signed-in
 * user had to leave for /account to see anything about themselves.
 *
 * This popover answers both halves of "show which account one is logging
 * into":
 *
 *   GUESTS          → "Sign in / Register" entry (opens the auth modal,
 *                     first-time sign-ins pick their lane right there)
 *                     + the eight portal cards, so a guest can see where
 *                     each journey lands before committing.
 *   SIGNED IN       → profile (avatar, name, email, lane/portal chip,
 *                     2FA status) and, right below it, that portal's
 *                     elements — the quick links registered for the
 *                     account's lane + "My account" + "Sign out".
 *   VIEWING CONTEXT → when the current route belongs to one of the eight
 *                     portals, a "Viewing" strip names the workspace and
 *                     confirms the lane match (or offers the one-click
 *                     switch, same contract as PortalGate).
 */
import { useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  CircleCheck,
  DoorOpen,
  LogIn,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth';
import { accountTypeInfo } from '@/lib/accountTypes';
import { PORTAL_DIRECTORY, portalContextForRoute, portalForAccountType } from '@/lib/portalDirectory';
import { Link, navigate, useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';

/* ------------------------------ helpers ---------------------------------- */

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function Avatar({ picture, name, size = 'h-8 w-8 text-xs' }: { picture?: string; name: string; size?: string }) {
  if (picture) {
    return <img src={picture} alt="" className={cn(size, 'rounded-full object-cover')} />;
  }
  return (
    <span
      aria-hidden
      className={cn(
        size,
        'flex items-center justify-center rounded-full bg-primary font-black text-primary-foreground',
      )}
    >
      {initials(name)}
    </span>
  );
}

/* ------------------------------ guest state -------------------------------- */

function GuestMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { setAuthModalOpen } = useAuth();
  return (
    <div className="w-[21rem] p-3">
      <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Your Keja account
      </p>
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-black">Sign in or register</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          One Google sign-in. New accounts pick their lane — landlord, investor, developer,
          tenant, agent, institution — and land in the workspace built for it.
        </p>
        <Button
          className="mt-3 w-full font-black"
          onClick={() => {
            onNavigate?.();
            setAuthModalOpen(true);
          }}
        >
          <LogIn className="mr-1.5 h-4 w-4" aria-hidden /> Sign in / Register
        </Button>
      </div>
      <p className="mt-3 px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        The eight portals
      </p>
      <div className="grid gap-0.5">
        {PORTAL_DIRECTORY.map((p) => (
          <Link
            key={p.key}
            to={p.route}
            onClick={onNavigate}
            className="group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-accent"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent group-hover:bg-background">
              <p.icon className="h-3.5 w-3.5 text-primary" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold">{p.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{p.workspace}</span>
            </span>
            <ArrowRight className="h-3 w-3 shrink-0 text-gold" aria-hidden />
          </Link>
        ))}
      </div>
    </div>
  );
}

/* --------------------------- signed-in state ------------------------------- */

function ViewingStrip() {
  const { route } = useRouter();
  const portal = portalContextForRoute(route.path);
  const { user } = useAuth();
  if (!portal) return null;
  const laneMatches = portal.lane === 'any' || user?.accountType === portal.lane;
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-accent px-2.5 py-2">
      <p className="min-w-0 text-[11px] leading-tight text-muted-foreground">
        Viewing <span className="font-bold text-foreground">{portal.workspace}</span>
        {portal.lane === 'any' ? ' · open to every account' : ` · ${portal.label} lane`}
      </p>
      {laneMatches ? (
        <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-primary">
          <CircleCheck className="h-3 w-3" aria-hidden /> Your lane
        </span>
      ) : (
        <button
          className="shrink-0 text-[10px] font-bold text-primary hover:underline"
          onClick={() => navigate('/account')}
        >
          Switch lane →
        </button>
      )}
    </div>
  );
}

function SignedInMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout, needsRegistration, twoFactorEnrolled, isAdmin } = useAuth();
  const [leaving, setLeaving] = useState(false);
  if (!user) return null;

  const info = user.accountType ? accountTypeInfo(user.accountType) : null;
  const portal = user.accountType ? portalForAccountType(user.accountType) : null;

  return (
    <div className="w-[21rem] p-3">
      {/* profile */}
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3.5">
        <Avatar picture={user.picture} name={user.name} size="h-10 w-10 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">{user.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {/* lane / portal identity */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 px-1">
        {portal && info ? (
          <Badge variant="outline" className="border-primary/40 font-bold text-primary">
            <span aria-hidden className="mr-1">{info.emoji}</span>
            {portal.name} · {portal.workspace}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-gold/50 bg-gold-soft font-bold text-gold-foreground">
            Lane not chosen
          </Badge>
        )}
        {twoFactorEnrolled && (
          <Badge variant="outline" className="gap-1 font-bold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3 w-3" aria-hidden /> 2FA
          </Badge>
        )}
        {isAdmin && (
          <Badge variant="outline" className="gap-1 border-gold/50 font-bold text-gold-foreground">
            <ShieldCheck className="h-3 w-3" aria-hidden /> Admin
          </Badge>
        )}
      </div>

      {needsRegistration && (
        <button
          className="mt-2 w-full rounded-lg border border-gold/40 bg-gold-soft px-3 py-2 text-left text-[11px] leading-relaxed text-gold-foreground hover:bg-gold-soft/80"
          onClick={() => {
            onNavigate?.();
            navigate('/account');
          }}
        >
          <strong>Finish setup.</strong> Pick your lane to unlock your portal workspace.
          <span className="ml-1 font-bold underline">Choose now →</span>
        </button>
      )}

      <div className="mt-3">
        <ViewingStrip />
      </div>

      {/* portal elements */}
      {info && (
        <>
          <p className="mt-3 px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {portal?.name ?? 'Your portal'} · quick actions
          </p>
          <div className="grid gap-0.5">
            {info.actions.map((a) => (
              <Link
                key={`${a.to}-${a.label}`}
                to={a.to}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors hover:bg-accent"
              >
                <ArrowRight className="h-3 w-3 text-gold" aria-hidden />
                {a.label}
              </Link>
            ))}
          </div>
        </>
      )}

      <Separator className="my-2" />

      <div className="grid gap-0.5">
        <Link
          to="/account"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors hover:bg-accent"
        >
          <UserRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          My account · profile, lane, 2FA
        </Link>
        <button
          disabled={leaving}
          onClick={() => {
            setLeaving(true);
            logout('account menu');
          }}
          className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <DoorOpen className="h-3.5 w-3.5" aria-hidden />
          {leaving ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ the trigger -------------------------------- */

export function AccountMenu() {
  const { isLoggedIn, user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!isLoggedIn) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" className="ml-1 font-bold" aria-label="Sign in or register">
            <LogIn className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Sign in
            <ChevronDown className={cn('ml-1 h-3 w-3 opacity-70 transition-transform', open && 'rotate-180')} aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="p-0" sideOffset={10}>
          <GuestMenu onNavigate={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Your account"
          className="ml-1 flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2 transition-colors hover:bg-accent"
        >
          <Avatar picture={user?.picture} name={user?.name ?? '?'} />
          <span className="hidden max-w-[9rem] truncate text-xs font-bold lg:inline">
            {user?.name.split(' ')[0]}
          </span>
          <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="p-0" sideOffset={10}>
        <SignedInMenu onNavigate={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
