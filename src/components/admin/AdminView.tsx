'use client';
/** Admin console — verification queue, partner applications, listing reports, audit trail, settings. */
import { useMemo, useState } from 'react';
import { CheckCircle2, FileSearch, Gavel, Plug, Settings2, ShieldAlert, Users, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSubmissions, usePartners, useFeeds, useSettings, useAuditLog, useListingReports, setReportStatus, type ListingSubmission } from '@/lib/adminStore';
import { formatKES } from '@/lib/format';
import { navigate } from '@/lib/router';
import { cn } from '@/lib/utils';

const SUBMISSION_STATUS = {
  pending: 'bg-gold/15 text-gold-foreground',
  approved: 'bg-primary/10 text-primary',
  rejected: 'bg-destructive/10 text-destructive',
} as const;

export default function AdminView() {
  const [submissions, setSubmissions] = useSubmissions();
  const [partners, setPartners] = usePartners();
  const [feeds] = useFeeds();
  const [settings, setSettings] = useSettings();
  const [audit] = useAuditLog();
  const [reports] = useListingReports();

  const decide = (s: ListingSubmission, decision: 'approved' | 'rejected') => {
    setSubmissions(submissions.map((x) => (x.id === s.id ? { ...x, status: decision } : x)));
  };
  const pending = submissions.filter((s) => s.status === 'pending');

  const statCards = useMemo(
    () => [
      { label: 'Pending verifications', value: pending.length, icon: FileSearch },
      { label: 'Partner applications', value: partners.filter((p) => p.status === 'pending').length, icon: Users },
      { label: 'Listing reports', value: reports.filter((r) => r.status === 'open').length, icon: ShieldAlert },
      { label: 'Healthy feeds', value: feeds.filter((f) => f.status === 'healthy').length, icon: Plug },
    ],
    [pending, partners, reports, feeds],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge variant="outline" className="border-destructive/40 font-bold text-destructive">Admin console · trial</Badge>
          <h1 className="mt-2.5 text-3xl font-black tracking-tight">The verification desk</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Machines screen; humans adjudicate. Every decision lands in the audit trail.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((m) => (
          <div key={m.label} className="card-lift rounded-2xl border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{m.label}</p>
              <m.icon className="h-4 w-4 text-gold" aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-black tabular-nums">{m.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="queue" className="mt-7">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="queue" className="gap-1.5 font-bold"><FileSearch className="h-4 w-4" aria-hidden /> Verification queue</TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5 font-bold"><ShieldAlert className="h-4 w-4" aria-hidden /> Listing reports</TabsTrigger>
          <TabsTrigger value="partners" className="gap-1.5 font-bold"><Users className="h-4 w-4" aria-hidden /> Partners</TabsTrigger>
          <TabsTrigger value="feeds" className="gap-1.5 font-bold"><Plug className="h-4 w-4" aria-hidden /> Feeds</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 font-bold"><Gavel className="h-4 w-4" aria-hidden /> Audit trail</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 font-bold"><Settings2 className="h-4 w-4" aria-hidden /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-6 space-y-3">
          {submissions.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  {s.area}, {s.county} · {s.type} · {formatKES(s.price)} · by {s.submitterName}
                </p>
              </div>
              <Badge variant="outline" className={cn('text-[10px] font-bold capitalize', SUBMISSION_STATUS[s.status])}>{s.status}</Badge>
              {s.status === 'pending' && (
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-8 text-xs font-bold" onClick={() => decide(s, 'approved')}>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs font-bold text-destructive" onClick={() => decide(s, 'rejected')}>
                    <XCircle className="mr-1 h-3.5 w-3.5" aria-hidden /> Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="reports" className="mt-6 space-y-3">
          {reports.length === 0 && (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No open reports — users can flag issues from any listing&rsquo;s evidence panel.
            </p>
          )}
          {reports.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{r.propertyTitle}</p>
                <p className="text-xs text-muted-foreground">{r.reason} · {r.detail || 'no detail'} · {new Date(r.createdAt).toLocaleDateString('en-KE')}</p>
              </div>
              <Badge variant="outline" className={cn('text-[10px] font-bold capitalize', r.status === 'open' ? 'border-gold/50 text-gold-foreground' : 'border-border text-muted-foreground')}>{r.status}</Badge>
              {r.status === 'open' && (
                <Button size="sm" variant="outline" className="h-8 text-xs font-bold" onClick={() => setReportStatus(r.id, 'resolved')}>
                  Mark resolved
                </Button>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="partners" className="mt-6 space-y-3">
          {partners.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{p.orgName}</p>
                <p className="text-xs text-muted-foreground">{p.contactName} · {p.email} · {p.type} · {p.listingsCount} listings</p>
              </div>
              <Badge variant="outline" className={cn('text-[10px] font-bold capitalize', p.status === 'pending' ? 'border-gold/50 text-gold-foreground' : 'border-primary/40 text-primary')}>{p.status}</Badge>
              {p.status === 'pending' && (
                <Button
                  size="sm"
                  className="h-8 text-xs font-bold"
                  onClick={() => setPartners(partners.map((x) => (x.id === p.id ? { ...x, status: 'approved' } : x)))}
                >
                  Approve
                </Button>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="feeds" className="mt-6">
          <div className="overflow-hidden rounded-3xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-accent/40 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">Feed</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Last run</th>
                </tr>
              </thead>
              <tbody>
                {feeds.map((f) => (
                  <tr key={f.id} className="border-b last:border-0">
                    <td className="px-5 py-3.5 font-bold">{f.name}</td>
                    <td className="px-4 py-3.5 uppercase">{f.type}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant="secondary" className="text-[10px] font-bold capitalize">{f.status}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs text-muted-foreground tabular-nums">{f.listingsImported} / {f.duplicatesBlocked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            The Auto-Pilot pipeline (scanner → enrich → dedupe → quality gate → publish) runs on a
            6-hour cron in the live product — this console shows feed health.
          </p>
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <div className="max-h-[28rem] space-y-1.5 overflow-y-auto slim-scroll rounded-3xl border bg-card p-4">
            {[...audit].reverse().map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-accent/40 px-3 py-2 text-[11px]">
                <span className="font-bold">{a.action} <span className="font-normal text-muted-foreground">— {a.target}</span></span>
                <span className="text-muted-foreground">{a.actor} · {new Date(a.ts).toLocaleString('en-KE')}</span>
              </div>
            ))}
            {audit.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No audit entries yet — decisions will appear here.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(settings).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between rounded-2xl border bg-card p-4">
                <div>
                  <p className="text-sm font-bold capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="text-xs text-muted-foreground">{v ? 'Enabled' : 'Disabled'}</p>
                </div>
                <Button
                  size="sm"
                  variant={v ? 'default' : 'outline'}
                  className="h-8 text-xs font-bold"
                  onClick={() => setSettings({ ...settings, [k]: !v })}
                >
                  {v ? 'On' : 'Off'}
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
