'use client';
/**
 * Account — the account home: registration for new members, profile,
 * group workspace shortcuts, saved homes & searches, property manager for
 * posting groups, and preferences & security (language, 2FA, data).
 */
import { useMemo, useState } from 'react';
import {
  ArrowRight, BadgeCheck, Bell, Building2, Globe, Heart, KeyRound, LogIn,
  LogOut, Search, Settings, ShieldCheck, Sparkles, User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TwoFactorChallenge } from '@/components/common/TwoFactorChallenge';
import { useAuth, initials } from '@/lib/auth';
import { isPictureUrl } from '@/lib/googleAuth';
import { useStore } from '@/lib/store';
import { useSavedSearches } from '@/lib/searchStore';
import { useAllProperties } from '@/lib/inventory';
import { useUserListings } from '@/lib/adminStore';
import { LANGUAGES, useI18n } from '@/lib/i18n';
import { navigate } from '@/lib/router';
import { PropertyRow } from '@/components/property/PropertyCard';
import {
  ACCOUNT_TYPES,
  accountTypeInfo,
  type AccountType,
} from '@/lib/accountTypes';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Shared bits                                                          */
/* ------------------------------------------------------------------ */

function Avatar({ name, picture }: { name?: string; picture?: string }) {
  return (
    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-primary text-xl font-black text-primary-foreground">
      {isPictureUrl(picture) ? (
        <img src={picture} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
      ) : name ? (
        <span aria-hidden>{initials(name)}</span>
      ) : (
        <User className="h-7 w-7" aria-hidden />
      )}
    </div>
  );
}

