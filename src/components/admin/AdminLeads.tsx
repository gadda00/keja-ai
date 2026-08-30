/** Admin Leads — HOT/WARM/COLD pipeline CRM (blueprint Ch.9). */
import { Download } from 'lucide-react';
import { Flame, Mail, MessageCircle, Phone, Plus, Search, StickyNote, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { whatsappLink } from '@/config';
import { logAudit } from '@/lib/adminStore';
import { useAuth } from '@/lib/auth';
import { exportCSV } from '@/lib/csv';
import { marketInventory } from '@/lib/inventory';
import type { Lead } from '@/lib/store';
import { KEYS, useStore } from '@/lib/store';

const TONE = {
  HOT: { chip: 'bg-red-500 text-white', bar: 'bg-red-500', ring: 'ring-red-200' },
  WARM: { chip: 'bg-amber-500 text-white', bar: 'bg-amber-500', ring: 'ring-amber-200' },
  COLD: { chip: 'bg-sky-500 text-white', bar: 'bg-sky-500', ring: 'ring-sky-200' },
} as const;

export default function AdminLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useStore<Lead[]>(KEYS.leads, []);
  const [tab, setTab] = useState<'all' | Lead['temperature']>('all');
  const [query, setQuery] = useState('');
  const [newLead, setNewLead] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', interest: '', budget: '' });

  const filtered = useMemo(
    () =>
      leads.filter((l) => {
        const q = query.trim().toLowerCase();
        const matchQ =
          !q ||
          l.name.toLowerCase().includes(q) ||
          (l.email ?? '').toLowerCase().includes(q) ||
          l.interest.toLowerCase().includes(q);
        const matchTab = tab === 'all' || l.temperature === tab;
        return matchQ && matchTab;
      }),
    [leads, query, tab]
  );

  const setTemperature = (lead: Lead, temperature: Lead['temperature']) => {
    setLeads(leads.map((l) => (l.id === lead.id ? { ...l, temperature } : l)));
    logAudit({
      actor: user?.name ?? 'admin',
      actorEmail: user?.email ?? '',
      action: 'crm.lead.temperature',
      target: lead.name,
      detail: `${lead.name} → ${temperature}`,
      severity: 'info',
    });
  };

  const remove = (lead: Lead) => {
    setLeads(leads.filter((l) => l.id !== lead.id));
    logAudit({
      actor: user?.name ?? 'admin',
      actorEmail: user?.email ?? '',
      action: 'crm.lead.delete',
      target: lead.name,
      detail: `Removed lead ${lead.name}`,
      severity: 'warning',
    });
  };

  const addLead = () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    const lead: Lead = {
      id: `lead-${Date.now()}`,
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
      interest: form.interest || 'General enquiry',
      budget: form.budget || undefined,
      temperature: 'COLD',
      source: 'manual',
      createdAt: new Date().toISOString(),
    };
    setLeads([lead, ...leads]);
    setForm({ name: '', phone: '', email: '', interest: '', budget: '' });
    setNewLead(false);
    logAudit({
      actor: user?.name ?? 'admin',
      actorEmail: user?.email ?? '',
      action: 'crm.lead.create',
      target: lead.name,
      detail: `Manual lead added: ${lead.name}`,
      severity: 'info',
    });
  };

  const stats = {
    HOT: leads.filter((l) => l.temperature === 'HOT').length,
    WARM: leads.filter((l) => l.temperature === 'WARM').length,
    COLD: leads.filter((l) => l.temperature === 'COLD').length,
  };

  return (
    <div className="flex flex-col gap-5">
      {/* header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setTab('all')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              tab === 'all'
                ? 'bg-gold-gradient text-white shadow-gold-sm'
                : 'bg-gold-50 text-gold-700 ring-1 ring-gold-100 hover:bg-gold-100'
            }`}
          >
            All ({leads.length})
          </button>
          {(['HOT', 'WARM', 'COLD'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold tracking-wide transition ${
                tab === t
                  ? `${TONE[t].chip} shadow-sm`
                  : 'bg-gold-50 text-gold-700 ring-1 ring-gold-100 hover:bg-gold-100'
              }`}
            >
              {t} ({stats[t]})
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              className="input-luxe !w-56 !pl-10"
              placeholder="Search leads…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() =>
              exportCSV(
                `keja-leads-${new Date().toISOString().slice(0, 10)}.csv`,
                [
                  'Name',
                  'Phone',
                  'Email',
                  'Interest',
                  'Budget',
                  'Timeline',
                  'Temperature',
                  'Source',
                  'Property',
                  'Created',
                ],
                filtered.map((l) => [
                  l.name,
                  l.phone,
                  l.email ?? '',
                  l.interest,
                  l.budget ?? '',
                  l.timeline ?? '',
                  l.temperature,
                  l.source,
                  l.propertyId ?? '',
                  l.createdAt,
                ])
              )
            }
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2.5 text-xs font-semibold text-gold-300 hover:bg-ink-soft"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button onClick={() => setNewLead(true)} className="btn-gold !px-4 !py-2.5 !text-xs">
            <Plus className="h-4 w-4" /> Add lead
          </button>
        </div>
      </div>

      {/* lead cards */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {filtered.map((l) => {
          const prop = l.propertyId
            ? marketInventory().find((p) => p.id === l.propertyId)
            : undefined;
          return (
            <div
              key={l.id}
              className={`card-luxe relative overflow-hidden p-5 ring-1 ${
                l.temperature === 'HOT' ? TONE.HOT.ring : ''
              }`}
            >
              <span
                className={`absolute inset-y-0 left-0 w-1.5 ${TONE[l.temperature].bar}`}
                aria-hidden="true"
              />
              <div className="flex items-start justify-between gap-3 pl-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold text-ink">{l.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${TONE[l.temperature].chip}`}
                    >
                      {l.temperature}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {l.interest} {l.budget ? `· Budget ${l.budget}` : ''}
                  </p>
                  {prop ? (
                    <a
                      href={`/properties/${prop.id}`}
                      className="mt-1 inline-block text-[11px] font-semibold text-gold-700 hover:underline"
                    >
                      {prop.title.slice(0, 42)}… →
                    </a>
                  ) : null}
                  <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-faint">
                    <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                    {l.note ?? 'No notes yet.'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <div className="flex gap-1.5">
                    <a
                      href={whatsappLink(
                        `Hello ${l.name.split(' ')[0]}, this is Keja.ai following up on: ${l.interest}`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      title="WhatsApp follow-up"
                      className="rounded-lg bg-green-50 p-2 text-green-700 ring-1 ring-green-100 transition hover:bg-green-100"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                    <a
                      href={`tel:${l.phone.replace(/\s/g, '')}`}
                      title="Call"
                      className="rounded-lg bg-gold-50 p-2 text-gold-700 ring-1 ring-gold-100 transition hover:bg-gold-100"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                    {l.email ? (
                      <a
                        href={`mailto:${l.email}`}
                        title="Email"
                        className="rounded-lg bg-gold-50 p-2 text-gold-700 ring-1 ring-gold-100 transition hover:bg-gold-100"
                      >
                        <Mail className="h-4 w-4" />
                      </a>
                    ) : null}
                    <button
                      onClick={() => remove(l)}
                      title="Remove"
                      className="rounded-lg p-2 text-ink-faint transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-[10px] text-ink-faint">
                    {new Date(l.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    · {l.source}
                  </span>
                </div>
              </div>
              {/* temperature switch */}
              <div className="mt-4 flex gap-1.5 pl-3">
                {(['HOT', 'WARM', 'COLD'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTemperature(l, t)}
                    className={`rounded-lg px-3 py-1.5 text-[10px] font-bold tracking-wide transition ${
                      l.temperature === t ? TONE[t].chip : 'bg-ink/5 text-ink-muted hover:bg-ink/10'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card-luxe flex flex-col items-center gap-2 py-14 text-center">
          <Flame className="h-8 w-8 text-gold-300" />
          <p className="text-sm text-ink-muted">No leads in this view.</p>
        </div>
      )}

      {/* new lead dialog */}
      {newLead ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            role="button"
            tabIndex={0}
            aria-label="Close dialog"
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            onClick={() => setNewLead(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setNewLead(false);
              }
            }}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gold-200">
            <h3 className="heading-display text-lg">Add lead manually</h3>
            <p className="mt-1 text-xs text-ink-muted">
              HOT leads route to the sales team immediately (blueprint Ch.9).
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <input
                className="input-luxe"
                placeholder="Full name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                className="input-luxe"
                placeholder="Phone *"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <input
                className="input-luxe"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                className="input-luxe"
                placeholder="Interest (e.g. Kilimani 3BR)"
                value={form.interest}
                onChange={(e) => setForm({ ...form, interest: e.target.value })}
              />
              <input
                className="input-luxe"
                placeholder="Budget (e.g. KES 10M–15M)"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
              />
              <button onClick={addLead} className="btn-gold w-full !py-2.5">
                Add lead
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
