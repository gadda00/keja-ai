'use client';
/**
 * List property — the 4-step supply wizard with live anomaly feedback.
 *
 * 2026-09-11: posting is account-backed. The contact step prefills from the
 * signed-in Google account, submission requires sign-in (requireAuth → the
 * auth modal, including first-time registration), and every published listing
 * is stamped with the poster's account (ownerEmail / ownerName) so it shows
 * in “My listings” and carries attribution through the review desk.
 */
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, CloudUpload, Home, ListPlus, ShieldCheck, Sparkles, UserRoundCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useAllProperties } from '@/lib/inventory';
import { useSubmissions, useUserListings, submissionToListing } from '@/lib/adminStore';
import { useAuth, initials } from '@/lib/auth';
import { areaInsights } from '@/data/properties';
import { validateListingForm } from '@/lib/boundaries';
import { formatKES } from '@/lib/format';
import { navigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import { newId } from '@/lib/uuid';
import { isPictureUrl } from '@/lib/googleAuth';

const STEPS = ['The property', 'Pricing & purpose', 'Description & photos', 'Review & submit'];
const AREAS = Object.keys(areaInsights).sort();
/** Which wizard step owns which validated field (first-error navigation). */
const FIELD_STEP: Record<string, number> = {
  title: 0, type: 0, area: 0, county: 0, bedrooms: 0, bathrooms: 0, sizeSqm: 0,
  price: 1, rentEstimate: 1, purpose: 1,
  description: 2, phone: 3,
};

export default function ListPropertyView() {
  const all = useAllProperties();
  const [submissions, setSubmissions] = useSubmissions();
  const [, setUserListings] = useUserListings();
  const { user, requireAuth } = useAuth();
  const [step, setStep] = useState(0);
  /** Field-keyed publish errors (first message per field, from the schema). */
  const [errors, setErrors] = useState<Record<string, string>>({});
  // contact step prefills from the signed-in account at mount (the wizard
  // loads lazily on navigation, so the session is already resolved); guests
  // who sign in mid-wizard publish under the fresh account anyway — see
  // publishRef below.
  const [form, setForm] = useState(() => ({
    title: '', type: 'apartment', area: 'Kilimani', county: 'Nairobi',
    bedrooms: 2, bathrooms: 2, sizeSqm: 100, price: 10_000_000, rentEstimate: 80_000,
    purpose: ['buy'] as string[], description: '',
    phone: user?.phone ?? '', email: user?.email ?? '', name: user?.name ?? '',
  }));

  // live anomaly feedback (price vs area band)
  const insight = areaInsights[form.area];
  const perSqm = form.sizeSqm > 0 ? form.price / form.sizeSqm : 0;
  /** Clear a field's publish error the moment the user edits it. */
  const clearFieldError = (key: string) =>
    setErrors((e) => {
      if (!(key in e)) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  const bandMatch = insight
    ? (() => {
        const m = insight.avgPricePerSqm.match(/([\d.]+)\s*k\s*[–-]\s*([\d.]+)\s*k/i);
        if (!m || form.type === 'land') return null;
        const low = parseFloat(m[1]) * 1000;
        const high = parseFloat(m[2]) * 1000;
        if (perSqm > high * 1.25) return { tone: 'warn', text: `Your ask (${formatKES(Math.round(perSqm))}/m²) sits well above the ${form.area} band (${insight.avgPricePerSqm}/m²) — buyers will screen it as over-priced.` };
        if (perSqm < low * 0.7) return { tone: 'warn', text: `Your ask (${formatKES(Math.round(perSqm))}/m²) is far below the ${form.area} band (${insight.avgPricePerSqm}/m²) — suspiciously cheap attracts fraud screens.` };
        return { tone: 'ok', text: `Your ask sits inside the ${form.area} band (${insight.avgPricePerSqm}/m²) — passes the pricing screen.` };
      })()
    : null;

  /** Publish — reads the signed-in account from this render's closure.
   *  Always invoked either directly (signed in) or through publishRef after
   *  a requireAuth intent completed (the ref then points at a fresh closure
   *  with the newly signed-in account). */
  const publish = () => {
    const poster = user;
    if (!poster) return;
    // The publish boundary (wave 10): nothing enters the marketplace or the
    // submissions queue without passing the schema — an emptied numeric
    // field is NaN or 0, an empty title is not a listing.
    const check = validateListingForm(form);
    if (!check.ok) {
      setErrors(check.errors);
      const firstStep = Math.min(
        ...Object.keys(check.errors).map((k) => FIELD_STEP[k] ?? 0),
      );
      setStep(firstStep);
      toast({
        title: 'A few fields need attention',
        description: 'Fix the highlighted fields, then submit again.',
        variant: 'destructive',
      });
      return;
    }
    setErrors({});
    const v = check.value;
    const id = newId("UL").toUpperCase().replace("_", "-");
    const submission = {
      id,
      submitterName: poster.name || 'Platform user',
        submitterEmail: poster.email,
        submitterPhone: v.phone || poster.phone,
        agency: poster.company || 'Direct owner / agent',
        ownerEmail: poster.email,
        ownerName: poster.name,
        title: v.title,
        type: v.type,
        purpose: v.purpose as never,
        area: v.area,
        county: form.county,
        price: v.price,
        rentEstimate: v.rentEstimate,
        bedrooms: v.bedrooms,
        bathrooms: form.bathrooms,
        sizeSqm: v.sizeSqm,
        amenities: [],
        images: [],
        description: v.description,
      status: 'pending' as const,
      source: 'wizard' as const,
      flags: [],
      completeness: Math.min(100, 40 + Math.min(v.description.length / 3, 30) + (v.rentEstimate ? 10 : 0) + 20),
      createdAt: new Date().toISOString(),
    };
    setSubmissions([submission, ...submissions]);
    // auto-publish for demo velocity (trial platform), flagged for review
    setUserListings((prev) => [...prev, submissionToListing(submission)]);
    toast({
      title: 'Listing published',
      description: `Posted as ${poster.name} (${poster.email}) — the verification desk screens it next. Find it under My listings in your account.`,
    });
    navigate(`/properties/${id}`);
    void all;
  };

  // latest publish closure, so a requireAuth intent that fires after
  // sign-in + registration still sees the fresh account state
  const publishRef = useRef(publish);
  useEffect(() => {
    publishRef.current = publish;
  });

  const onSubmit = () => {
    if (!user) {
      // sign in (or register) first — the fresh publish closure runs after
      requireAuth('Publishing a property to the Keja marketplace', () => publishRef.current());
      return;
    }
    publish();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="max-w-xl">
        <Badge variant="outline" className="border-primary/40 font-bold text-primary">Keja Home · List a property</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">List with trust on your side</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Four steps, honest screens, live feedback — verified listings rank higher, sell faster
          and inherit the Trust Score.
        </p>
      </div>

      {/* posting-as chip — attribution is always an account */}
      {user ? (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border bg-card p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-xs font-black text-primary-foreground">
            {isPictureUrl(user.picture) ? (
              <img src={user.picture} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
            ) : (
              <span aria-hidden>{initials(user.name)}</span>
            )}
          </div>
          <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
            <span className="font-bold text-foreground">Posting as {user.name}</span> · {user.email}
            {user.accountType === 'developer' || user.accountType === 'landlord' || user.accountType === 'agent'
              ? ` · ${user.accountType === 'agent' ? 'agent' : user.accountType} account`
              : ''}
            <br />
            <span className="text-[11px]">Your listing is attributed to this account and appears under My listings in your account page.</span>
          </p>
          <UserRoundCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-gold/40 bg-gold-soft p-3 text-xs leading-relaxed text-gold-foreground">
          <span className="font-bold">You&rsquo;ll publish under your Google account.</span>{' '}
          When you submit, Keja asks you to sign in (one tap — or register if you&rsquo;re new) so the
          listing is attributed to you and appears in My listings.
        </div>
      )}

      {/* stepper */}
      <div className="mt-7 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => i < step && setStep(i)}
            className={cn(
              'flex flex-1 flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors',
              i === step ? 'border-primary bg-primary/5' : i < step ? 'border-primary/30' : 'border-border',
            )}
            aria-current={i === step ? 'step' : undefined}
          >
            <span className={cn('text-[10px] font-black uppercase tracking-wider', i <= step ? 'text-primary' : 'text-muted-foreground')}>
              Step {i + 1}
            </span>
            <span className={cn('text-xs font-bold', i <= step ? '' : 'text-muted-foreground')}>{s}</span>
            {i < step && <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />}
          </button>
        ))}
      </div>
      <Progress value={((step + 1) / STEPS.length) * 100} className="mt-3 h-1.5" aria-label="Wizard progress" />

      <div className="mt-6 rounded-3xl border bg-card p-5 sm:p-6">
        {step === 0 && (
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="lp-title">Listing title</Label>
              <Input
                id="lp-title"
                value={form.title}
                maxLength={120}
                onChange={(e) => {
                  setForm({ ...form, title: e.target.value });
                  clearFieldError('title');
                }}
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? 'lp-title-err' : undefined}
                placeholder="e.g. Sunlit 3BR with garden, Kileleshwa"
              />
              {errors.title && (
                <p id="lp-title-err" role="alert" className="text-xs font-medium text-destructive">{errors.title}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="lp-type">Property type</Label>
                <select id="lp-type" className="h-9 rounded-lg border bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {['apartment', 'villa', 'townhouse', 'bungalow', 'land', 'commercial'].map((t) => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="lp-area">Area</Label>
                <select id="lp-area" className="h-9 rounded-lg border bg-background px-3 text-sm" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>
                  {AREAS.map((a) => (<option key={a}>{a}</option>))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="lp-beds">Bedrooms</Label>
                <Input id="lp-beds" type="number" min={0} value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: Number(e.target.value) })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="lp-size">Size (m²)</Label>
                <Input
                  id="lp-size"
                  type="number"
                  min={1}
                  value={form.sizeSqm}
                  onChange={(e) => {
                    setForm({ ...form, sizeSqm: Number(e.target.value) });
                    clearFieldError('sizeSqm');
                  }}
                  aria-invalid={!!errors.sizeSqm}
                  aria-describedby={errors.sizeSqm ? 'lp-size-err' : undefined}
                />
                {errors.sizeSqm && (
                  <p id="lp-size-err" role="alert" className="text-xs font-medium text-destructive">{errors.sizeSqm}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="lp-price">Asking price (KES)</Label>
                <Input
                  id="lp-price"
                  type="number"
                  step={100_000}
                  value={form.price || ''}
                  onChange={(e) => {
                    setForm({ ...form, price: Number(e.target.value) });
                    clearFieldError('price');
                  }}
                  aria-invalid={!!errors.price}
                  aria-describedby={errors.price ? 'lp-price-err' : undefined}
                />
                {errors.price && (
                  <p id="lp-price-err" role="alert" className="text-xs font-medium text-destructive">{errors.price}</p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="lp-rent">Rent estimate (KES/mo)</Label>
                <Input
                  id="lp-rent"
                  type="number"
                  step={5_000}
                  value={form.rentEstimate || ''}
                  onChange={(e) => {
                    setForm({ ...form, rentEstimate: Number(e.target.value) });
                    clearFieldError('rentEstimate');
                  }}
                  aria-invalid={!!errors.rentEstimate}
                  aria-describedby={errors.rentEstimate ? 'lp-rent-err' : undefined}
                />
                {errors.rentEstimate && (
                  <p id="lp-rent-err" role="alert" className="text-xs font-medium text-destructive">{errors.rentEstimate}</p>
                )}
              </div>
            </div>
            <div>
              <Label>Purpose</Label>
              <div className="mt-1.5 flex gap-1.5">
                {['buy', 'rent', 'invest'].map((pp) => (
                  <button
                    key={pp}
                    onClick={() => {
                      setForm({
                        ...form,
                        purpose: form.purpose.includes(pp)
                          ? form.purpose.filter((x) => x !== pp)
                          : [...form.purpose, pp],
                      });
                      clearFieldError('purpose');
                    }}
                    aria-pressed={form.purpose.includes(pp)}
                    className={cn(
                      'rounded-full border px-4 py-1.5 text-xs font-bold capitalize transition-colors',
                      form.purpose.includes(pp) ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/50',
                    )}
                  >
                    {pp}
                  </button>
                ))}
              </div>
              {errors.purpose && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">{errors.purpose}</p>
              )}
            </div>
            {bandMatch && (
              <div className={cn('flex items-start gap-2.5 rounded-xl border p-3.5 text-xs leading-relaxed', bandMatch.tone === 'ok' ? 'border-primary/40 bg-primary/5' : 'border-gold/50 bg-gold-soft')}>
                {bandMatch.tone === 'ok'
                  ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  : <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />}
                <span>{bandMatch.text}</span>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="lp-desc">Description</Label>
              <Textarea
                id="lp-desc"
                rows={5}
                maxLength={5000}
                value={form.description}
                onChange={(e) => {
                  setForm({ ...form, description: e.target.value });
                  clearFieldError('description');
                }}
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? 'lp-desc-err' : undefined}
                placeholder="What makes this property worth a viewing? Be specific and honest — overstated listings fail screens."
              />
              {errors.description && (
                <p id="lp-desc-err" role="alert" className="text-xs font-medium text-destructive">{errors.description}</p>
              )}
              <p className="text-[10px] text-muted-foreground">{form.description.length} characters · 120+ earns the completeness signal</p>
            </div>
            <div className="rounded-2xl border-2 border-dashed p-6 text-center">
              <CloudUpload className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden />
              <p className="mt-2 text-sm font-bold">Photos</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Trial build: photo upload lands with the live backend. Two or more unique photos
                strengthen the listing&rsquo;s trust signals.
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="lp-name">Contact name</Label>
                <Input id="lp-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="lp-phone">Phone</Label>
                <Input
                  id="lp-phone"
                  value={form.phone}
                  maxLength={25}
                  onChange={(e) => {
                    setForm({ ...form, phone: e.target.value });
                    clearFieldError('phone');
                  }}
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? 'lp-phone-err' : undefined}
                  placeholder="+254…"
                />
                {errors.phone && (
                  <p id="lp-phone-err" role="alert" className="text-xs font-medium text-destructive">{errors.phone}</p>
                )}
              </div>
              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor="lp-email">Email</Label>
                <Input id="lp-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="rounded-2xl bg-accent/50 p-4 text-sm">
              <p className="font-black">{form.title || 'Untitled listing'}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {form.area} · {form.bedrooms} bed · {form.sizeSqm} m² · {formatKES(form.price)}
                {form.rentEstimate ? ` · ~${formatKES(form.rentEstimate)}/mo` : ''}
              </p>
            </div>
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              By submitting you confirm the information is accurate and you have the right to market
              this property. The verification desk screens every submission.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button variant="outline" className="font-bold" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
          {step < STEPS.length - 1 ? (
            <Button
              className="font-bold"
              disabled={step === 0 ? !form.title : step === 1 ? !form.price : step === 2 ? form.description.length < 40 : false}
              onClick={() => setStep(step + 1)}
            >
              Continue
            </Button>
          ) : (
            <Button className="font-black" onClick={onSubmit}>
              <ListPlus className="mr-1.5 h-4 w-4" aria-hidden /> Submit listing
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border bg-card p-4">
        <Home className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Why list on Keja? Verified listings carry the Trust Score and Property Passport, reach
          investors with the Investment Score attached, and flow into financing and diaspora
          channels a plain listing site cannot offer.
        </p>
      </div>
    </div>
  );
}