/** Group chooser — used by the registration card and the profile editor. */
function AccountTypePicker({
  value,
  onChange,
}: {
  value: AccountType | null;
  onChange: (t: AccountType) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Account type">
      {ACCOUNT_TYPES.map((t) => (
        <button
          key={t.value}
          type="button"
          role="radio"
          aria-checked={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'flex items-center gap-2.5 rounded-2xl border p-3 text-left transition-all',
            value === t.value ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/40',
          )}
        >
          <span className="text-lg" aria-hidden>{t.emoji}</span>
          <span className="min-w-0">
            <span className="block text-sm font-black">{t.label}</span>
            <span className="mt-0.5 block line-clamp-2 text-[11px] leading-snug text-muted-foreground">{t.blurb}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Guest view — registration                                            */
/* ------------------------------------------------------------------ */

function GuestAccount() {
  const { setAuthModalOpen } = useAuth();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Registration hero */}
      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="grid gap-6 p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <Badge variant="outline" className="border-primary/40 font-bold text-primary">
              Free account · one tap with Google
            </Badge>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Create your Keja account
            </h1>
            <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
              One Google account unlocks every surface — searching and saving homes, posting
              and managing properties, investment tools and your personal workspace. No
              passwords: Keja never sees your Google password, and you can add Google
              Authenticator two-factor for extra protection.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button className="font-black" onClick={() => setAuthModalOpen(true)}>
                <LogIn className="mr-1.5 h-4 w-4" aria-hidden /> Continue with Google
              </Button>
              <p className="text-xs text-muted-foreground">
                Already a member? The same button signs you in.
              </p>
            </div>
          </div>
          <div className="grid gap-2.5 rounded-2xl border bg-background/60 p-4">
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden /> What stays on this device today
            </p>
            <ul className="grid gap-1.5 text-xs leading-relaxed text-muted-foreground">
              <li className="flex gap-1.5"><BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden /> Favourites, searches and portfolio</li>
              <li className="flex gap-1.5"><BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden /> Posted properties and 2FA enrolment</li>
              <li className="flex gap-1.5"><BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden /> Sessions (12h, or 30 days with remember me)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* What each group gets */}
      <h2 className="mt-10 text-sm font-black uppercase tracking-wider text-muted-foreground">
        Built for every journey
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACCOUNT_TYPES.map((t, i) => (
          <button
            key={t.value}
            onClick={() => setAuthModalOpen(true)}
            className="group flex flex-col gap-2 rounded-3xl border bg-card p-5 text-left transition-colors hover:border-primary/40"
          >
            <span className="text-2xl" aria-hidden>{t.emoji}</span>
            <span className="flex items-center gap-2 text-sm font-black">
              {t.label}
              {i === 0 && <Badge className="border-0 bg-primary/10 text-[9px] text-primary">most popular</Badge>}
            </span>
            <span className="text-xs leading-relaxed text-muted-foreground">{t.blurb}</span>
            <span className="mt-1 flex items-center gap-1 text-xs font-bold text-primary">
              Get started <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </button>
        ))}
        <div className="flex flex-col justify-center gap-2 rounded-3xl border border-dashed bg-card/60 p-5">
          <span className="text-2xl" aria-hidden>🛡️</span>
          <span className="text-sm font-black">Administrator</span>
          <span className="text-xs leading-relaxed text-muted-foreground">
            Invite-only — granted by email allowlist, protected with mandatory Google
            Authenticator 2FA.
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Signed-in view                                                       */
/* ------------------------------------------------------------------ */

function RegistrationCard() {
  const { user, completeRegistration } = useAuth();
  const [type, setType] = useState<AccountType | null>(null);
  const [phone, setPhone] = useState(user?.phone ?? '');
  if (!user) return null;
  return (
    <div className="rounded-3xl border-2 border-primary/30 bg-primary/[0.03] p-5">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-sm font-black">Finish setting up your account</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Pick what brings you to Keja and we&rsquo;ll tailor your workspace — the right tools,
            the right first screen. You can change this any time.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <AccountTypePicker value={type} onChange={setType} />
      </div>
      <label className="mt-3 grid max-w-xs gap-1.5">
        <span className="text-xs font-bold">Phone <span className="font-normal text-muted-foreground">(optional)</span></span>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254…" inputMode="tel" className="h-9" />
      </label>
      <Button
        className="mt-4 font-black"
        disabled={!type}
        onClick={() => type && completeRegistration({ accountType: type, phone })}
      >
        Save my profile
      </Button>
    </div>
  );
}

function MyListings() {
  const { user } = useAuth();
  const [userListings] = useUserListings();
  const all = useAllProperties();

  const mine = useMemo(() => {
    const ids = new Set(
      userListings
        .filter((l) => !l.ownerEmail || (user && l.ownerEmail === user.email))
        .map((l) => l.id),
    );
    return all.filter((p) => ids.has(p.id));
  }, [userListings, user, all]);

  return (
    <div>
      {mine.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-card/60 p-10 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground/40" aria-hidden />
          <p className="mt-3 text-sm font-bold">No properties posted yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Landlords, developers and agents: publish your first property with the guided
            wizard — pricing feedback and verification screens included.
          </p>
          <Button className="mt-4 font-bold" onClick={() => navigate('/sell')}>
            Post a property
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-muted-foreground">
              {mine.length} posted · visible in the marketplace on this device
            </p>
            <Button size="sm" className="h-8 text-xs font-bold" onClick={() => navigate('/sell')}>
              Post another
            </Button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {mine.map((p) => (
              <PropertyRow key={p.id} property={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ProfileEditor() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [company, setCompany] = useState(user?.company ?? '');
  const [type, setType] = useState<AccountType | null>(user?.accountType ?? null);
  if (!user) return null;

  const save = () => {
    updateUser({
      name: name.trim() || user.name,
      phone: phone.trim() || undefined,
      company: company.trim() || undefined,
      ...(type ? { accountType: type } : {}),
    });
    setEditing(false);
  };

  return (
    <div className="rounded-3xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider">Profile</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            How you appear on Keja — your name on listings, replies and reviews.
          </p>
        </div>
        {!editing && (
          <Button size="sm" variant="outline" className="h-8 text-xs font-bold" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>
      {editing ? (
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1.5">
            <span className="text-xs font-bold">Display name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-bold">Phone</span>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254…" inputMode="tel" className="h-9" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-bold">Company / agency</span>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} className="h-9" />
            </label>
          </div>
          <div>
            <p className="text-xs font-bold">I use Keja as…</p>
            <div className="mt-2">
              <AccountTypePicker value={type} onChange={setType} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="font-bold" onClick={save}>Save changes</Button>
            <Button size="sm" variant="ghost" className="font-bold" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <dl className="mt-4 grid gap-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</dt>
            <dd className="font-bold">{user.name}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</dt>
            <dd className="font-mono text-xs">{user.phone || '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Company</dt>
            <dd className="font-bold">{user.company || '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">I use Keja as</dt>
            <dd className="font-bold">{user.accountType ? `${accountTypeInfo(user.accountType).emoji} ${accountTypeInfo(user.accountType).label}` : '—'}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

function OverviewTab() {
  const { user, isAdmin } = useAuth();
  if (!user) return null;
  const info = user.accountType ? accountTypeInfo(user.accountType) : null;
  const actions = info?.actions ?? [
    { label: 'Browse properties', to: '/properties' },
    { label: 'Ask Keja AI', to: '/ask' },
    { label: 'Market data', to: '/data' },
  ];

  return (
    <div className="grid gap-4">
      {(!user.accountType || !user.onboardedAt) && <RegistrationCard />}
      {isAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-gold/50 bg-gold-soft p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold-foreground" aria-hidden />
            <div>
              <h2 className="text-sm font-black text-gold-foreground">Administrator access</h2>
              <p className="mt-1 text-xs leading-relaxed text-gold-foreground/80">
                The platform console — submissions, feeds, partners, users and audit trail —
                behind your second factor.
              </p>
            </div>
          </div>
          <Button size="sm" className="font-black" onClick={() => navigate('/admin')}>
            Open admin console <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      )}

      {/* group quick actions */}
      <div className="rounded-3xl border bg-card p-5">
        <h2 className="text-sm font-black uppercase tracking-wider">
          {info ? `${info.emoji} Your ${info.label.toLowerCase()} workspace` : 'Quick actions'}
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {actions.map((a) => (
            <button
              key={a.to + a.label}
              onClick={() => navigate(a.to)}
              className="group flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              {a.label}
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>
          ))}
        </div>
      </div>

      <ProfileEditor />

      {/* session summary */}
      <div className="rounded-3xl border bg-card p-5">
        <h2 className="text-sm font-black uppercase tracking-wider">Membership</h2>
        <dl className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-accent/50 px-4 py-2.5">
            <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Member since</dt>
            <dd className="text-sm font-bold">{new Date(user.createdAt).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-accent/50 px-4 py-2.5">
            <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sign-ins</dt>
            <dd className="text-sm font-bold">{user.loginCount}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default function AccountView() {
  const {
    user,
    logout,
    twoFactorEnrolled,
    isAdmin,
    disableTwoFactor,
  } = useAuth();
  const all = useAllProperties();
  const [favorites] = useStore<string[]>('favorites', []);
  const { searches, remove, toggleAlerts } = useSavedSearches();
  const { lang, setLang } = useI18n();

  // 2FA management state
  const [securityPanel, setSecurityPanel] = useState<'idle' | 'enrol' | 'disable'>('idle');
  const [disableCode, setDisableCode] = useState('');
  const [disableError, setDisableError] = useState('');

  const saved = all.filter((p) => favorites.includes(p.id));

  /* ------------------------- guest: registration ------------------------ */
  if (!user) return <GuestAccount />;

  /* --------------------------- member header ---------------------------- */
  const memberInfo = user.accountType ? accountTypeInfo(user.accountType) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* profile header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} picture={user.picture} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black">{user.name}</h1>
              {memberInfo && (
                <Badge variant="outline" className="border-primary/40 font-bold text-primary">
                  {memberInfo.emoji} {memberInfo.label}
                </Badge>
              )}
              {isAdmin && <Badge className="border-0 bg-gold font-bold text-gold-foreground">Admin</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {user.email} · Google account · member since{' '}
              {new Date(user.createdAt).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
        <Button variant="outline" className="font-bold" onClick={() => logout()}>
          <LogOut className="mr-1.5 h-4 w-4" aria-hidden /> Sign out
        </Button>
      </div>

      <Tabs defaultValue="overview" className="mt-7">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="gap-1.5 font-bold"><User className="h-4 w-4" aria-hidden /> Overview</TabsTrigger>
          <TabsTrigger value="favorites" className="gap-1.5 font-bold"><Heart className="h-4 w-4" aria-hidden /> Saved homes ({saved.length})</TabsTrigger>
          <TabsTrigger value="searches" className="gap-1.5 font-bold"><Bell className="h-4 w-4" aria-hidden /> Saved searches ({searches.length})</TabsTrigger>
          <TabsTrigger value="listings" className="gap-1.5 font-bold"><Building2 className="h-4 w-4" aria-hidden /> My listings</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 font-bold"><Settings className="h-4 w-4" aria-hidden /> Preferences &amp; security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="favorites" className="mt-6">
          {saved.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-card/60 p-10 text-center">
              <Heart className="mx-auto h-8 w-8 text-muted-foreground/40" aria-hidden />
              <p className="mt-3 text-sm font-bold">Nothing saved yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Tap the heart on any listing to keep it here.</p>
              <Button className="mt-4 font-bold" onClick={() => navigate('/properties')}>Discover properties</Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {saved.map((p) => (
                <PropertyRow key={p.id} property={p} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="searches" className="mt-6">
          {searches.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-card/60 p-10 text-center">
              <Search className="mx-auto h-8 w-8 text-muted-foreground/40" aria-hidden />
              <p className="mt-3 text-sm font-bold">No saved searches</p>
              <p className="mt-1 text-sm text-muted-foreground">Save any search on the discovery page and we&rsquo;ll alert you on new matches.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {searches.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{s.label}</p>
                    <p className="text-xs text-muted-foreground">
                      saved {new Date(s.createdAt).toLocaleDateString('en-KE')} · {s.alerts ? 'alerts on' : 'alerts off'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-bold"
                    onClick={() => navigate(`/properties${s.filters.q ? `?q=${encodeURIComponent(s.filters.q)}` : ''}`)}
                  >
                    Run search
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs font-bold" onClick={() => toggleAlerts(s.id)}>
                    {s.alerts ? 'Mute' : 'Unmute'}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs font-bold text-destructive" onClick={() => remove(s.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="listings" className="mt-6">
          <MyListings />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border bg-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                <Globe className="h-4 w-4 text-gold" aria-hidden /> Language · Lugha · Langue
              </h2>
              <div className="mt-3 grid gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={cn(
                      'flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold transition-colors',
                      lang === l.code ? 'border-primary bg-primary/5 text-primary' : 'hover:border-primary/40',
                    )}
                  >
                    {l.label}
                    {lang === l.code && <Badge className="border-0 bg-primary text-[9px]">active</Badge>}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Longer term: Kinyarwanda, Luganda, Amharic and Arabic as Keja expands across Africa.
              </p>
            </div>

            {/* Two-factor authentication (Google Authenticator) */}
            <div className="rounded-3xl border bg-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                <KeyRound className="h-4 w-4 text-gold" aria-hidden /> Two-factor authentication
              </h2>
              {securityPanel === 'enrol' ? (
                <div className="mt-3">
                  <TwoFactorChallenge mode="enrol" compact onDone={() => setSecurityPanel('idle')} onCancel={() => setSecurityPanel('idle')} />
                </div>
              ) : securityPanel === 'disable' ? (
                <div className="mt-3 grid gap-2">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Enter a current 6-digit code from Google Authenticator to turn 2FA off on this device.
                  </p>
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    value={disableCode}
                    onChange={(e) => { setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setDisableError(''); }}
                    placeholder="6-digit code"
                    className="text-center font-mono tracking-[0.3em]"
                    aria-label="Code to disable two-factor"
                  />
                  {disableError && (
                    <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive" role="alert">{disableError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="font-bold"
                      disabled={disableCode.length !== 6}
                      onClick={async () => {
                        if (await disableTwoFactor(disableCode)) {
                          setSecurityPanel('idle');
                          setDisableCode('');
                        } else {
                          setDisableError('Incorrect code — 2FA stays on.');
                        }
                      }}
                    >
                      Turn off 2FA
                    </Button>
                    <Button size="sm" variant="ghost" className="font-bold" onClick={() => { setSecurityPanel('idle'); setDisableCode(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : twoFactorEnrolled ? (
                <div className="mt-3 text-sm leading-relaxed">
                  <p className="flex items-center gap-1.5 font-bold text-primary">
                    <ShieldCheck className="h-4 w-4" aria-hidden /> Enabled — Google Authenticator
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Each sign-in asks for a 6-digit code from your authenticator app.
                    {isAdmin ? ' Admin accounts always require the second factor.' : ''}
                  </p>
                  <Button size="sm" variant="outline" className="mt-3 font-bold" onClick={() => setSecurityPanel('disable')}>
                    Turn off
                  </Button>
                </div>
              ) : (
                <div className="mt-3 text-sm leading-relaxed">
                  <p className="text-xs text-muted-foreground">
                    Add a second factor with Google Authenticator (or any authenticator app): a
                    6-digit code refreshed every 30 seconds on top of your Google sign-in.
                    {isAdmin ? ' Admin accounts are required to enrol.' : ''}
                  </p>
                  <Button size="sm" className="mt-3 font-bold" onClick={() => setSecurityPanel('enrol')}>
                    <KeyRound className="mr-1.5 h-4 w-4" aria-hidden /> Enable 2FA
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-3xl border bg-card p-5">
              <h2 className="text-sm font-black uppercase tracking-wider">Data & privacy</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                This trial stores everything locally: favourites, searches, portfolio, chat history,
                posted listings and your 2FA enrolment never leave this device. Clearing browser
                data resets the platform (and disables 2FA here).
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 font-bold text-destructive"
                onClick={() => {
                  const keys = Object.keys(localStorage).filter((k) => k.startsWith('keja:'));
                  keys.forEach((k) => localStorage.removeItem(k));
                  window.location.reload();
                }}
              >
                Clear all Keja data on this device
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
