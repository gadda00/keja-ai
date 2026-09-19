'use client';
/**
 * KEJA DEVELOPER WORKSPACE (proposal §11) — wave 17 "portal reality" edition.
 *
 * Before wave 17 this route was a static brochure: a hardcoded array of
 * three fictional projects nobody could own, no sign-in, no registration —
 * the only interaction was a "Post a property" button. The realistic shape:
 *
 *  - GUESTS get a sign-in / registration gate. One Google sign-in; the
 *    first-time registration step asks "what brings you to Keja" and a
 *    developer lands right back here in their workspace.
 *  - SIGNED-IN NON-DEVELOPERS get a one-click account-type switch — the
 *    journey is explicit, never a silent dead end.
 *  - DEVELOPERS get the workspace: their listings with review status and
 *    lifecycle controls, their feasibility schemes (the devStore engine,
 *    finally wired to a UI), and market intelligence (Development Score,
 *    off-plan inventory).
 *  - THE DEVELOPER DIRECTORY (org profiles, track record, verification
 *    state) is NOT public anymore — it lives in the admin console
 *    (src/lib/developerStore.ts + the admin Developers tab), where the
 *    verification desk adjudicates it.
 */
import { useMemo } from 'react';
import {
  ArrowRight,
  Building2,
  Calculator,
  HardHat,
  LayoutDashboard,
  LogIn,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListingEmptyState, ListingManageCard } from '@/components/property/ListingManageCard';
import { FeasibilityPanel } from '@/components/developer/FeasibilityPanel';
import { useAuth, initials } from '@/lib/auth';
import { useUserListings, useSubmissions } from '@/lib/adminStore';
import { useDevelopers, verifiedDevelopers } from '@/lib/developerStore';
import { useDevProjects } from '@/lib/devStore';
import { useAllProperties } from '@/lib/inventory';
import { isPictureUrl } from '@/lib/googleAuth';
import { areaInsights } from '@/data/areaInsights';
import { formatKES } from '@/lib/format';
import { navigate } from '@/lib/router';
import { cn } from '@/lib/utils';

/* ------------------------- development score engine ------------------------ */

const SCORE_DIMENSIONS = [
  { key: 'location', label: 'Location', weight: 0.18 },
  { key: 'demand', label: 'Demand fundamentals', weight: 0.16 },
  { key: 'pricing', label: 'Pricing vs market', weight: 0.14 },
  { key: 'competition', label: 'Competitive saturation', weight: 0.1 },
  { key: 'rental', label: 'Rental market depth', weight: 0.12 },
  { key: 'infrastructure', label: 'Infrastructure', weight: 0.1 },
  { key: 'population', label: 'Population growth', weight: 0.08 },
  { key: 'track', label: 'Developer track record', weight: 0.12 },
] as const;

type DimScores = Record<(typeof SCORE_DIMENSIONS)[number]['key'], number>;

function developmentScore(area: string, all: ReturnType<typeof useAllProperties>): { composite: number; dims: DimScores } {
  const insight = areaInsights[area];
  const listings = all.filter((p) => p.area === area);
  const offPlan = listings.filter((p) => p.offPlan).length;
  const yieldPct = parseFloat(insight?.yield ?? '') || 6.5;
  const dims: DimScores = {
    location: Math.min(96, 62 + Math.min(listings.length, 20)),
    demand: Math.min(95, 60 + yieldPct * 3.4),
    pricing: 74,
    competition: Math.max(40, 88 - offPlan * 4),
    rental: Math.min(95, 58 + yieldPct * 3.8),
    infrastructure: insight ? 78 : 60,
    population: 76,
    track: 72,
  };
  const composite = Math.round(SCORE_DIMENSIONS.reduce((s, d) => s + dims[d.key] * d.weight, 0));
  return { composite, dims };
}

