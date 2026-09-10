'use client';
/** Pro workspace — for agents & professionals: comparables (CMA), listing generation, viewings. */
import { useMemo, useState } from 'react';
import { BadgeCheck, CalendarClock, FileBarChart, Home, Sparkles, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAllProperties } from '@/lib/inventory';
import { useProStore } from '@/lib/proStore';
import { formatKES } from '@/lib/format';
import { navigate } from '@/lib/router';
import { cn } from '@/lib/utils';

export default function ProWorkspaceView() {
  const all = useAllProperties();
  const [pro, setPro] = useProStore();
  const [area, setArea] = useState('Kilimani');
  const [type, setType] = useState('apartment');

  const areas = useMemo(() => [...new Set(all.map((p) => p.area))].sort(), [all]);
  const comps = useMemo(
    () =>
      all.filter((p) => p.area === area && p.type === type && !p.priceOnApplication).sort((a, b) => b.trustScore - a.trustScore),
    [all, area, type],
  );
  const prices = comps.map((c) => c.price);
  const median = prices.length ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : 0;
  const low = prices.length ? prices[0] : 0;
  const high = prices.length ? prices[prices.length - 1] : 0;

  const runCma = () => {
    setPro((prev) => ({
      ...prev,
      cmas: [
        {
          id: `cma-${Date.now()}`,
          createdAt: new Date().toISOString(),
          subjectArea: area,
          subjectType: type as 'apartment' | 'villa' | 'townhouse' | 'bungalow' | 'land' | 'commercial',
          compIds: comps.slice(0, 6).map((c) => c.id),
          lowKes: low,
          medianKes: median,
          highKes: high,
          label: `${area} ${type} CMA`,
        },
        ...prev.cmas,
      ].slice(0, 10),
    }));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="max-w-2xl">
        <Badge variant="outline" className="border-primary/40 font-bold text-primary">Keja Pro · Agent & Professional Workspace</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">The professional&rsquo;s desk</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Comparables that carry the Trust Score, listing tools that inherit verification, and a
          viewings calendar — the workspace for agents and property professionals on the platform.
        </p>
      </div>

      <Tabs defaultValue="cma" className="mt-8">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="cma" className="gap-1.5 font-bold"><FileBarChart className="h-4 w-4" aria-hidden /> Comparables (CMA)</TabsTrigger>
          <TabsTrigger value="listings" className="gap-1.5 font-bold"><Home className="h-4 w-4" aria-hidden /> Listing tools</TabsTrigger>
          <TabsTrigger value="viewings" className="gap-1.5 font-bold"><CalendarClock className="h-4 w-4" aria-hidden /> Viewings</TabsTrigger>
        </TabsList>

        <TabsContent value="cma" className="mt-6">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="cma-area" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Area</label>
              <select id="cma-area" className="mt-1 h-9 rounded-lg border bg-background px-3 text-sm" value={area} onChange={(e) => setArea(e.target.value)}>
                {areas.map((a) => (<option key={a}>{a}</option>))}
              </select>
            </div>
            <div>
              <label htmlFor="cma-type" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Type</label>
              <select id="cma-type" className="mt-1 h-9 rounded-lg border bg-background px-3 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                {['apartment', 'villa', 'townhouse', 'bungalow', 'land', 'commercial'].map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
            <Button className="font-bold" onClick={runCma} disabled={comps.length < 2}>
              <FileBarChart className="mr-1.5 h-4 w-4" aria-hidden /> Run CMA ({comps.length} comps)
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              ['Low', low], ['Median', median], ['High', high],
            ].map(([k, v]) => (
              <div key={k as string} className="card-lift rounded-2xl border bg-card p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{k}</p>
                <p className="mt-2 text-lg font-black tabular-nums">{formatKES(v as number)}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-accent/40 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">Comparable</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">KES/m²</th>
                  <th className="px-4 py-3 text-right">Trust</th>
                </tr>
              </thead>
              <tbody>
                {comps.slice(0, 10).map((c) => (
                  <tr key={c.id} className="cursor-pointer border-b last:border-0 hover:bg-accent/30" onClick={() => navigate(`/properties/${c.id}`)}>
                    <td className="px-5 py-3.5 font-bold">{c.title.slice(0, 36)}</td>
                    <td className="px-4 py-3.5 capitalize text-muted-foreground">{c.type}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{formatKES(c.price)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{formatKES(Math.round(c.price / c.sizeSqm))}</td>
                    <td className="px-4 py-3.5 text-right font-black tabular-nums text-primary">{c.trustScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pro.cmas.length > 0 && (
            <div className="mt-5">
              <h2 className="text-sm font-black uppercase tracking-wider">Recent CMAs</h2>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {pro.cmas.slice(0, 4).map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-xs">
                    <div>
                      <p className="font-bold">{c.label}</p>
                      <p className="text-muted-foreground">{new Date(c.createdAt).toLocaleDateString('en-KE')} · {c.compIds.length} comps</p>
                    </div>
                    <p className="font-black tabular-nums">{formatKES(c.medianKes)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="listings" className="mt-6">
          <div className="rounded-3xl border bg-card p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
              <Sparkles className="h-4 w-4 text-gold" aria-hidden /> Listing generator
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Generate a verified listing draft from any CMA: the generator pulls area band data,
              comparable pricing and trust signals into a structured draft your agency reviews
              before publishing.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button className="font-bold" onClick={() => navigate('/sell')}>Open the listing wizard</Button>
              <Button variant="outline" className="font-bold" onClick={runCma} disabled={comps.length < 2}>Refresh comparables first</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="viewings" className="mt-6">
          <div className="rounded-3xl border border-dashed bg-card/60 p-8 text-center">
            <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground/40" aria-hidden />
            <h2 className="mt-3 text-sm font-bold">Viewings calendar</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              The live product syncs viewing slots with the diaspora timezone converter and sends
              WhatsApp confirmations to both sides. Trial build stores viewing notes in the pro store.
            </p>
            <Button variant="outline" className="mt-4 font-bold" onClick={() => navigate('/diaspora')}>See the timezone engine</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
