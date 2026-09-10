'use client';
/** Compare — side-by-side comparison of up to four properties. */
import { CheckCircle2, Minus, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAllProperties, findProperty } from '@/lib/inventory';
import { investmentScore } from '@/lib/investmentScore';
import { trustScore } from '@/lib/trustScore';
import { useCompare } from '@/components/property/CompareBar';
import { isRentalPrice } from '@/lib/finance';
import { formatKES } from '@/lib/format';
import { navigate } from '@/lib/router';

export default function CompareView() {
  const all = useAllProperties();
  const { ids, remove, clear } = useCompare();
  const picked = ids
    .map((id) => findProperty(all, id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  if (picked.length < 2) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="text-5xl" aria-hidden>⚖️</span>
        <h1 className="mt-4 text-xl font-black">Pick at least two properties</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tap &ldquo;Compare&rdquo; on listing cards to load the tray, then open the comparison.
        </p>
        <Button className="mt-5 font-bold" onClick={() => navigate('/properties')}>Browse properties</Button>
      </div>
    );
  }

  const rows: { label: string; render: (p: NonNullable<(typeof picked)[number]>) => React.ReactNode }[] = [
    { label: 'Price', render: (p) => (p.priceOnApplication ? 'POA' : formatKES(p.price) + (isRentalPrice(p.price) ? '/mo' : '')) },
    { label: 'Area', render: (p) => `${p.area}, ${p.county}` },
    { label: 'Type', render: (p) => <span className="capitalize">{p.type}</span> },
    { label: 'Bedrooms', render: (p) => p.bedrooms ?? '—' },
    { label: 'Size', render: (p) => `${p.sizeSqm.toLocaleString('en-KE')} m²` },
    { label: 'Price / m²', render: (p) => (p.priceOnApplication ? '—' : formatKES(Math.round(p.price / p.sizeSqm))) },
    { label: 'Rent estimate', render: (p) => (p.rentEstimate ? `${formatKES(p.rentEstimate)}/mo` : '—') },
    { label: 'Gross yield (est.)', render: (p) => (p.rentEstimate && p.price ? `${(((p.rentEstimate * 12) / p.price) * 100).toFixed(1)}%` : '—') },
    { label: 'Trust Score', render: (p) => <span className="font-black text-primary">{trustScore(p).composite}</span> },
    { label: 'Investment Score', render: (p) => `${investmentScore(p).overall.toFixed(1)}/10` },
    { label: 'Title check', render: (p) => (p.verification.titleCheck === 'verified' ? <CheckCircle2 className="h-4 w-4 text-primary" aria-label="Verified" /> : <XCircle className="h-4 w-4 text-gold" aria-label="Pending" />) },
    { label: 'Ardhisasa match', render: (p) => (p.verification.ardhisasaMatch ? <CheckCircle2 className="h-4 w-4 text-primary" aria-label="Matched" /> : <Minus className="h-4 w-4 text-muted-foreground" aria-label="No" />) },
    { label: 'Availability', render: (p) => <span className="capitalize">{p.availability}</span> },
  ];

  const best = (fn: (p: NonNullable<(typeof picked)[number]>) => number, dir: 'max' | 'min') => {
    const vals = picked.map(fn);
    return dir === 'max' ? Math.max(...vals) : Math.min(...vals);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Side by side</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{picked.length} properties · best value in each row highlighted</p>
        </div>
        <Button variant="outline" className="font-bold" onClick={clear}>Clear comparison</Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-3xl border bg-card">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b bg-accent/40">
              <th className="w-40 px-4 py-4 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">Attribute</th>
              {picked.map((p) => (
                <th key={p!.id} className="px-4 py-4 text-left align-top">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => navigate(`/properties/${p!.id}`)} className="group flex items-center gap-2.5 text-left">
                      <img src={p!.images[0]} alt="" className="h-12 w-16 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-xs font-bold group-hover:text-primary">{p!.title}</p>
                      </div>
                    </button>
                    <button onClick={() => remove(p!.id)} aria-label={`Remove ${p!.title}`} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive">
                      <XCircle className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isNumRow = ['Price / m²', 'Gross yield (est.)', 'Trust Score', 'Investment Score'].includes(row.label);
              const fn =
                row.label === 'Price / m²' ? (p: NonNullable<(typeof picked)[number]>) => p.price / p.sizeSqm
                : row.label === 'Gross yield (est.)' ? (p: NonNullable<(typeof picked)[number]>) => (p.rentEstimate && p.price ? (p.rentEstimate * 12) / p.price : 0)
                : row.label === 'Trust Score' ? (p: NonNullable<(typeof picked)[number]>) => trustScore(p).composite
                : row.label === 'Investment Score' ? (p: NonNullable<(typeof picked)[number]>) => investmentScore(p).overall
                : null;
              const bestVal = fn ? best(fn, 'max') : null;
              return (
                <tr key={row.label} className="border-b transition-colors last:border-0 hover:bg-accent/30">
                  <td className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-muted-foreground">{row.label}</td>
                  {picked.map((p) => (
                    <td key={p!.id} className="px-4 py-3">
                      {isNumRow && bestVal !== null && fn && Math.abs(fn(p!) - bestVal) < 1e-9 && picked.length > 1 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-1 font-black text-primary">
                          <Badge className="border-0 bg-primary px-1.5 text-[8px]">BEST</Badge>
                          {row.render(p!)}
                        </span>
                      ) : (
                        row.render(p!)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Yields and per-m² figures are ESTIMATE-grade — see each property&rsquo;s passport for labelled evidence.
      </p>
    </div>
  );
}