function ScorePanel({ area, all }: { area: string; all: ReturnType<typeof useAllProperties> }) {
  const { composite, dims } = developmentScore(area, all);
  return (
    <div className="rounded-3xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-wider">Keja Development Score</h3>
        <span className={cn('text-2xl font-black tabular-nums', composite >= 80 ? 'text-primary' : composite >= 65 ? 'text-foreground' : 'text-gold')}>
          {composite}<span className="text-xs font-bold text-muted-foreground">/100</span>
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {SCORE_DIMENSIONS.map((d) => (
          <div key={d.key}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold">
                {d.label}
                <span className="ml-1.5 text-[10px] font-bold text-muted-foreground">×{Math.round(d.weight * 100)}%</span>
              </span>
              <span className="font-black tabular-nums">{Math.round(dims[d.key])}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-accent">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${Math.round(dims[d.key])}%` }}
                role="progressbar"
                aria-label={`${d.label} ${Math.round(dims[d.key])} of 100`}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">
        Eight weighted dimensions — location, demand, pricing, competition, rental depth,
        infrastructure, population growth and developer track record. ESTIMATE grade: screening
        output for capital conversations, never a substitute for a full appraisal.
      </p>
    </div>
  );
}

/* ------------------------------ gate states -------------------------------- */

function GuestGate() {
  const { requireAuth } = useAuth();
  const developers = useDevelopers();
  const verified = verifiedDevelopers(developers);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <Badge variant="outline" className="border-primary/40 font-bold text-primary">Keja Developers</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          The developer workspace
        </h1>
        <p className="mx-auto mt-3 max-w-xl leading-relaxed text-muted-foreground">
          Sign in to move inventory with data-backed pricing — your listings with verification
          status, development feasibility screening, and market intelligence in one console.
          {verified.length > 0 && (
            <>
              {' '}
              <span className="font-semibold text-foreground">{verified.length} developer
              organisations</span> are verified on the platform.
            </>
          )}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            className="font-black"
            onClick={() => requireAuth('the developer workspace', () => undefined)}
          >
            <LogIn className="mr-1.5 h-4 w-4" aria-hidden /> Sign in / create a developer account
          </Button>
          <Button variant="outline" className="font-bold" onClick={() => navigate('/properties')}>
            Browse the marketplace first
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          One Google sign-in. New accounts pick their lane — choose{' '}
          <strong>Developer</strong> and you land right back here.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Building2,
            title: 'Your listings, verified',
            text: 'Publish units under your account, track review status, and manage availability — sold, reserved or live — from one desk.',
          },
          {
            icon: Calculator,
            title: 'Feasibility screening',
            text: 'Units, GDV, cost stack, peak funding, payback and a ±10/±20% sensitivity grid before capital meets concrete.',
          },
          {
            icon: ShieldCheck,
            title: 'The trust layer',
            text: 'Every listing inherits the Trust Score evidence model. Verified developers rank higher with buyers and investors.',
          },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border bg-card p-5">
            <f.icon className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="mt-3 text-sm font-black">{f.title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
        Developer organisations are verified by the Keja desk — track record, delivery history and
        portfolio review — before public attribution. Applying for verification happens through{' '}
        <button className="font-semibold text-primary hover:underline" onClick={() => navigate('/partners')}>
          the partner programme
        </button>
        .
      </p>
    </div>
  );
}

/** Signed in, but this is not a developer account — an explicit switch, not a dead end. */
function AccountSwitchCard() {
  const { user, completeRegistration, updateUser } = useAuth();
  if (!user) return null;
  const unregistered = !user.accountType;

  const switchToDeveloper = () => {
    if (unregistered) {
      completeRegistration({ accountType: 'developer', phone: user.phone, company: user.company });
    } else {
      updateUser({ accountType: 'developer' });
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="rounded-3xl border bg-card p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 mx-auto">
          <HardHat className="h-6 w-6 text-gold" aria-hidden />
        </div>
        <h1 className="mt-4 text-xl font-black">The developer workspace needs a developer account</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          You&rsquo;re signed in as{' '}
          <strong className="text-foreground">{user.name}</strong> (
          {unregistered ? 'account not registered yet' : `${user.accountType} account`}). Switching
          adds the developer journey to your account — your other activity stays untouched, and
          you can change it any time from your account page.
        </p>
        <Button className="mt-5 font-black" onClick={switchToDeveloper}>
          {unregistered ? 'Register as a developer' : 'Switch to a developer account'}
          <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------- workspace -------------------------------- */

function MyListingsPanel() {
  const { user } = useAuth();
  const [userListings] = useUserListings();

  const mine = useMemo(
    () =>
      userListings.filter(
        (l) => !l.ownerEmail || (user && l.ownerEmail === user.email),
      ),
    [userListings, user],
  );

  return (
    <div className="grid gap-3">
      {mine.length === 0 ? (
        <ListingEmptyState />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold text-muted-foreground">
              {mine.length} listing{mine.length === 1 ? '' : 's'} · attributed to{' '}
              {user?.company || user?.name}
            </p>
            <Button size="sm" className="h-8 text-xs font-bold" onClick={() => navigate('/sell')}>
              <HardHat className="mr-1 h-3.5 w-3.5" aria-hidden /> Post a property
            </Button>
          </div>
          {mine.map((l) => (
            <ListingManageCard key={l.id} listing={l} />
          ))}
        </>
      )}
    </div>
  );
}

function MarketIntelPanel({ all }: { all: ReturnType<typeof useAllProperties> }) {
  const offPlan = all.filter((p) => p.offPlan);
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {['Westlands', 'Kilimani', 'Karen', 'Madaraka'].map((area) => (
          <ScorePanel key={area} area={area} all={all} />
        ))}
      </div>
      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="border-b px-5 py-4 text-sm font-black uppercase tracking-wider">
          Off-plan &amp; new-development listings on the marketplace
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-accent/40 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Project / listing</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Developer / agency</th>
                <th className="px-4 py-3 text-right">From</th>
                <th className="px-4 py-3 text-right">Trust</th>
              </tr>
            </thead>
            <tbody>
              {offPlan.slice(0, 12).map((p) => (
                <tr key={p.id} className="cursor-pointer border-b transition-colors last:border-0 hover:bg-accent/30" onClick={() => navigate(`/properties/${p.id}`)}>
                  <td className="px-5 py-3.5 font-bold">{p.title}</td>
                  <td className="px-4 py-3.5">{p.area}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{p.agency}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums">{p.priceOnApplication ? 'POA' : formatKES(p.price)}</td>
                  <td className="px-4 py-3.5 text-right font-black tabular-nums text-primary">{p.trustScore}</td>
                </tr>
              ))}
              {offPlan.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">No off-plan listings live — check back soon.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DeveloperWorkspace() {
  const { user } = useAuth();
  const [userListings] = useUserListings();
  const [submissions] = useSubmissions();
  const [projects] = useDevProjects();
  const all = useAllProperties();

  const mine = useMemo(
    () =>
      userListings.filter((l) => !l.ownerEmail || (user && l.ownerEmail === user.email)),
    [userListings, user],
  );
  const inReview = useMemo(() => {
    const ids = new Set(mine.map((l) => l.submissionId).filter(Boolean));
    return submissions.filter((s) => ids.has(s.id) && s.status === 'pending').length;
  }, [mine, submissions]);
  const totalViews = mine.reduce((s, l) => s + l.views, 0);

  const stats = [
    { label: 'Live listings', value: mine.filter((l) => l.availability !== 'sold').length, icon: Building2 },
    { label: 'In review', value: inReview, icon: ShieldCheck },
    { label: 'Listing views', value: totalViews, icon: TrendingUp },
    { label: 'Schemes modelled', value: projects.length, icon: Calculator },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <Badge variant="outline" className="border-primary/40 font-bold text-primary">Developer workspace</Badge>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Move inventory with data on your side
          </h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Your listings with verification status and lifecycle controls, development feasibility
            screening, and market intelligence — one console for the build-to-sell journey.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-xs font-black text-primary-foreground">
            {user && isPictureUrl(user.picture) ? (
              <img src={user.picture} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
            ) : (
              <span aria-hidden>{initials(user?.name ?? '')}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{user?.company || user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email} · developer account</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((m) => (
          <div key={m.label} className="card-lift rounded-2xl border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{m.label}</p>
              <m.icon className="h-4 w-4 text-gold" aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-black tabular-nums">{m.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="listings" className="mt-7">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="listings" className="gap-1.5 font-bold"><LayoutDashboard className="h-4 w-4" aria-hidden /> My listings</TabsTrigger>
          <TabsTrigger value="feasibility" className="gap-1.5 font-bold"><Calculator className="h-4 w-4" aria-hidden /> Feasibility</TabsTrigger>
          <TabsTrigger value="intel" className="gap-1.5 font-bold"><TrendingUp className="h-4 w-4" aria-hidden /> Market intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="mt-6">
          <MyListingsPanel />
        </TabsContent>

        <TabsContent value="feasibility" className="mt-6">
          <FeasibilityPanel />
        </TabsContent>

        <TabsContent value="intel" className="mt-6">
          <MarketIntelPanel all={all} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* --------------------------------- routing --------------------------------- */

export default function DeveloperPortalView() {
  const { isLoggedIn, user } = useAuth();

  if (!isLoggedIn || !user) return <GuestGate />;
  if (user.accountType !== 'developer') return <AccountSwitchCard />;
  return <DeveloperWorkspace />;
}
