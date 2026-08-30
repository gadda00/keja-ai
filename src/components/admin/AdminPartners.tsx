/**
 * Admin Partners & Feeds — the global supply engine: partner applications
 * (agencies, developers, portals, diaspora agents) and automated listing
 * feed connections (API, CSV, portal syndication, WhatsApp bot).
 */
import {
  AlertTriangle,
  Check,
  Database,
  FileSpreadsheet,
  Globe2,
  Handshake,
  Link2,
  MessageCircle,
  PauseCircle,
  Plus,
  RefreshCw,
  Webhook,
  X,
} from 'lucide-react';
import { useState } from 'react';

import type { FeedConnection, PartnerApplication } from '@/lib/adminStore';
import { logAudit, useFeeds, usePartners } from '@/lib/adminStore';
import { useAuth } from '@/lib/auth';

const TYPE_META: Record<string, { label: string; tone: string }> = {
  agency: { label: 'Agency', tone: 'bg-gold-100 text-gold-800' },
  developer: { label: 'Developer', tone: 'bg-ink text-gold-200' },
  landlord: { label: 'Landlord', tone: 'bg-green-100 text-green-800' },
  portal: { label: 'Portal', tone: 'bg-sky-100 text-sky-800' },
  'data-partner': { label: 'Data partner', tone: 'bg-purple-100 text-purple-800' },
  'diaspora-agent': { label: 'Diaspora agent', tone: 'bg-amber-100 text-amber-800' },
};

const FEED_ICON: Record<string, typeof Globe2> = {
  api: Webhook,
  csv: FileSpreadsheet,
  'portal-syndication': Globe2,
  whatsapp: MessageCircle,
  manual: Database,
};

const STATUS_TONE: Record<string, string> = {
  healthy: 'bg-green-100 text-green-800 ring-green-200',
  degraded: 'bg-amber-100 text-amber-800 ring-amber-200',
  paused: 'bg-ink/10 text-ink-muted ring-ink/10',
  error: 'bg-red-100 text-red-700 ring-red-200',
};

