'use client';
/** Tenant hub — lease, maintenance requests, moving checklist (tenant side of Keja Manage). */
import { useState } from 'react';
import { CalendarDays, CheckCircle2, ClipboardCheck, DoorOpen, Home, Plus, Send, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenantStore, MOVING_CHECKLIST, REQUEST_CATEGORIES, PREFERRED_TIMES } from '@/lib/tenantStore';

const CATEGORY_LABELS: Record<string, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  appliance: 'Appliance',
  security: 'Security',
  other: 'Other',
};
import { formatKES } from '@/lib/format';
import { navigate } from '@/lib/router';
import { cn } from '@/lib/utils';

const REQ_STATUS = {
  submitted: 'border-gold/50 text-gold-foreground',
  acknowledged: 'border-primary/40 text-primary',
  scheduled: 'border-primary text-primary',
} as const;

export default function TenantHubView() {
  const { data, addRequest, advanceRequest, toggleChecklistItem, resetDemo } = useTenantStore();
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [category, setCategory] = useState<string>(REQUEST_CATEGORIES[0]);
  const [when, setWhen] = useState(PREFERRED_TIMES[0]);

  const checklistDone = Object.values(data.checklist).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="max-w-2xl">
        <Badge variant="outline" className="border-primary/40 font-bold text-primary">Keja Manage · Tenant Hub</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Your home, self-served</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          The tenant side of the platform: your lease on record, maintenance one tap away, and a
          moving checklist that actually helps. (Demo data on the trial platform.)
        </p>
      </div>

      <Tabs defaultValue="home" className="mt-8">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="home" className="gap-1.5 font-bold"><Home className="h-4 w-4" aria-hidden /> My home</TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-1.5 font-bold"><Wrench className="h-4 w-4" aria-hidden /> Maintenance</TabsTrigger>
          <TabsTrigger value="moving" className="gap-1.5 font-bold"><ClipboardCheck className="h-4 w-4" aria-hidden /> Moving checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="mt-6 space-y-5">
          {data.lease ? (
            <div className="rounded-3xl border bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-lg font-black tracking-tight">
                  <DoorOpen className="h-5 w-5 text-gold" aria-hidden /> {data.lease.propertyTitle}
                </h2>
                <Badge variant="secondary" className="font-bold">Active lease</Badge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  ['Monthly rent', formatKES(data.lease.monthlyRentKes)],
                  ['Deposit held', formatKES(data.lease.depositKes)],
                  ['Lease ends', new Date(data.lease.end).toLocaleDateString('en-KE', { dateStyle: 'medium' })],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-accent/50 p-3.5">
                    <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{k}</p>
                    <p className="mt-0.5 text-sm font-black">{v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border p-3.5 text-xs text-muted-foreground">
                <CalendarDays className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                Landlord: {data.lease.landlordName}. Rent due monthly from day {new Date(data.lease.start).getDate()} — M-Pesa Paybill on the live product, receipts land here automatically.
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed bg-card/60 p-8 text-center">
              <p className="text-sm font-bold">No lease on record</p>
              <p className="mt-1 text-sm text-muted-foreground">Find a verified home first — trust-scored, fairly priced.</p>
              <Button className="mt-4 font-bold" onClick={() => navigate('/properties')}>Browse rentals</Button>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['Affordability check', 'Rent within 33% of income', '/finance'],
              ['Saved homes', 'Your favorites list', '/properties'],
              ['Ask Keja AI', 'Questions about your tenancy', '/ask'],
            ].map(([t, d, to]) => (
              <button key={t} onClick={() => navigate(to)} className="card-lift rounded-2xl border bg-card p-4 text-left">
                <p className="text-sm font-bold">{t}</p>
                <p className="mt-1 text-xs text-muted-foreground">{d}</p>
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6 space-y-5">
          <div className="rounded-3xl border bg-card p-5 sm:p-6">
            <h2 className="text-sm font-black uppercase tracking-wider">Log a maintenance request</h2>
            <div className="mt-4 grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="mr-title">What&rsquo;s the issue?</Label>
                <Input id="mr-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bathroom mixer tap dripping" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="mr-detail">Details (helps the fixer prep)</Label>
                <Textarea id="mr-detail" rows={2} value={detail} onChange={(e) => setDetail(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="mr-cat">Category</Label>
                  <select id="mr-cat" className="h-9 rounded-lg border bg-background px-3 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {REQUEST_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="mr-when">Preferred time</Label>
                  <select id="mr-when" className="h-9 rounded-lg border bg-background px-3 text-sm" value={when} onChange={(e) => setWhen(e.target.value)}>
                    {PREFERRED_TIMES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                className="font-bold"
                disabled={!title.trim()}
                onClick={() => {
                  addRequest({ title, detail, category: category as 'plumbing' | 'electrical' | 'appliance' | 'security' | 'other', preferredTime: when });
                  setTitle('');
                  setDetail('');
                }}
              >
                <Send className="mr-1.5 h-4 w-4" aria-hidden /> Submit request
              </Button>
            </div>
          </div>
          <div className="space-y-2.5">
            {data.requests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[r.category]} · {r.detail} · {r.preferredTime}</p>
                </div>
                <Badge variant="outline" className={cn('text-[10px] font-bold capitalize', REQ_STATUS[r.status])}>{r.status}</Badge>
                {r.status === 'submitted' && (
                  <Button size="sm" variant="outline" className="h-8 text-xs font-bold" onClick={() => advanceRequest(r.id)}>
                    Simulate landlord ack
                  </Button>
                )}
                {r.status === 'acknowledged' && (
                  <Button size="sm" className="h-8 text-xs font-bold" onClick={() => advanceRequest(r.id)}>
                    <Plus className="mr-1 h-3 w-3" aria-hidden /> Schedule
                  </Button>
                )}
              </div>
            ))}
            {data.requests.length === 0 && (
              <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No requests yet — everything working as it should.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="moving" className="mt-6">
          <div className="rounded-3xl border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider">Moving-in checklist</h2>
              <span className="text-xs font-black tabular-nums text-primary">{checklistDone}/{MOVING_CHECKLIST.length}</span>
            </div>
            <Progress value={(checklistDone / MOVING_CHECKLIST.length) * 100} className="mt-2 h-2" aria-label="Checklist progress" />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {MOVING_CHECKLIST.map((item) => {
                const done = !!data.checklist[item.id];
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors',
                      done ? 'border-primary/40 bg-primary/5' : 'hover:border-primary/30',
                    )}
                    aria-pressed={done}
                  >
                    <CheckCircle2 className={cn('mt-0.5 h-5 w-5 shrink-0', done ? 'text-primary' : 'text-muted-foreground/40')} aria-hidden />
                    <div>
                      <p className={cn('text-sm font-bold', done && 'text-primary')}>{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <Button variant="ghost" size="sm" className="mt-4 text-xs font-bold" onClick={resetDemo}>
              Reset demo data
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