export default function AdminPartners() {
  const { user } = useAuth();
  const [partners, setPartners] = usePartners();
  const [feeds, setFeeds] = useFeeds();
  const [syncing, setSyncing] = useState<string | null>(null);
  const [addFeed, setAddFeed] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'api', url: '', market: 'Nairobi' });

  const decide = (p: PartnerApplication, status: 'approved' | 'rejected') => {
    setPartners(partners.map((x) => (x.id === p.id ? { ...x, status } : x)));
    logAudit({
      actor: user?.name ?? 'admin',
      actorEmail: user?.email ?? '',
      action: `partner.${status}`,
      target: p.orgName,
      detail: `${p.orgName} (${p.type}, ${p.market}) ${status} — ${p.listingsCount} listings offered`,
      severity: status === 'rejected' ? 'warning' : 'info',
    });
  };

  const runSync = (f: FeedConnection) => {
    setSyncing(f.id);
    setTimeout(() => {
      const imported = Math.floor(Math.random() * 5);
      const dupes = Math.floor(Math.random() * 3);
      setFeeds(
        feeds.map((x) =>
          x.id === f.id
            ? {
                ...x,
                lastSync: new Date().toISOString(),
                listingsImported: x.listingsImported + imported,
                duplicatesBlocked: x.duplicatesBlocked + dupes,
                status:
                  x.status === 'paused' ? 'paused' : x.status === 'degraded' ? 'healthy' : x.status,
              }
            : x
        )
      );
      setSyncing(null);
      logAudit({
        actor: user?.name ?? 'admin',
        actorEmail: user?.email ?? '',
        action: 'feed.sync',
        target: f.name,
        detail: `Manual sync: ${imported} listings imported, ${dupes} duplicates blocked`,
        severity: 'info',
      });
    }, 1200);
  };

  const togglePause = (f: FeedConnection) => {
    const next = f.status === 'paused' ? 'healthy' : 'paused';
    setFeeds(feeds.map((x) => (x.id === f.id ? { ...x, status: next } : x)));
    logAudit({
      actor: user?.name ?? 'admin',
      actorEmail: user?.email ?? '',
      action: 'feed.toggle',
      target: f.name,
      detail: `${f.name} → ${next}`,
      severity: 'warning',
    });
  };

  const createFeed = () => {
    if (!form.name.trim()) return;
    const feed: FeedConnection = {
      id: `feed-${Date.now().toString().slice(-5)}`,
      name: form.name,
      type: form.type as FeedConnection['type'],
      url: form.url || undefined,
      market: form.market,
      intervalHours: 6,
      lastSync: new Date().toISOString(),
      status: 'healthy',
      listingsImported: 0,
      duplicatesBlocked: 0,
    };
    setFeeds([feed, ...feeds]);
    setForm({ name: '', type: 'api', url: '', market: 'Nairobi' });
    setAddFeed(false);
    logAudit({
      actor: user?.name ?? 'admin',
      actorEmail: user?.email ?? '',
      action: 'feed.create',
      target: feed.name,
      detail: `New ${feed.type} feed connected for ${feed.market}`,
      severity: 'info',
    });
  };

  const pending = partners.filter((p) => p.status === 'pending');

  return (
    <div className="flex flex-col gap-8">
      {/* partner applications */}
      <section>
        <div className="flex items-center justify-between">
          <h3 className="heading-display flex items-center gap-2 text-lg">
            <Handshake className="h-5 w-5 text-gold-600" /> Partner applications{' '}
            <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-bold text-gold-800">
              {pending.length} pending
            </span>
          </h3>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {partners.map((p) => (
            <div key={p.id} className="card-luxe p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-display text-base font-bold text-ink">{p.orgName}</h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        TYPE_META[p.type]?.tone ?? 'bg-ink/10 text-ink-muted'
                      }`}
                    >
                      {TYPE_META[p.type]?.label ?? p.type}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        p.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : p.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-sky-100 text-sky-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {p.contactName} · {p.email}
                    {p.phone ? ` · ${p.phone}` : ''}
                  </p>
                  <p className="mt-1 text-xs font-medium text-ink-soft">
                    Market: {p.market} · ~{p.listingsCount} listings
                  </p>
                  {p.message ? (
                    <p className="mt-2 rounded-lg bg-gold-50 px-3 py-2 text-[11px] leading-relaxed text-ink-muted ring-1 ring-gold-100">
                      “{p.message}”
                    </p>
                  ) : null}
                </div>
                {p.status === 'pending' && (
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button
                      onClick={() => decide(p, 'approved')}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700"
                    >
                      <Check className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => decide(p, 'rejected')}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* feed connections */}
      <section>
        <div className="flex items-center justify-between">
          <h3 className="heading-display flex items-center gap-2 text-lg">
            <Globe2 className="h-5 w-5 text-gold-600" /> Global feed connections
          </h3>
          <button onClick={() => setAddFeed(true)} className="btn-outline !px-4 !py-2 !text-xs">
            <Plus className="h-4 w-4" /> Connect feed
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {feeds.map((f) => {
            const Icon = FEED_ICON[f.type] ?? Globe2;
            return (
              <div key={f.id} className="card-luxe p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-50 ring-1 ring-gold-100">
                      <Icon className="h-5 w-5 text-gold-700" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate font-display text-sm font-bold text-ink">
                          {f.name}
                        </h4>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${STATUS_TONE[f.status]}`}
                        >
                          {f.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-ink-muted">
                        {f.market} · {f.type} · every{' '}
                        {f.intervalHours === 0 ? 'real-time' : `${f.intervalHours}h`}
                      </p>
                      {f.url ? (
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-gold-700">
                          <Link2 className="h-3 w-3 shrink-0" /> {f.url.replace(/^https?:\/\//, '')}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-gold-50/70 p-2 text-center ring-1 ring-gold-100">
                    <p className="font-display text-sm font-bold text-ink">{f.listingsImported}</p>
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-ink-faint">
                      Imported
                    </p>
                  </div>
                  <div className="rounded-lg bg-gold-50/70 p-2 text-center ring-1 ring-gold-100">
                    <p className="font-display text-sm font-bold text-ink">{f.duplicatesBlocked}</p>
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-ink-faint">
                      Dupes blocked
                    </p>
                  </div>
                  <div className="rounded-lg bg-gold-50/70 p-2 text-center ring-1 ring-gold-100">
                    <p className="font-display text-sm font-bold text-ink">
                      {new Date(f.lastSync).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-ink-faint">
                      Last sync
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => runSync(f)}
                    disabled={syncing === f.id || f.status === 'paused'}
                    className="btn-gold flex-1 !py-2 !text-xs"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${syncing === f.id ? 'animate-spin' : ''}`}
                    />
                    {syncing === f.id ? 'Syncing…' : 'Sync now'}
                  </button>
                  <button
                    onClick={() => togglePause(f)}
                    className="btn-outline !px-3 !py-2 !text-xs"
                    title={f.status === 'paused' ? 'Resume' : 'Pause'}
                  >
                    <PauseCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* acquisition playbook */}
      <section className="card-luxe bg-ink p-6 text-white">
        <p className="eyebrow !text-gold-300">Supply acquisition playbook</p>
        <h3 className="font-display mt-1 text-lg font-bold">
          How Keja wins inventory globally — the five-channel strategy
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              n: '01',
              t: 'Agent & agency partnerships',
              d: 'Free KEJA PRO tools (CRM, lead engine, analytics) in exchange for exclusive verified inventory — the supply-first flywheel.',
            },
            {
              n: '02',
              t: 'Developer direct deals',
              d: 'Off-plan and new-development inventory uploaded once, syndicated everywhere, with payment plans and completion tracking.',
            },
            {
              n: '03',
              t: 'Owner/landlord self-service',
              d: 'Free listings with guided wizard, WhatsApp capture and QR-code funnels — lowest-friction supply channel.',
            },
            {
              n: '04',
              t: 'Cross-portal syndication',
              d: 'ListGlobally-style network: import partner portals (diaspora corridors: UK, US, UAE) via XML/JSON feeds with dedupe.',
            },
            {
              n: '05',
              t: 'Data partnerships & APIs',
              d: 'Institutional feeds, MLS-equivalent data-sharing agreements and bank/insurer inventory integrations.',
            },
          ].map((c) => (
            <div key={c.n} className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
              <p className="font-display text-xl font-bold text-gold-400">{c.n}</p>
              <p className="mt-1 text-sm font-semibold">{c.t}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/60">{c.d}</p>
            </div>
          ))}
          <div className="rounded-xl bg-gold-gradient p-4">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <AlertTriangle className="h-4 w-4" /> Trust by design
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/85">
              Every channel runs through duplicate detection, price-anomaly screening and document
              completeness checks before inventory goes live.
            </p>
          </div>
        </div>
      </section>

      {/* add feed dialog */}
      {addFeed ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            role="button"
            tabIndex={0}
            aria-label="Close dialog"
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            onClick={() => setAddFeed(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setAddFeed(false);
              }
            }}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gold-200">
            <h3 className="heading-display text-lg">Connect a new feed</h3>
            <p className="mt-1 text-xs text-ink-muted">
              Keja ingests API, CSV, portal-syndication and WhatsApp sources with automatic dedupe.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <input
                className="input-luxe"
                placeholder="Feed name (e.g. Lagos Partner Portal)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <select
                className="input-luxe"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="api">API (JSON/REST)</option>
                <option value="csv">CSV drop</option>
                <option value="portal-syndication">Portal syndication (XML)</option>
                <option value="whatsapp">WhatsApp bot</option>
                <option value="manual">Manual upload</option>
              </select>
              <input
                className="input-luxe"
                placeholder="Feed URL (optional)"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
              <input
                className="input-luxe"
                placeholder="Market (e.g. Nairobi, Kigali, UK diaspora)"
                value={form.market}
                onChange={(e) => setForm({ ...form, market: e.target.value })}
              />
              <button onClick={createFeed} className="btn-gold w-full !py-2.5">
                Connect feed
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
